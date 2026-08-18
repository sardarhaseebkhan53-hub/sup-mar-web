import mongoose from 'mongoose';

const redemptionSchema = new mongoose.Schema<any>({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceOrder', default: null },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  originalAmount: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, required: true, min: 0 },
  finalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'PKR' },
  status: { type: String, enum: ['applied', 'redeemed', 'failed', 'reversed'], default: 'redeemed', index: true },
  ipHash: { type: String, default: null },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  redeemedAt: { type: Date, default: () => new Date() },
  reversedAt: { type: Date, default: null },
  reversalReason: { type: String, default: '' },
}, { timestamps: true });

redemptionSchema.index({ couponId: 1, userId: 1, createdAt: -1 });
redemptionSchema.index({ userId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ code: 1, userId: 1 });
redemptionSchema.index({ createdAt: -1 });

export const CouponRedemption: mongoose.Model<any> = (mongoose.models.CouponRedemption as mongoose.Model<any>) || mongoose.model<any>('CouponRedemption', redemptionSchema);
