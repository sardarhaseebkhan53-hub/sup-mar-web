import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  listingId: { type: String, required: true, index: true },
  score: { type: Number, min: 0, max: 100, default: 0, index: true },
  level: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Low', index: true },
  riskLevel: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Low', index: true },
  signals: { type: [String], default: [] },
  reviewed: { type: Boolean, default: false, index: true },
  note: { type: String, maxlength: 1000, default: '', select: false },
}, { timestamps: true });
schema.index({ listingId: 1, updatedAt: -1 });
schema.index({ level: 1, reviewed: 1, createdAt: -1 });
schema.index({ userId: 1, level: 1, createdAt: -1 });

export const ListingRiskAssessment: mongoose.Model<any> = (mongoose.models.ListingRiskAssessment as mongoose.Model<any>) || mongoose.model<any>('ListingRiskAssessment', schema);
