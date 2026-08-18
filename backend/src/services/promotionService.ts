import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { Promotion } from '../models/Promotion.js';
import { AppError } from '../utils/AppError.js';
import { findListingByPublicKey, getOwnedListing, presentPublicListing, setListingPromotion } from './listingService.js';
import { createSystemNotification } from './messagingService.js';

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;
const money = (value: any) => Number(value?.toString?.() ?? value ?? 0);
const canonicalStatus = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
const statusQuery = (status: string) => ({ $in: [canonicalStatus(status), status.toLowerCase()] });

export const presentPromotion = (item: any) => ({
  id: String(item._id || item.id), listingPublicId: item.listingPublicId, sellerId: String(item.sellerId),
  promotionType: item.promotionType || String(item.type || '').toUpperCase(), type: (item.promotionType || item.type || '').toLowerCase(),
  productKey: item.productKey, placement: item.placement, priority: item.priority || 0,
  price: money(item.price), currency: item.currency, startAt: item.startAt || item.startsAt, endAt: item.endAt || item.expiresAt,
  startsAt: item.startAt || item.startsAt, expiresAt: item.endAt || item.expiresAt,
  status: String(item.status || 'Pending').toLowerCase(), paidWith: item.paidWith || 'payment', createdAt: item.createdAt,
});

async function rawById(id: string) {
  if (connected() && mongoose.isValidObjectId(id)) return Promotion.findById(id).lean();
  return memory.get(id) || null;
}

export async function createPendingPromotion(userId: string, listingId: string, product: any, currency: string, paymentId?: any, paidWith: 'payment' | 'credits' = 'payment') {
  const listing: any = await getOwnedListing(userId, listingId);
  if (listing.status !== 'published' || listing.availability === 'unavailable') throw new AppError(409, 'Only eligible published listings can be promoted', 'LISTING_NOT_ELIGIBLE');
  const conflict: any = connected()
    ? await Promotion.findOne({ listingPublicId: listing.publicId, promotionType: product.type, status: { $in: ['Pending', 'Active', 'pending', 'active'] } }).lean()
    : [...memory.values()].find((item) => item.listingPublicId === listing.publicId && item.promotionType === product.type && ['Pending', 'Active'].includes(canonicalStatus(item.status)));
  if (conflict && !product.allowsStacking) throw new AppError(409, 'An identical promotion is already pending or active for this listing', 'PROMOTION_CONFLICT');
  const now = new Date();
  const record: any = {
    id: crypto.randomUUID(), listingId: listing._id || listing.publicId, listingPublicId: listing.publicId, sellerId: userId,
    promotionType: product.type, type: String(product.type).toLowerCase(), productKey: product.key, placement: product.placement,
    priority: product.priority || 0, price: product.price, currency, durationHours: product.durationHours,
    status: 'Pending', paymentId: paymentId || null, paidWith, createdAt: now, updatedAt: now,
  };
  if (connected()) return (await Promotion.create(record)).toObject();
  memory.set(record.id, record); return record;
}

export async function attachPromotionPayment(id: string, paymentId: any) {
  if (connected()) { await Promotion.updateOne({ _id: id }, { $set: { paymentId } }); return; }
  const item = memory.get(id); if (item) { item.paymentId = paymentId; memory.set(id, item); }
}

function labelFor(rows: any[]) {
  const types = rows.map((item) => item.promotionType);
  if (types.includes('URGENT')) return 'Urgent';
  if (types.includes('FEATURED') || types.includes('HOMEPAGE') || types.includes('CATEGORY')) return 'Featured';
  if (types.includes('TOP_SEARCH')) return 'Sponsored';
  return 'Promoted';
}

export async function syncListingPromotions(listingPublicId: string) {
  const now = new Date();
  const rows: any[] = connected()
    ? await Promotion.find({ listingPublicId, status: { $in: ['Active', 'active'] }, $or: [{ endAt: { $gt: now } }, { expiresAt: { $gt: now } }] }).lean()
    : [...memory.values()].filter((item) => item.listingPublicId === listingPublicId && canonicalStatus(item.status) === 'Active' && +(item.endAt || item.expiresAt) > +now);
  if (!rows.length) return setListingPromotion(listingPublicId, false);
  const starts = rows.map((item) => new Date(item.startAt || item.startsAt));
  const ends = rows.map((item) => new Date(item.endAt || item.expiresAt));
  return setListingPromotion(listingPublicId, true, new Date(Math.min(...starts.map(Number))), new Date(Math.max(...ends.map(Number))), {
    types: [...new Set(rows.map((item) => item.promotionType))], placements: [...new Set(rows.map((item) => item.placement))],
    priority: Math.max(...rows.map((item) => item.priority || 0)), label: labelFor(rows),
  });
}

export async function activatePromotion(id: string) {
  const item: any = await rawById(id);
  if (!item) throw new AppError(404, 'Promotion not found', 'PROMOTION_NOT_FOUND');
  if (canonicalStatus(item.status) === 'Active') return presentPromotion(item);
  if (canonicalStatus(item.status) !== 'Pending') throw new AppError(409, 'Promotion cannot be activated', 'PROMOTION_STATUS_INVALID');
  const listing: any = await getOwnedListing(String(item.sellerId), item.listingPublicId);
  if (listing.status !== 'published' || listing.availability === 'unavailable') throw new AppError(409, 'Listing is no longer eligible for promotion', 'LISTING_NOT_ELIGIBLE');
  const startAt = new Date(); const endAt = new Date(startAt.getTime() + item.durationHours * 3_600_000);
  if (!(endAt > startAt)) throw new AppError(422, 'Promotion dates are invalid', 'PROMOTION_DATES_INVALID');
  if (connected()) await Promotion.updateOne({ _id: item._id, status: { $in: ['Pending', 'pending'] } }, { $set: { status: 'Active', startAt, endAt, startsAt: startAt, expiresAt: endAt } });
  else { Object.assign(item, { status: 'Active', startAt, endAt, startsAt: startAt, expiresAt: endAt, updatedAt: new Date() }); memory.set(item.id, item); }
  await syncListingPromotions(item.listingPublicId);
  await createSystemNotification(String(item.sellerId), { type: 'listing', title: 'Promotion activated', body: 'Your paid listing promotion is now active.', relatedId: item.listingPublicId, relatedType: 'listing' });
  return presentPromotion({ ...item, status: 'Active', startAt, endAt });
}

export async function failPendingPromotion(id: string) {
  const item: any = await rawById(id); if (!item || canonicalStatus(item.status) !== 'Pending') return;
  if (connected()) await Promotion.updateOne({ _id: item._id }, { $set: { status: 'Cancelled' } }); else { item.status = 'Cancelled'; memory.set(item.id, item); }
}

export async function expirePromotions() {
  const now = new Date();
  const expired: any[] = connected()
    ? await Promotion.find({ status: { $in: ['Active', 'active'] }, $or: [{ endAt: { $lte: now } }, { expiresAt: { $lte: now } }] }).lean()
    : [...memory.values()].filter((item) => canonicalStatus(item.status) === 'Active' && +(item.endAt || item.expiresAt) <= +now);
  if (connected() && expired.length) await Promotion.updateMany({ _id: { $in: expired.map((item) => item._id) } }, { $set: { status: 'Expired' } });
  for (const item of expired) {
    if (!connected()) { item.status = 'Expired'; memory.set(item.id, item); }
    await syncListingPromotions(item.listingPublicId);
    await createSystemNotification(String(item.sellerId), { type: 'listing', title: 'Promotion expired', body: 'Your listing promotion has ended.', relatedId: item.listingPublicId, relatedType: 'listing' });
  }
}

export async function listSellerPromotions(userId: string) {
  await expirePromotions();
  const rows: any[] = connected() ? await Promotion.find({ sellerId: userId }).sort({ createdAt: -1 }).lean() : [...memory.values()].filter((item) => item.sellerId === userId).sort((a, b) => +b.createdAt - +a.createdAt);
  return rows.map(presentPromotion);
}

export async function listListingPromotions(userId: string, listingId: string) {
  const listing: any = await getOwnedListing(userId, listingId); await expirePromotions();
  const rows: any[] = connected() ? await Promotion.find({ listingPublicId: listing.publicId }).sort({ createdAt: -1 }).lean() : [...memory.values()].filter((item) => item.listingPublicId === listing.publicId);
  return rows.map(presentPromotion);
}

export async function cancelPromotion(userId: string, id: string, adminOverride = false, refunded = false) {
  const item: any = await rawById(id);
  if (!item || (!adminOverride && String(item.sellerId) !== userId)) throw new AppError(404, 'Promotion not found', 'PROMOTION_NOT_FOUND');
  if (!['Pending', 'Active'].includes(canonicalStatus(item.status))) throw new AppError(409, 'Promotion cannot be cancelled', 'PROMOTION_STATUS_INVALID');
  const next = refunded ? 'Refunded' : 'Cancelled';
  if (connected()) await Promotion.updateOne({ _id: item._id }, { $set: { status: next } }); else { item.status = next; memory.set(item.id, item); }
  await syncListingPromotions(item.listingPublicId);
  return presentPromotion({ ...item, status: next });
}

export async function adminListPromotions(input: any) {
  await expirePromotions();
  const dbStatus = input.status ? statusQuery(input.status) : undefined;
  let rows: any[] = connected() ? await Promotion.find({ ...(dbStatus && { status: dbStatus }), ...(input.type && { promotionType: String(input.type).toUpperCase() }) }).sort({ createdAt: -1 }).limit(2000).lean() : [...memory.values()].filter((item) => (!input.status || canonicalStatus(item.status).toLowerCase() === input.status.toLowerCase()) && (!input.type || item.promotionType === String(input.type).toUpperCase()));
  const total = rows.length; const start = (input.page - 1) * input.limit;
  return { promotions: rows.slice(start, start + input.limit).map(presentPromotion), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
}

export async function activePromotionsForListing(listingPublicId: string) {
  await expirePromotions(); const now = new Date();
  return connected() ? Promotion.find({ listingPublicId, status: { $in: ['Active', 'active'] }, $or: [{ endAt: { $gt: now } }, { expiresAt: { $gt: now } }] }).lean() : [...memory.values()].filter((item) => item.listingPublicId === listingPublicId && canonicalStatus(item.status) === 'Active' && +(item.endAt || item.expiresAt) > +now);
}

export async function listPromotionPlacement(placement: string, categorySlug?: string, limit = 12) {
  await expirePromotions(); const now = new Date();
  let promotions: any[] = connected() ? await Promotion.find({ placement, status: { $in: ['Active', 'active'] }, $or: [{ endAt: { $gt: now } }, { expiresAt: { $gt: now } }] }).sort({ priority: -1, startAt: -1 }).limit(limit * 3).lean() : [...memory.values()].filter((item) => item.placement === placement && canonicalStatus(item.status) === 'Active' && +(item.endAt || item.expiresAt) > +now).sort((a, b) => b.priority - a.priority);
  const listings: any[] = [];
  for (const promotion of promotions) {
    let listing: any;
    if (connected()) listing = await Listing.findOne({ publicId: promotion.listingPublicId, status: 'published', availability: 'available', ...(categorySlug && { categorySlug }) }).lean();
    else listing = await findListingByPublicKey(promotion.listingPublicId).catch(() => null);
    if (!listing || listing.status !== 'published' || (categorySlug && listing.categorySlug !== categorySlug)) continue;
    listings.push({ ...presentPublicListing(listing), promotion: { ...presentPublicListing(listing).promotion, id: String(promotion._id || promotion.id), placement, label: placement === 'search' || placement === 'homepage' ? 'Sponsored' : placement === 'urgent' ? 'Urgent' : 'Featured' } });
    if (listings.length >= limit) break;
  }
  return listings;
}

export async function expirePromotionForTest(id: string) {
  const item: any = await rawById(id); if (!item) return;
  if (connected()) await Promotion.updateOne({ _id: item._id }, { $set: { endAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() - 1000) } });
  else { item.endAt = new Date(Date.now() - 1000); item.expiresAt = item.endAt; memory.set(item.id, item); }
  await expirePromotions();
}
