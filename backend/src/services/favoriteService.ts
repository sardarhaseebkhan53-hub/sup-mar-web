import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { AppError } from '../utils/AppError.js';
import { findListingByPublicKey, presentPublicListing } from './listingService.js';
import { getPublicSellerByUserId } from './publicSellerService.js';

type MemoryFavorite = { id: string; userId: string; listingId: string; createdAt: Date; priceAlertEnabled: boolean; lastKnownPrice: number | null; lastAlertedPrice: number | null };
const memory = new Map<string, MemoryFavorite>();
const key = (userId: string, listingId: string) => `${userId}:${listingId}`;
const connected = () => mongoose.connection.readyState === 1;

export function resetFavoriteMemory() { memory.clear(); }

function listingPrice(listing: any) {
  return Number(listing?.price?.toString?.() ?? listing?.price ?? 0);
}

async function presentFavorite(listing: any, favorite: { createdAt: Date; priceAlertEnabled?: boolean }) {
  const publicListing = presentPublicListing(listing);
  const seller = listing.sellerId ? await getPublicSellerByUserId(String(listing.sellerId)).catch(() => null) : null;
  const unavailable = !['published'].includes(listing.status);
  return {
    ...publicListing,
    savedAt: favorite.createdAt,
    priceAlertEnabled: Boolean(favorite.priceAlertEnabled),
    unavailable,
    availabilityLabel: unavailable ? 'Listing unavailable' : 'Available',
    sellerName: seller?.displayName || null,
    sellerUsername: seller?.username || null,
  };
}

export async function favoriteStatus(userId: string, listingKey: string) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  if (connected()) {
    const row: any = await Favorite.findOne({ userId, listingPublicId: listing.publicId }).lean();
    return { saved: Boolean(row), priceAlertEnabled: Boolean(row?.priceAlertEnabled), favoriteCount: listing.favoriteCount || 0 };
  }
  const item = memory.get(key(userId, listing.publicId));
  return { saved: Boolean(item), priceAlertEnabled: Boolean(item?.priceAlertEnabled), favoriteCount: listing.favoriteCount || 0 };
}

export async function addFavorite(userId: string, listingKey: string, input: { priceAlertEnabled?: boolean } = {}) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing || !['published', 'sold'].includes(listing.status)) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  if (String(listing.sellerId || '') === userId) throw new AppError(409, 'You cannot save your own listing', 'OWN_LISTING_FAVORITE');
  const price = listingPrice(listing);
  if (connected()) {
    try {
      await Favorite.create({ userId, listingId: listing._id, listingPublicId: listing.publicId, priceAlertEnabled: Boolean(input.priceAlertEnabled), lastKnownPrice: price });
      await Listing.updateOne({ _id: listing._id }, { $inc: { favoriteCount: 1 } });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      if (input.priceAlertEnabled !== undefined) await Favorite.updateOne({ userId, listingPublicId: listing.publicId }, { $set: { priceAlertEnabled: Boolean(input.priceAlertEnabled) } });
    }
  } else if (!memory.has(key(userId, listing.publicId))) {
    memory.set(key(userId, listing.publicId), { id: crypto.randomUUID(), userId, listingId: listing.publicId, createdAt: new Date(), priceAlertEnabled: Boolean(input.priceAlertEnabled), lastKnownPrice: price, lastAlertedPrice: null });
  } else if (input.priceAlertEnabled !== undefined) {
    const current = memory.get(key(userId, listing.publicId))!;
    current.priceAlertEnabled = Boolean(input.priceAlertEnabled);
    memory.set(key(userId, listing.publicId), current);
  }
  const { recordPromotionEvent } = await import('./promotionAnalyticsService.js');
  await recordPromotionEvent(listing.publicId, 'favorite_added', `user:${userId}`, 'favorite').catch(() => undefined);
  return { saved: true, priceAlertEnabled: Boolean((await favoriteStatus(userId, listing.publicId)).priceAlertEnabled) };
}

export async function removeFavorite(userId: string, listingKey: string) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  if (connected()) {
    const removed = await Favorite.findOneAndDelete({ userId, listingPublicId: listing.publicId });
    if (removed && listing._id) await Listing.updateOne({ _id: listing._id, favoriteCount: { $gt: 0 } }, { $inc: { favoriteCount: -1 } });
  } else memory.delete(key(userId, listing.publicId));
  return { saved: false };
}

export async function setFavoritePriceAlert(userId: string, listingKey: string, enabled: boolean) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  if (connected()) {
    const updated = await Favorite.findOneAndUpdate({ userId, listingPublicId: listing.publicId }, { $set: { priceAlertEnabled: enabled, lastKnownPrice: listingPrice(listing) } }, { new: true });
    if (!updated) throw new AppError(404, 'Favorite not found', 'FAVORITE_NOT_FOUND');
  } else {
    const item = memory.get(key(userId, listing.publicId));
    if (!item) throw new AppError(404, 'Favorite not found', 'FAVORITE_NOT_FOUND');
    item.priceAlertEnabled = enabled;
    item.lastKnownPrice = listingPrice(listing);
    memory.set(key(userId, listing.publicId), item);
  }
  return { saved: true, priceAlertEnabled: enabled };
}

export async function listFavorites(userId: string, page = 1, limit = 24) {
  let rows: Array<{ listingKey: string; createdAt: Date; priceAlertEnabled: boolean }>;
  if (connected()) {
    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 }).lean();
    rows = favorites.map((favorite: any) => ({ listingKey: favorite.listingPublicId, createdAt: favorite.createdAt, priceAlertEnabled: Boolean(favorite.priceAlertEnabled) }));
  } else {
    rows = [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.createdAt - +a.createdAt).map((item) => ({ listingKey: item.listingId, createdAt: item.createdAt, priceAlertEnabled: item.priceAlertEnabled }));
  }
  const total = rows.length;
  const slice = rows.slice((page - 1) * limit, page * limit);
  const listings = (await Promise.all(slice.map(async (row) => {
    const listing = await findListingByPublicKey(row.listingKey);
    return listing ? presentFavorite(listing, row) : null;
  }))).filter(Boolean);
  return { listings, total, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function bulkRemoveFavorites(userId: string, listingIds: string[]) {
  const unique = [...new Set(listingIds.map((id) => String(id || '').toUpperCase()).filter(Boolean))].slice(0, 50);
  for (const id of unique) await removeFavorite(userId, id).catch(() => undefined);
  return { removed: unique.length };
}

export async function mergeGuestFavorites(userId: string, listingIds: string[]) {
  const unique = [...new Set(listingIds.map((id) => String(id || '').toUpperCase()).filter(Boolean))].slice(0, 40);
  let merged = 0;
  for (const id of unique) {
    try {
      const before = await favoriteStatus(userId, id);
      await addFavorite(userId, id);
      if (!before.saved) merged += 1;
    } catch { /* skip invalid or own listings */ }
  }
  return { merged, total: (await listFavorites(userId, 1, 1)).total };
}

export async function favoritesForListing(listingPublicId: string) {
  if (connected()) return Favorite.find({ listingPublicId: listingPublicId.toUpperCase(), priceAlertEnabled: true }).lean();
  return [...memory.values()].filter((item) => item.listingId === listingPublicId.toUpperCase() && item.priceAlertEnabled);
}

export async function markFavoritePrice(userId: string, listingPublicId: string, price: number) {
  if (connected()) {
    await Favorite.updateOne({ userId, listingPublicId: listingPublicId.toUpperCase() }, { $set: { lastKnownPrice: price, lastAlertedPrice: price } });
    return;
  }
  const item = memory.get(key(userId, listingPublicId.toUpperCase()));
  if (item) { item.lastKnownPrice = price; item.lastAlertedPrice = price; memory.set(key(userId, listingPublicId.toUpperCase()), item); }
}

export async function listFavoriteRecords(listingPublicId: string) {
  if (connected()) return Favorite.find({ listingPublicId: listingPublicId.toUpperCase() }).lean();
  return [...memory.values()].filter((item) => item.listingId === listingPublicId.toUpperCase());
}
