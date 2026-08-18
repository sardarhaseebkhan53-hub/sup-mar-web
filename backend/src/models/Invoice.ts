import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  invoiceNumber: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceOrder', required: true, unique: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  buyerName: { type: String, default: 'QAVLIO seller' },
  description: { type: String, required: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  currency: { type: String, default: 'PKR' },
  paymentStatus: { type: String, enum: ['Paid', 'Refunded'], default: 'Paid' },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: false });
schema.index({ userId: 1, issuedAt: -1 });

export const Invoice: mongoose.Model<any> = (mongoose.models.Invoice as mongoose.Model<any>) || mongoose.model<any>('Invoice', schema);
