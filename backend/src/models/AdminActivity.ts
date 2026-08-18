import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true, index: true },
  targetId: { type: String, required: true },
  result: { type: String, enum: ['success', 'denied', 'failed'], default: 'success', index: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  request: { ipApproximation: String, device: String },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: -1 });
schema.index({ adminId: 1, createdAt: -1 });
schema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const AdminActivity: mongoose.Model<any> = (mongoose.models.AdminActivity as mongoose.Model<any>) || mongoose.model<any>('AdminActivity', schema);
