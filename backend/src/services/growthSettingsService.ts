// @ts-nocheck
import mongoose from 'mongoose';
import { GrowthSettings } from '../models/GrowthSettings.js';

const memoryStore: { doc: any | null } = { doc: null };

const defaultDoc = () => ({
  key: 'global',
  referral: {
    enabled: true,
    rewardType: 'listing_credit',
    rewardAmount: 100,
    rewardCurrency: 'PKR',
    couponTemplate: '',
    eligibility: {
      newAccountOnly: true,
      requireVerifiedEmail: false,
      minimumActivity: false,
      requireFirstListing: false,
      requireFirstTransaction: false,
    },
    expirationDays: 30,
    maxReferralsPerUser: 100,
    fraud: { maxPerDay: 20, flagVolume: 50, enableSuspicion: true },
  },
  coupons: {
    defaultExpiryDays: 30,
    maxGlobalUsage: 10000,
    allowBruteForceProtection: true,
    bruteForceWindowMinutes: 10,
    bruteForceMaxAttempts: 10,
  },
  campaigns: { defaultExpiryDays: 30, autoExpire: true, enableBanners: true },
  rewards: { enabled: true, expirationEnabled: false, defaultExpirationDays: 90, allowNegative: false },
  marketing: { dailyLimit: 3, weeklyLimit: 10, cooldownHours: 24, enableOptOut: true },
  sharing: { trackShares: true, enableRewardsForShares: false },
});

export async function getGrowthSettings() {
  const connected = mongoose.connection.readyState === 1;
  if (connected) {
    let settings = await GrowthSettings.findOne({ key: 'global' }).lean();
    if (!settings) {
      const created = await GrowthSettings.create({ ...defaultDoc() });
      settings = created.toObject();
    }
    return settings;
  }
  if (!memoryStore.doc) memoryStore.doc = { _id: 'memory', ...defaultDoc(), createdAt: new Date(), updatedAt: new Date() };
  return memoryStore.doc;
}

export async function updateGrowthSettings(input: any, updatedBy?: string) {
  const connected = mongoose.connection.readyState === 1;
  if (connected) {
    const existing = await GrowthSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: { ...input, updatedBy: updatedBy || null }, $setOnInsert: { key: 'global' } },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    return existing;
  }
  memoryStore.doc = { ...(memoryStore.doc || defaultDoc()), ...input, updatedAt: new Date() };
  return memoryStore.doc;
}

export function resetGrowthMemory() {
  memoryStore.doc = null;
}
