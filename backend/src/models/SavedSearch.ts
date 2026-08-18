import mongoose from 'mongoose';
import { ALERT_FREQUENCIES } from '../constants/buyerExperience.js';

const savedSearchSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, trim: true, maxlength: 80, required: true },
  query: { type: String, trim: true, maxlength: 100, default: '' },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  categoryId: { type: String, default: '' },
  location: { type: String, default: '' },
  minPrice: { type: Number, default: null },
  maxPrice: { type: Number, default: null },
  condition: { type: String, default: '' },
  sort: { type: String, default: 'newest' },
  alertEnabled: { type: Boolean, default: false, index: true },
  alertFrequency: { type: String, enum: ALERT_FREQUENCIES, default: 'daily' },
  lastMatchedAt: { type: Date, default: null },
  lastNotifiedAt: { type: Date, default: null },
  pendingMatchCount: { type: Number, default: 0 },
}, { timestamps: true });

savedSearchSchema.index({ userId: 1, createdAt: -1 });
savedSearchSchema.index({ alertEnabled: 1, createdAt: -1 });
savedSearchSchema.index({ userId: 1, alertEnabled: 1, location: 1, categoryId: 1 });

export const SavedSearch: mongoose.Model<any> = (mongoose.models.SavedSearch as mongoose.Model<any>) || mongoose.model<any>('SavedSearch', savedSearchSchema);
