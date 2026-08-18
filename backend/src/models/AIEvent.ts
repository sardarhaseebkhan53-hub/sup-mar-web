import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>(
  {
    type: { type: String, enum: ['chat', 'search', 'search_hit', 'search_empty', 'compare', 'recommend', 'listing_assistant', 'support', 'error', 'embedding'], required: true, index: true },
    feature: { type: String, enum: ['assistant', 'search', 'recommendations', 'listingAssistant', 'support', 'moderation', 'priceInsights', 'embeddings', 'other'], default: 'other', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    durationMs: { type: Number, min: 0, default: 0 },
    success: { type: Boolean, default: true },
    provider: { type: String, maxlength: 40 },
    model: { type: String, maxlength: 120 },
    tokensIn: { type: Number, min: 0 },
    tokensOut: { type: Number, min: 0 },
    costUsd: { type: Number, min: 0 },
    cached: { type: Boolean, default: false },
    /** Aggregated metadata only — sensitive prompts are never stored (§49). */
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });
schema.index({ type: 1, createdAt: -1 });
schema.index({ feature: 1, createdAt: -1 });

export const AIEvent: mongoose.Model<any> = (mongoose.models.AIEvent as mongoose.Model<any>) || mongoose.model<any>('AIEvent', schema);
