import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { createSystemNotification } from './messagingService.js';
import { getOwnedListing } from './listingService.js';

/** Inventory (Phase 17 §10–14): SKU + stock for business sellers, simple inventory for individuals. */

const memoryStock = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

export type StockStatus = 'not_tracked' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function stockStatusOf(listing: any): StockStatus {
  const stock = listing?.stock || {};
  if (!stock.tracked) return 'not_tracked';
  const quantity = Number(stock.quantity ?? 0);
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= Number(stock.lowStockThreshold ?? 0)) return 'low_stock';
  return 'in_stock';
}

function inventoryRow(listing: any) {
  const status = stockStatusOf(listing);
  return {
    publicId: listing.publicId,
    slug: listing.slug,
    title: listing.title,
    sku: listing.sku || '',
    categorySlug: listing.categorySlug || '',
    price: Number(listing.price?.toString?.() ?? listing.price ?? 0),
    currency: listing.currency || 'PKR',
    listingStatus: listing.status,
    availability: listing.availability,
    stock: {
      tracked: Boolean(listing.stock?.tracked),
      quantity: Number(listing.stock?.quantity ?? 1),
      lowStockThreshold: Number(listing.stock?.lowStockThreshold ?? 2),
      stayVisibleWhenOutOfStock: listing.stock?.stayVisibleWhenOutOfStock !== false,
    },
    stockStatus: status,
    stockLabel: STOCK_LABELS[status],
    viewCount: listing.viewCount || 0,
    updatedAt: listing.updatedAt || listing.createdAt,
  };
}

export const STOCK_LABELS: Record<StockStatus, string> = {
  not_tracked: 'Simple listing',
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
};

export async function listInventory(sellerId: string, input: { q?: string; stockStatus?: string; listingStatus?: string; page: number; limit: number }) {
  const query: any = { sellerId, status: { $ne: 'removed' } };
  if (input.listingStatus) query.status = input.listingStatus;
  let rows: any[];
  if (connected()) {
    rows = await Listing.find(query).sort({ updatedAt: -1 }).limit(500).select('-moderation -reportCount').lean();
  } else {
    const { listMemoryListingsForSeller } = await import('./listingService.js');
    rows = listMemoryListingsForSeller(sellerId).filter((item: any) => item.status !== 'removed' && (!input.listingStatus || item.status === input.listingStatus));
  }
  let mapped = rows.map(inventoryRow);
  if (input.q) mapped = mapped.filter((row) => `${row.title} ${row.sku} ${row.publicId}`.toLowerCase().includes(input.q!.toLowerCase()));
  if (input.stockStatus && input.stockStatus !== 'all') mapped = mapped.filter((row) => row.stockStatus === input.stockStatus);
  const summary = {
    total: mapped.length,
    tracked: mapped.filter((row) => row.stock.tracked).length,
    lowStock: mapped.filter((row) => row.stockStatus === 'low_stock').length,
    outOfStock: mapped.filter((row) => row.stockStatus === 'out_of_stock').length,
  };
  const start = (input.page - 1) * input.limit;
  return { inventory: mapped.slice(start, start + input.limit), pagination: { page: input.page, limit: input.limit, total: mapped.length, totalPages: Math.max(1, Math.ceil(mapped.length / input.limit)) }, summary, modes: await inventoryModes(sellerId) };
}

export async function inventoryModes(sellerId: string) {
  const profile = await getSellerProfileRepository().findByUserId(sellerId).catch(() => null);
  const accountType = profile?.accountType || 'individual';
  return {
    accountType,
    quantityTracking: accountType === 'business',
    note: accountType === 'business' ? 'Business inventory with optional quantity tracking.' : 'Simple listing inventory. Quantity tracking is available after switching to a business account.',
  };
}

export async function updateInventory(sellerId: string, listingKey: string, patch: { sku?: string; stock?: { tracked?: boolean; quantity?: number; lowStockThreshold?: number; stayVisibleWhenOutOfStock?: boolean } }) {
  const owned = await getOwnedListing(sellerId, listingKey);
  const profile = await getSellerProfileRepository().findByUserId(sellerId).catch(() => null);
  const isBusiness = (profile?.accountType || 'individual') === 'business';

  const stock = { ...(owned.stock || { tracked: false, quantity: 1, lowStockThreshold: 2, stayVisibleWhenOutOfStock: true }) };
  if (patch.stock) {
    if (patch.stock.tracked && !isBusiness) throw new AppError(403, 'Quantity tracking is a business-account feature', 'BUSINESS_FEATURE_REQUIRED');
    if (patch.stock.tracked !== undefined) stock.tracked = Boolean(patch.stock.tracked);
    if (patch.stock.quantity !== undefined) stock.quantity = Math.max(0, Math.min(1_000_000, Math.round(Number(patch.stock.quantity))));
    if (patch.stock.lowStockThreshold !== undefined) stock.lowStockThreshold = Math.max(0, Math.min(100_000, Math.round(Number(patch.stock.lowStockThreshold))));
    if (patch.stock.stayVisibleWhenOutOfStock !== undefined) stock.stayVisibleWhenOutOfStock = Boolean(patch.stock.stayVisibleWhenOutOfStock);
  }
  const next: any = { stock, ...(patch.sku !== undefined && { sku: patch.sku.trim().toUpperCase().slice(0, 40) }), updatedAt: new Date() };

  // Availability mirrors stock truthfully: out-of-stock listings become unavailable unless the
  // seller explicitly chooses to keep them visible (they display "Out of stock").
  const wasStatus = stockStatusOf(owned);
  if (stock.tracked) {
    next.availability = stock.quantity <= 0 ? (stock.stayVisibleWhenOutOfStock ? 'available' : 'unavailable') : 'available';
  }

  let saved: any;
  if (connected()) {
    saved = await Listing.findOneAndUpdate({ publicId: owned.publicId, sellerId }, { $set: next }, { new: true }).lean();
  } else {
    const { getMemoryListing, setMemoryListing } = await import('./listingService.js');
    const record = getMemoryListing(owned.publicId);
    if (!record) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
    Object.assign(record, next);
    setMemoryListing(record.publicId, record);
    saved = record;
  }
  memoryStock.set(owned.publicId, saved.stock);

  const nextStatus = stockStatusOf(saved);
  if (nextStatus === 'low_stock' && wasStatus !== 'low_stock') {
    await createSystemNotification(sellerId, { type: 'seller_update', title: 'Low inventory', body: `"${saved.title}" is down to ${stock.quantity} unit${stock.quantity === 1 ? '' : 's'} (threshold ${stock.lowStockThreshold}).`, relatedId: saved.publicId, relatedType: 'listing' }).catch(() => undefined);
  }
  return inventoryRow(saved);
}

/**
 * Duplicate (§14): copies seller-facing content ONLY — title, category, attributes,
 * description, media, price, location. Views, favorites, reports, moderation, payments,
 * and analytics history start clean, and the duplicate is an unpublished draft.
 */
export async function duplicateListing(sellerId: string, actorId: string, listingKey: string) {
  const owned = await getOwnedListing(sellerId, listingKey);
  const { createListing } = await import('./listingService.js');
  const duplicate = await createListing(actorId, {
    categorySlug: owned.categorySlug || undefined,
    subcategorySlug: owned.subcategorySlug || null,
    title: `${String(owned.title || 'Listing').slice(0, 90)} (copy)`,
    description: String(owned.description || ''),
    price: Number(owned.price?.toString?.() ?? owned.price ?? 0),
    currency: 'PKR',
    negotiable: Boolean(owned.negotiable),
    condition: owned.condition,
    attributes: owned.attributes instanceof Map ? Object.fromEntries(owned.attributes) : (owned.attributes || {}),
    media: (owned.media || []).map((item: any, index: number) => ({ url: item.url, key: `${item.key}-copy-${Date.now()}-${index}`, alt: item.alt || '', order: index, isCover: item.isCover || index === 0 })),
    location: owned.location ? { country: owned.location.country || 'PK', province: owned.location.province || '', city: owned.location.city, area: owned.location.area } : undefined,
  } as any);
  return { listing: duplicate, note: 'Draft copy created. Review it and publish when you are ready — nothing was copied from analytics, favorites, reports, or payment history.' };
}

export function __resetInventoryMemory() {
  memoryStock.clear();
}
