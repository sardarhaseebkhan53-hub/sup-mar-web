import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  listingId: { type: String, required: true, index: true },
  provider: { type: String, required: true },
  model: { type: String, default: '' },
  assessment: { type: String, enum: ['allow','flag','review'], required: true },
  confidence: { type: Number, min: 0, max: 1, default: null },
  signals: { type: [String], default: [] },
  result: { type: String, required: true, maxlength: 120 },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ listingId: 1, createdAt: -1 });

export const AIModerationLog: mongoose.Model<any> = (mongoose.models.AIModerationLog as mongoose.Model<any>) || mongoose.model<any>('AIModerationLog', schema);
