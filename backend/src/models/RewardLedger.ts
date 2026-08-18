import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['earn', 'redeem', 'expire', 'reverse', 'bonus', 'referral', 'campaign', 'purchase', 'admin_credit'], required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'PKR' },
  points: { type: Number, default: 0 },
  source: { type: String, enum: ['referral', 'campaign', 'purchase', 'coupon', 'manual', 'system', 'promotion', 'listing'], required: true, index: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  referenceModel: { type: String, enum: ['Referral', 'Campaign', 'Coupon', 'CouponRedemption', 'MarketplaceOrder', 'Payment', 'User', 'Listing', 'RewardLedger'], default: null },
  status: { type: String, enum: ['pending', 'available', 'used', 'expired', 'reversed'], default: 'available', index: true },
  description: { type: String, maxlength: 500, default: '' },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, default: null, index: true },
  reversedAt: { type: Date, default: null },
  reversalReason: { type: String, default: '' },
  originalLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardLedger', default: null },
}, { timestamps: true });

ledgerSchema.index({ userId: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ userId: 1, type: 1, createdAt: -1 });
ledgerSchema.index({ source: 1, status: 1 });
ledgerSchema.index({ status: 1, expiresAt: 1 });
ledgerSchema.index({ userId: 1, createdAt: -1 });

export const RewardLedger: mongoose.Model<any> = (mongoose.models.RewardLedger as mongoose.Model<any>) || mongoose.model<any>('RewardLedger', ledgerSchema);
