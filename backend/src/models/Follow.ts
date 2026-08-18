import mongoose from 'mongoose';

const followSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

followSchema.index({ userId: 1, sellerId: 1 }, { unique: true });
followSchema.index({ sellerId: 1, createdAt: -1 });
followSchema.index({ userId: 1, createdAt: -1 });

export const Follow: mongoose.Model<any> = (mongoose.models.Follow as mongoose.Model<any>) || mongoose.model<any>('Follow', followSchema);
