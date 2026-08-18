import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true, unique: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });

export const ReviewResponse: mongoose.Model<any> = (mongoose.models.ReviewResponse as mongoose.Model<any>) || mongoose.model<any>('ReviewResponse', schema);
