import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, trim: true, maxlength: 80 },
  query: { type: String, trim: true, maxlength: 100, default: '' },
  filters: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  notificationEnabled: { type: Boolean, default: false },
}, { timestamps: true });

savedSearchSchema.index({ userId: 1, createdAt: -1 });
export const SavedSearch: mongoose.Model<any> = (mongoose.models.SavedSearch as mongoose.Model<any>) || mongoose.model<any>('SavedSearch', savedSearchSchema);
