import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { PromotionEvent } from '../models/PromotionEvent.js';
import { AppError } from '../utils/AppError.js';
import { findListingByPublicKey, listSellerListings } from './listingService.js';
import { activePromotionsForListing, listSellerPromotions } from './promotionService.js';

export type PromotionEventType = 'listing_impression' | 'listing_click' | 'listing_view' | 'favorite_added' | 'contact_seller';
const memory = new Map<string, any>();
const allowed = new Set<PromotionEventType>(['listing_impression', 'listing_click', 'listing_view', 'favorite_added', 'contact_seller']);
const bucketFor = (type: PromotionEventType) => {
  const size = type === 'listing_impression' ? 60 : type === 'listing_click' ? 15 : 24 * 60;
  return String(Math.floor(Date.now() / (size * 60_000)));
};

export async function recordPromotionEvent(listingKey: string, type: PromotionEventType, source: string, placement = 'organic') {
  if (!allowed.has(type)) throw new AppError(422, 'Analytics event type is invalid', 'EVENT_TYPE_INVALID');
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  const promotions: any[] = await activePromotionsForListing(listing.publicId);
  if (!promotions.length) return { tracked: false };
  const fingerprint = crypto.createHash('sha256').update(source).digest('hex'); const bucket = bucketFor(type);
  let tracked = 0;
  for (const promotion of promotions) {
    const promotionId = String(promotion._id || promotion.id); const key = `${promotionId}:${type}:${fingerprint}:${bucket}`;
    if (mongoose.connection.readyState === 1) {
      try { await PromotionEvent.create({ promotionId: promotion._id, listingId: listing._id, listingPublicId: listing.publicId, sellerId: listing.sellerId, type, fingerprint, bucket, placement }); tracked += 1; }
      catch (error: any) { if (error?.code !== 11000) throw error; }
    } else if (!memory.has(key)) { memory.set(key, { id: crypto.randomUUID(), promotionId, listingId: listing.publicId, listingPublicId: listing.publicId, sellerId: String(listing.sellerId), type, fingerprint, bucket, placement, createdAt: new Date() }); tracked += 1; }
  }
  return { tracked: tracked > 0 };
}

async function eventRowsForSeller(userId: string) {
  return mongoose.connection.readyState === 1 ? PromotionEvent.find({ sellerId: userId }).sort({ createdAt: -1 }).lean() : [...memory.values()].filter((item) => item.sellerId === userId).sort((a, b) => +b.createdAt - +a.createdAt);
}

export async function sellerPromotionAnalytics(userId: string) {
  const [promotions, events] = await Promise.all([listSellerPromotions(userId), eventRowsForSeller(userId)]);
  const metrics = new Map<string, any>();
  for (const promotion of promotions) metrics.set(promotion.id, { ...promotion, impressions: 0, clicks: 0, views: 0, favorites: 0, messages: 0 });
  const field: Record<string, string> = { listing_impression: 'impressions', listing_click: 'clicks', listing_view: 'views', favorite_added: 'favorites', contact_seller: 'messages' };
  for (const event of events) { const row = metrics.get(String(event.promotionId)); if (row) row[field[event.type]] += 1; }
  const rows = [...metrics.values()];
  return {
    summary: rows.reduce((sum, row) => ({ impressions: sum.impressions + row.impressions, clicks: sum.clicks + row.clicks, views: sum.views + row.views, favorites: sum.favorites + row.favorites, messages: sum.messages + row.messages }), { impressions: 0, clicks: 0, views: 0, favorites: 0, messages: 0 }),
    promotions: rows,
  };
}

export async function sellerAnalytics(userId: string) {
  const [listingsResult, promotionPerformance, events] = await Promise.all([listSellerListings(userId, { page: 1, limit: 50, sort: 'most-viewed' }), sellerPromotionAnalytics(userId), eventRowsForSeller(userId)]);
  const listings = listingsResult.listings || [];
  return {
    summary: { views: listings.reduce((sum: number, item: any) => sum + (item.viewCount || 0), 0), favorites: listings.reduce((sum: number, item: any) => sum + (item.favoriteCount || 0), 0), messages: listings.reduce((sum: number, item: any) => sum + (item.messagesCount || 0), 0) },
    promotionPerformance,
    topListings: listings.slice(0, 8).map((item: any) => ({ publicId: item.publicId, title: item.title, views: item.viewCount || 0, favorites: item.favoriteCount || 0, messages: item.messagesCount || 0 })),
    recentActivity: events.slice(0, 20).map((item: any) => ({ id: String(item._id || item.id), type: item.type, listingPublicId: item.listingPublicId, createdAt: item.createdAt })),
  };
}

export function resetPromotionAnalyticsMemory() { memory.clear(); }
