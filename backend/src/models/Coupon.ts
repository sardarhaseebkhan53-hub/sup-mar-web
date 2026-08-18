import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema<any>({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed', 'credit'], required: true, index: true },
  value: { type: Number, required: true, min: 0 },
  minimumAmount: { type: Number, default: 0, min: 0 },
  maximumDiscount: { type: Number, default: null, min: 0 },
  startAt: { type: Date, required: true, default: () => new Date(), index: true },
  endAt: { type: Date, required: true, index: true },
  usageLimit: { type: Number, default: null, min: 1 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  usageCount: { type: Number, default: 0, min: 0 },
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],
  applicableListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true }],
  applicableCategorySlugs: [{ type: String, trim: true, lowercase: true }],
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scope: { type: String, enum: ['platform', 'seller', 'campaign'], default: 'platform', index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'expired', 'disabled'], default: 'active', index: true },
  description: { type: String, maxlength: 500, default: '' },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ code: 1, status: 1 });
couponSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
couponSchema.index({ scope: 1, status: 1, endAt: 1 });
couponSchema.index({ startAt: 1, endAt: 1, status: 1 });

export const Coupon: mongoose.Model<any> = (mongoose.models.Coupon as mongoose.Model<any>) || mongoose.model<any>('Coupon', couponSchema);
