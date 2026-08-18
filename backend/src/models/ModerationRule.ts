import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  categorySlug: { type: String, trim: true, lowercase: true, default: '', index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  ruleType: { type: String, enum: ['PROHIBITED_KEYWORD','CATEGORY_REVIEW','LINK_SPAM','PRICE_ANOMALY','IMAGE_DUPLICATE'], required: true, index: true },
  enabled: { type: Boolean, default: true, index: true },
  severity: { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], required: true },
  action: { type: String, enum: ['FLAG','REVIEW','BLOCK'], required: true },
  configuration: { type: mongoose.Schema.Types.Mixed, default: {}, select: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
schema.index({ categorySlug: 1, enabled: 1, ruleType: 1 });

export const ModerationRule: mongoose.Model<any> = (mongoose.models.ModerationRule as mongoose.Model<any>) || mongoose.model<any>('ModerationRule', schema);
