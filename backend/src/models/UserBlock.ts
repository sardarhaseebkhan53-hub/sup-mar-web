import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export const UserBlock: mongoose.Model<any> = (mongoose.models.UserBlock as mongoose.Model<any>) || mongoose.model<any>('UserBlock', schema);
