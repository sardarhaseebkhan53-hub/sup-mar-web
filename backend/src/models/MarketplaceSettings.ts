import mongoose from 'mongoose';

const promotionProductSchema = new mongoose.Schema<any>({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['BOOST', 'FEATURED', 'TOP_SEARCH', 'HOMEPAGE', 'CATEGORY', 'URGENT'], required: true },
  placement: { type: String, enum: ['boost', 'featured', 'search', 'homepage', 'category', 'urgent'], required: true },
  durationHours: { type: Number, min: 1, required: true },
  price: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR' },
  priority: { type: Number, min: 0, max: 100, default: 10 },
  creditCost: { type: Number, min: 1, default: 1 },
  allowsStacking: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { _id: false });

const schema = new mongoose.Schema<any>({
  key: { type: String, default: 'marketplace', unique: true },
  freeListingLimit: { type: Number, min: 0, default: 1 },
  additionalListingFee: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR' },
  taxRate: { type: Number, min: 0, max: 100, default: 0 },
  discountAmount: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  platformFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  paymentProcessingFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  promotionEnabled: { type: Boolean, default: true },
  minPromotionDurationHours: { type: Number, min: 1, default: 24 },
  maxPromotionDurationHours: { type: Number, min: 1, default: 720 },
  promotionProducts: { type: [promotionProductSchema], default: [] },
}, { timestamps: true });

export const MarketplaceSettings: mongoose.Model<any> = (mongoose.models.MarketplaceSettings as mongoose.Model<any>) || mongoose.model<any>('MarketplaceSettings', schema);
