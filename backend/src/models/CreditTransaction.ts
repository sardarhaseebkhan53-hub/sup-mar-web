import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['listing_credit', 'promotion_credit', 'featured_day'], required: true, index: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true, maxlength: 240 },
  referenceId: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, type: 1, referenceId: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });

export const CreditTransaction: mongoose.Model<any> = (mongoose.models.CreditTransaction as mongoose.Model<any>) || mongoose.model<any>('CreditTransaction', schema);
