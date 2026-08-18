import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  listingPublicId: { type: String, required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  promotionType: { type: String, enum: ['BOOST', 'FEATURED', 'TOP_SEARCH', 'HOMEPAGE', 'CATEGORY', 'URGENT'], required: true, index: true },
  type: { type: String },
  productKey: { type: String, required: true },
  placement: { type: String, required: true, index: true },
  priority: { type: Number, min: 0, max: 100, default: 10 },
  price: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR' },
  startAt: Date,
  endAt: { type: Date, index: true },
  startsAt: Date,
  expiresAt: { type: Date, index: true },
  status: { type: String, enum: ['Pending', 'Active', 'Expired', 'Cancelled', 'Refunded', 'pending', 'active', 'expired', 'cancelled'], default: 'Pending', index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  durationHours: { type: Number, required: true },
  paidWith: { type: String, enum: ['payment', 'credits'], default: 'payment' },
}, { timestamps: true });
schema.index({ listingId: 1, status: 1, endAt: 1 });
schema.index({ listingPublicId: 1, promotionType: 1, status: 1 });
schema.index({ sellerId: 1, createdAt: -1 });
schema.index({ placement: 1, status: 1, priority: -1, endAt: 1 });

export const Promotion: mongoose.Model<any> = (mongoose.models.Promotion as mongoose.Model<any>) || mongoose.model<any>('Promotion', schema);
