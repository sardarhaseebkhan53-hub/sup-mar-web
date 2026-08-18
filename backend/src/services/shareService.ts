// @ts-nocheck
import mongoose from 'mongoose';
import { Listing } from '../models/Listing.js';
import { ListingShare } from '../models/ListingShare.js';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { AppError } from '../utils/AppError.js';
import { sha256 } from '../utils/security.js';

function isConnected() { return mongoose.connection.readyState === 1; }
function getMeta(req: any) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
  return { ipHash: sha256(String(ip)), userAgent: (req?.get?.('user-agent') || '').slice(0, 300) };
}

export async function trackShare(input: { listingId: string; userId?: string | null; method?: string; referralCode?: string | null }, req?: any) {
  const listing = isConnected() ? await Listing.findById(input.listingId).lean() : { _id: input.listingId, status: 'published' };
  if (!listing) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  // Validate visibility
  if (['removed','expired','rejected'].includes((listing as any).status)) throw new AppError(404, 'Listing is not available for sharing', 'LISTING_NOT_SHAREABLE');
  // Privacy: if listing moderation indicates removed/suspended, block? For now allow published only
  if ((listing as any).moderationState === 'Removed' || (listing as any).moderationState === 'Suspended') throw new AppError(403, 'Listing cannot be shared', 'LISTING_RESTRICTED');

  const { ipHash, userAgent } = getMeta(req);

  if (isConnected()) {
    const share = await ListingShare.create({
      listingId: input.listingId,
      userId: input.userId || null,
      shareMethod: input.method || 'copy',
      referralCode: input.referralCode || null,
      ipHash,
      userAgent,
    });
    await MarketingEvent.create({
      type: 'share',
      userId: input.userId || null,
      listingId: input.listingId,
      source: 'listing_share',
      medium: input.method || 'copy',
      ipHash,
      userAgent,
      metadata: { referralCode: input.referralCode || null },
    });
    return share.toObject();
  }
  return { _id: 'mem', listingId: input.listingId, userId: input.userId, shareMethod: input.method || 'copy', createdAt: new Date() };
}

export async function getSharesForListing(listingId: string) {
  if (!isConnected()) return { shares: 0, byMethod: [] };
  const total = await ListingShare.countDocuments({ listingId });
  const byMethod = await ListingShare.aggregate([{ $match: { listingId: new mongoose.Types.ObjectId(listingId) } }, { $group: { _id: '$shareMethod', count: { $sum: 1 } } }]);
  return { shares: total, byMethod: byMethod.map((r:any)=>({ method: r._id, count: r.count })) };
}

export async function getSharesForSeller(sellerId: string) {
  if (!isConnected()) return { totalShares: 0, listings: [] };
  const listings = await Listing.find({ sellerId }).select('_id title publicId').lean();
  const ids = listings.map((l:any)=>l._id);
  const shares = await ListingShare.aggregate([{ $match: { listingId: { $in: ids } } }, { $group: { _id: '$listingId', count: { $sum: 1 } } }]);
  const map = new Map(shares.map((s:any)=>[String(s._id), s.count]));
  return {
    totalShares: shares.reduce((sum:number,s:any)=>sum+s.count,0),
    listings: listings.map((l:any)=>({ listingId: String(l._id), publicId: l.publicId, title: l.title, shares: map.get(String(l._id)) || 0 })),
  };
}
