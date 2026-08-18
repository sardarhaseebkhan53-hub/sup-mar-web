import mongoose from 'mongoose';

const growthSettingsSchema = new mongoose.Schema<any>({
  key: { type: String, required: true, unique: true, trim: true, default: 'global' },
  referral: {
    enabled: { type: Boolean, default: true },
    rewardType: { type: String, enum: ['account_credit', 'listing_credit', 'promotion_credit', 'coupon', 'points'], default: 'listing_credit' },
    rewardAmount: { type: Number, default: 100, min: 0, max: 100000 },
    rewardCurrency: { type: String, default: 'PKR' },
    couponTemplate: { type: String, default: '' },
    eligibility: {
      newAccountOnly: { type: Boolean, default: true },
      requireVerifiedEmail: { type: Boolean, default: false },
      minimumActivity: { type: Boolean, default: false },
      requireFirstListing: { type: Boolean, default: false },
      requireFirstTransaction: { type: Boolean, default: false },
    },
    expirationDays: { type: Number, default: 30, min: 1, max: 365 },
    maxReferralsPerUser: { type: Number, default: 100, min: 1, max: 10000 },
    fraud: {
      maxPerDay: { type: Number, default: 20, min: 1, max: 1000 },
      flagVolume: { type: Number, default: 50, min: 1 },
      enableSuspicion: { type: Boolean, default: true },
    },
  },
  coupons: {
    defaultExpiryDays: { type: Number, default: 30, min: 1, max: 365 },
    maxGlobalUsage: { type: Number, default: 10000, min: 1 },
    allowBruteForceProtection: { type: Boolean, default: true },
    bruteForceWindowMinutes: { type: Number, default: 10, min: 1, max: 1440 },
    bruteForceMaxAttempts: { type: Number, default: 10, min: 1, max: 100 },
  },
  campaigns: {
    defaultExpiryDays: { type: Number, default: 30, min: 1, max: 365 },
    autoExpire: { type: Boolean, default: true },
    enableBanners: { type: Boolean, default: true },
  },
  rewards: {
    enabled: { type: Boolean, default: true },
    expirationEnabled: { type: Boolean, default: false },
    defaultExpirationDays: { type: Number, default: 90, min: 1, max: 3650 },
    allowNegative: { type: Boolean, default: false },
  },
  marketing: {
    dailyLimit: { type: Number, default: 3, min: 0, max: 20 },
    weeklyLimit: { type: Number, default: 10, min: 0, max: 100 },
    cooldownHours: { type: Number, default: 24, min: 0, max: 720 },
    enableOptOut: { type: Boolean, default: true },
  },
  sharing: {
    trackShares: { type: Boolean, default: true },
    enableRewardsForShares: { type: Boolean, default: false },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const GrowthSettings: mongoose.Model<any> = (mongoose.models.GrowthSettings as mongoose.Model<any>) || mongoose.model<any>('GrowthSettings', growthSettingsSchema);
