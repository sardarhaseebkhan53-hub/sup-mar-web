import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  query: { type: String, trim: true, lowercase: true, maxlength: 100, default: '', index: true },
  category: { type: String, trim: true, lowercase: true, maxlength: 80, default: '', index: true },
  filterKeys: { type: [String], default: [] },
  resultCount: { type: Number, min: 0, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: -1 });
schema.index({ query: 1, createdAt: -1 });
schema.index({ category: 1, createdAt: -1 });

export const SearchAnalyticsEvent: mongoose.Model<any> = (mongoose.models.SearchAnalyticsEvent as mongoose.Model<any>) || mongoose.model<any>('SearchAnalyticsEvent', schema);
