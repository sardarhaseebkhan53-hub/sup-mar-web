import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  price: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR', uppercase: true },
  listingCredits: { type: Number, min: 0, default: 0 },
  promotionCredits: { type: Number, min: 0, default: 0 },
  promotionDays: { type: Number, min: 0, default: 0 },
  validityDays: { type: Number, min: 1, default: 365 },
  features: { type: [String], default: [] },
  active: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ active: 1, sortOrder: 1 });

export const SellerPackage: mongoose.Model<any> = (mongoose.models.SellerPackage as mongoose.Model<any>) || mongoose.model<any>('SellerPackage', schema);
