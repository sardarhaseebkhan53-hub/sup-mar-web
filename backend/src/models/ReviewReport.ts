import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true, index: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, enum: ['spam', 'fake', 'harassment', 'offensive', 'personal-information', 'other'], required: true },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'investigating', 'reviewed', 'resolved', 'rejected', 'escalated'], default: 'pending', index: true },
}, { timestamps: true });

schema.index({ reviewId: 1, reporterId: 1, status: 1 });
schema.index({ reporterId: 1, createdAt: -1 });

export const ReviewReport: mongoose.Model<any> = (mongoose.models.ReviewReport as mongoose.Model<any>) || mongoose.model<any>('ReviewReport', schema);
