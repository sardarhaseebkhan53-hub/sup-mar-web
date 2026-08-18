import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { RecentlyViewed } from '../models/RecentlyViewed.js';
import { findListingByPublicKey, presentPublicListing } from './listingService.js';

const memory = new Map<string, { userId: string; listingId: string; viewedAt: Date }>();
const connected = () => mongoose.connection.readyState === 1;
const limitFor = () => env.discovery.recentlyViewedLimit || 20;
export function resetRecentlyViewedMemory() { memory.clear(); }

export async function rememberListing(userId: string, listingKey: string) {
  const listing: any = await findListingByPublicKey(listingKey);
  if (!listing) return;
  const viewedAt = new Date();
  if (connected()) {
    await RecentlyViewed.findOneAndUpdate(
      { userId, listingPublicId: listing.publicId },
      { $set: { viewedAt, listingId: listing._id || null, listingPublicId: listing.publicId } },
      { upsert: true },
    );
    const stale = await RecentlyViewed.find({ userId }).sort({ viewedAt: -1 }).skip(limitFor()).select('_id').lean();
    if (stale.length) await RecentlyViewed.deleteMany({ _id: { $in: stale.map((item: any) => item._id) } });
    return;
  }
  memory.set(`${userId}:${listing.publicId}`, { userId, listingId: listing.publicId, viewedAt });
  const extras = [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.viewedAt - +a.viewedAt).slice(limitFor());
  extras.forEach((item) => memory.delete(`${item.userId}:${item.listingId}`));
}

export async function listRecentlyViewed(userId: string, limit = 12) {
  const take = Math.min(limit, limitFor());
  if (connected()) {
    const rows = await RecentlyViewed.find({ userId }).sort({ viewedAt: -1 }).limit(take).lean();
    const listings = (await Promise.all(rows.map(async (row: any) => {
      const listing: any = await findListingByPublicKey(row.listingPublicId);
      return listing?.status === 'published' ? { ...presentPublicListing(listing), viewedAt: row.viewedAt } : null;
    }))).filter(Boolean);
    return listings;
  }
  const ids = [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.viewedAt - +a.viewedAt).slice(0, take);
  return (await Promise.all(ids.map(async (item) => {
    const listing: any = await findListingByPublicKey(item.listingId);
    return listing?.status === 'published' ? { ...presentPublicListing(listing), viewedAt: item.viewedAt } : null;
  }))).filter(Boolean);
}

export async function removeRecentlyViewed(userId: string, listingKey?: string) {
  if (listingKey) {
    const listing: any = await findListingByPublicKey(listingKey);
    const publicId = listing?.publicId || listingKey.toUpperCase();
    if (connected()) await RecentlyViewed.deleteOne({ userId, listingPublicId: publicId });
    else memory.delete(`${userId}:${publicId}`);
    return { deleted: true };
  }
  if (connected()) await RecentlyViewed.deleteMany({ userId });
  else for (const [id, item] of memory) if (item.userId === userId) memory.delete(id);
  return { deleted: true };
}
