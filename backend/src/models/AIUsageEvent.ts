import mongoose from 'mongoose';

/**
 * Phase 16 AI usage telemetry.
 *
 * Deliberately stores no prompt text and no user content — only feature, provider,
 * outcome, latency and coarse size/cost metrics needed to run the platform.
 */
const schema = new mongoose.Schema<any>({
  feature: { type: String, required: true, index: true, maxlength: 60 },
  provider: { type: String, default: 'heuristic', maxlength: 40 },
  model: { type: String, default: '', maxlength: 80 },
  success: { type: Boolean, default: true, index: true },
  durationMs: { type: Number, min: 0, default: 0 },
  inputChars: { type: Number, min: 0, default: 0 },
  outputChars: { type: Number, min: 0, default: 0 },
  promptTokens: { type: Number, min: 0, default: 0 },
  completionTokens: { type: Number, min: 0, default: 0 },
  totalTokens: { type: Number, min: 0, default: 0 },
  estimatedCostUsd: { type: Number, min: 0, default: 0 },
  errorCode: { type: String, default: '', maxlength: 120 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ createdAt: -1 });
schema.index({ feature: 1, createdAt: -1 });
schema.index({ provider: 1, createdAt: -1 });
schema.index({ success: 1, createdAt: -1 });

export const AIUsageEvent: mongoose.Model<any> = (mongoose.models.AIUsageEvent as mongoose.Model<any>) || mongoose.model<any>('AIUsageEvent', schema);
