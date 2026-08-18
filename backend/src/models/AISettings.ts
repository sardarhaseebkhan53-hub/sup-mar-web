import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  key: { type: String, unique: true, default: 'ai' },
  enabled: { type: Boolean, default: true },
  provider: { type: String, enum: ['heuristic', 'openai', 'gemini'], default: 'heuristic' },
  model: { type: String, default: '' },
  requestLimitPerMinute: { type: Number, min: 1, max: 120, default: 12 },
  requestLimitPerDay: { type: Number, min: 1, max: 5000, default: 80 },
  features: {
    assistant: { type: Boolean, default: true },
    search: { type: Boolean, default: true },
    recommendations: { type: Boolean, default: true },
    listingAssistant: { type: Boolean, default: true },
    support: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const AISettings: mongoose.Model<any> = (mongoose.models.AISettings as mongoose.Model<any>) || mongoose.model<any>('AISettings', schema);
