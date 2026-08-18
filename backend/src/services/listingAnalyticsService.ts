import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { ListingView } from '../models/ListingView.js';
import { getPublicListing, incrementMemoryListingView } from './listingService.js';
const memoryViews = new Set<string>();
export async function trackListingView(id: string, fingerprintSource: string) {
  const listing = await getPublicListing(id); const fingerprint = crypto.createHash('sha256').update(fingerprintSource).digest('hex'); const bucket = new Date().toISOString().slice(0, 10); const key = `${id}:${fingerprint}:${bucket}`;
  if (mongoose.connection.readyState !== 1) { const counted = !memoryViews.has(key); if (counted) { memoryViews.add(key); incrementMemoryListingView(id); const { recordPromotionEvent } = await import('./promotionAnalyticsService.js'); await recordPromotionEvent(listing.publicId, 'listing_view', fingerprintSource, 'listing').catch(() => undefined); } return { counted }; }
  try { await ListingView.create({ listingId: listing._id, fingerprint, bucket }); await Listing.updateOne({ _id: listing._id }, { $inc: { viewCount: 1 } }); const { recordPromotionEvent } = await import('./promotionAnalyticsService.js'); await recordPromotionEvent(listing.publicId, 'listing_view', fingerprintSource, 'listing').catch(() => undefined); return { counted: true }; } catch (error: any) { if (error?.code === 11000) return { counted: false }; throw error; }
}
