import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema<any>({
  code: { type: String, required: true, uppercase: true, trim: true, index: true },
  referralCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCode', required: true, index: true },
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'eligible', 'rewarded', 'rejected', 'expired'], default: 'pending', index: true },
  // Attribution
  attributionMethod: { type: String, enum: ['link', 'code', 'manual'], default: 'code' },
  ipHash: { type: String, default: null },
  deviceFingerprint: { type: String, default: null },
  userAgent: { type: String, default: '' },
  referralLink: { type: String, default: '' },

  // Eligibility checks
  eligibility: {
    verifiedEmail: { type: Boolean, default: false },
    minimumActivity: { type: Boolean, default: false },
    firstListing: { type: Boolean, default: false },
    firstTransaction: { type: Boolean, default: false },
    newAccountOnly: { type: Boolean, default: true },
    checkedAt: { type: Date, default: null },
  },

  // Reward
  reward: {
    type: { type: String, enum: ['account_credit', 'listing_credit', 'promotion_credit', 'coupon', 'points'], default: 'account_credit' },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    rewardLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardLedger', default: null },
    issuedAt: { type: Date, default: null },
  },

  // Fraud signals
  fraud: {
    isSuspicious: { type: Boolean, default: false, index: true },
    reasons: { type: [String], default: [] },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    flaggedAt: { type: Date, default: null },
    reviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },

  eligibleAt: { type: Date, default: null },
  rewardedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: true });

referralSchema.index({ code: 1, referredId: 1 }, { unique: true });
referralSchema.index({ referrerId: 1, status: 1, createdAt: -1 });
referralSchema.index({ referredId: 1, status: 1 });
referralSchema.index({ createdAt: -1 });
referralSchema.index({ status: 1, expiresAt: 1 });
referralSchema.index({ 'fraud.isSuspicious': 1, createdAt: -1 });

export const Referral: mongoose.Model<any> = (mongoose.models.Referral as mongoose.Model<any>) || mongoose.model<any>('Referral', referralSchema);
