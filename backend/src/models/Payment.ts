import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null, index: true },
  listingPublicId: { type: String, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceOrder', index: true },
  type: { type: String, enum: ['listing_fee', 'promotion', 'package', 'other'], required: true, index: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  baseAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
  tax: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  discount: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  platformFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  processingFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  currency: { type: String, default: 'PKR' },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'expired'], default: 'pending', index: true },
  provider: { type: String, required: true },
  providerPaymentId: { type: String, index: true },
  reference: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, required: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  paidAt: Date,
  expiresAt: Date,
}, { timestamps: true });
schema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ listingId: 1, status: 1 });
schema.index({ provider: 1, providerPaymentId: 1 });

export const Payment: mongoose.Model<any> = (mongoose.models.Payment as mongoose.Model<any>) || mongoose.model<any>('Payment', schema);
