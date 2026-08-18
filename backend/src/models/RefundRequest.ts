import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema<any>({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  note: String,
  at: { type: Date, default: Date.now },
}, { _id: false });
const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  reason: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['Requested', 'Processing', 'Completed', 'Rejected'], default: 'Requested', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  providerRefundId: String,
  audit: { type: [auditSchema], default: [] },
}, { timestamps: true });
schema.index({ paymentId: 1, status: 1 });
schema.index({ userId: 1, createdAt: -1 });

export const RefundRequest: mongoose.Model<any> = (mongoose.models.RefundRequest as mongoose.Model<any>) || mongoose.model<any>('RefundRequest', schema);
