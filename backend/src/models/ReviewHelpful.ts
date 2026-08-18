import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ reviewId: 1, userId: 1 }, { unique: true });

export const ReviewHelpful: mongoose.Model<any> = (mongoose.models.ReviewHelpful as mongoose.Model<any>) || mongoose.model<any>('ReviewHelpful', schema);
