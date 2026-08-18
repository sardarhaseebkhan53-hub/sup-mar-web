import mongoose from 'mongoose';
import { SellerListingQuota } from '../models/SellerListingQuota.js';
import { AppError } from '../utils/AppError.js';
import { getMarketplaceSettings } from './marketplaceSettingsService.js';

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;
const initial = (userId: string) => ({ userId, freeListingsUsed: 0, paidListingsUsed: 0, totalListings: 0, currentPeriod: 'lifetime', updatedAt: new Date() });

export async function getSellerQuota(userId: string) {
  const settings = await getMarketplaceSettings();
  let row: any;
  if (connected()) row = await SellerListingQuota.findOneAndUpdate({ userId }, { $setOnInsert: initial(userId) }, { upsert: true, new: true }).lean();
  else { row = memory.get(userId) || initial(userId); memory.set(userId, row); }
  return {
    userId,
    freeListingsUsed: row.freeListingsUsed || 0,
    paidListingsUsed: row.paidListingsUsed || 0,
    totalListings: row.totalListings || 0,
    currentPeriod: row.currentPeriod || 'lifetime',
    freeListingAllowance: settings.freeListingLimit,
    freeListingsRemaining: Math.max(0, settings.freeListingLimit - (row.freeListingsUsed || 0)),
    additionalListingPrice: settings.additionalListingFee,
    currency: settings.currency,
    updatedAt: row.updatedAt,
  };
}

export async function consumeFreeAllowance(userId: string) {
  const settings = await getMarketplaceSettings();
  if (settings.freeListingLimit <= 0) throw new AppError(409, 'Your free listing has been used.', 'FREE_LISTING_USED');
  if (connected()) {
    const row: any = await SellerListingQuota.findOneAndUpdate(
      { userId, freeListingsUsed: { $lt: settings.freeListingLimit } },
      { $inc: { freeListingsUsed: 1, totalListings: 1 }, $set: { currentPeriod: 'lifetime' }, $setOnInsert: { userId, paidListingsUsed: 0 } },
      { upsert: false, new: true },
    ).lean();
    if (row) return row;
    const exists = await SellerListingQuota.exists({ userId });
    if (!exists) return (await SellerListingQuota.create({ ...initial(userId), freeListingsUsed: 1, totalListings: 1 })).toObject();
    throw new AppError(409, 'Your free listing has been used.', 'FREE_LISTING_USED');
  }
  const row = memory.get(userId) || initial(userId);
  if (row.freeListingsUsed >= settings.freeListingLimit) throw new AppError(409, 'Your free listing has been used.', 'FREE_LISTING_USED');
  row.freeListingsUsed += 1; row.totalListings += 1; row.updatedAt = new Date(); memory.set(userId, row); return row;
}

export async function recordPaidListing(userId: string) {
  if (connected()) return SellerListingQuota.findOneAndUpdate({ userId }, { $inc: { paidListingsUsed: 1, totalListings: 1 }, $setOnInsert: { userId, freeListingsUsed: 0, currentPeriod: 'lifetime' } }, { upsert: true, new: true });
  const row = memory.get(userId) || initial(userId); row.paidListingsUsed += 1; row.totalListings += 1; row.updatedAt = new Date(); memory.set(userId, row); return row;
}

export function resetQuotaMemory() { memory.clear(); }
