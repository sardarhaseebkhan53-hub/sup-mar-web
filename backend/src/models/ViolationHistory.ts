import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, maxlength: 100, index: true },
  targetId: { type: String, required: true, maxlength: 120 },
  action: { type: String, required: true, maxlength: 100 },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, createdAt: -1 });

export const ViolationHistory: mongoose.Model<any> = (mongoose.models.ViolationHistory as mongoose.Model<any>) || mongoose.model<any>('ViolationHistory', schema);
