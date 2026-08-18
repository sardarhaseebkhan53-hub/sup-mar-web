import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema<any>({
  productId: String,
  name: { type: String, required: true },
  quantity: { type: Number, min: 1, default: 1 },
  unitAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });
const schema = new mongoose.Schema<any>({
  reference: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['LISTING_FEE', 'PROMOTION', 'PACKAGE'], required: true, index: true },
  items: { type: [itemSchema], required: true },
  subtotal: { type: mongoose.Schema.Types.Decimal128, required: true },
  discount: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  tax: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  platformFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  processingFee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  total: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', index: true },
  status: { type: String, enum: ['Created', 'Pending', 'Processing', 'Paid', 'Failed', 'Cancelled', 'Refunded'], default: 'Created', index: true },
}, { timestamps: true });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export const MarketplaceOrder: mongoose.Model<any> = (mongoose.models.MarketplaceOrder as mongoose.Model<any>) || mongoose.model<any>('MarketplaceOrder', schema);
