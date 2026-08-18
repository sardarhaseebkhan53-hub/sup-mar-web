import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  targetType: { type: String, enum: ['seller', 'user', 'advertisement'], required: true, index: true },
  targetId: { type: String, required: true, index: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, enum: ['scam', 'harassment', 'spam', 'fake-identity', 'suspicious', 'other'], required: true },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'investigating', 'reviewed', 'resolved', 'rejected', 'escalated'], default: 'pending', index: true },
}, { timestamps: true });

schema.index({ targetId: 1, targetType: 1, reporterId: 1, status: 1 });
schema.index({ reporterId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export const UserReport: mongoose.Model<any> = (mongoose.models.UserReport as mongoose.Model<any>) || mongoose.model<any>('UserReport', schema);
