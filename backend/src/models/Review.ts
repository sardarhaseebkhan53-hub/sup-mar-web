import mongoose from 'mongoose';

export const REVIEW_STATUSES = Object.freeze(['Published', 'Pending', 'Hidden', 'Removed']);

const schema = new mongoose.Schema<any>({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listingId: { type: String, required: true, index: true },
  transactionId: { type: String, default: null },
  conversationId: { type: String, default: null },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, trim: true, maxlength: 120, default: '' },
  comment: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: REVIEW_STATUSES, default: 'Published', index: true },
  helpfulCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

schema.index({ reviewerId: 1, listingId: 1 }, { unique: true });
schema.index({ sellerId: 1, createdAt: -1 });
schema.index({ listingId: 1, createdAt: -1 });

export const Review: mongoose.Model<any> = (mongoose.models.Review as mongoose.Model<any>) || mongoose.model<any>('Review', schema);
