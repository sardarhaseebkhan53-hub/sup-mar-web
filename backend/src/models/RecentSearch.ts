import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, trim: true, maxlength: 100, default: '' },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  searchedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ userId: 1, searchedAt: -1 });
schema.index({ userId: 1, query: 1 });

export const RecentSearch: mongoose.Model<any> = (mongoose.models.RecentSearch as mongoose.Model<any>) || mongoose.model<any>('RecentSearch', schema);
