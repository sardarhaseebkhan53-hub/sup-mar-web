import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  type: { type: String, enum: ['chat', 'search', 'search_hit', 'search_empty', 'compare', 'recommend', 'recommend_similar', 'recommend_trending', 'listing_assistant', 'listing_title', 'listing_description', 'listing_attributes', 'listing_category', 'price_insight', 'listing_quality', 'support', 'error'], required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  durationMs: { type: Number, min: 0, default: 0 },
  success: { type: Boolean, default: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ createdAt: -1 });
schema.index({ type: 1, createdAt: -1 });

export const AIEvent: mongoose.Model<any> = (mongoose.models.AIEvent as mongoose.Model<any>) || mongoose.model<any>('AIEvent', schema);
