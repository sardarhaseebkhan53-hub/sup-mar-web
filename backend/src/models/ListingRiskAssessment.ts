import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  listingId: { type: String, required: true, index: true },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low', index: true },
  signals: { type: [String], default: [] },
  reviewed: { type: Boolean, default: false, index: true },
  note: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

schema.index({ listingId: 1, updatedAt: -1 });
schema.index({ riskLevel: 1, reviewed: 1, createdAt: -1 });

export const ListingRiskAssessment: mongoose.Model<any> = (mongoose.models.ListingRiskAssessment as mongoose.Model<any>) || mongoose.model<any>('ListingRiskAssessment', schema);
