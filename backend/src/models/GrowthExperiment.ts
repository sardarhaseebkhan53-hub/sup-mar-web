import mongoose from 'mongoose';

const experimentSchema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['draft', 'running', 'paused', 'completed', 'archived'], default: 'draft', index: true },
  variants: [{
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    weight: { type: Number, default: 50, min: 0, max: 100 },
    config: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    _id: false,
  }],
  audience: { type: String, enum: ['all', 'new_users', 'returning_users', 'sellers'], default: 'all' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
  metrics: {
    exposures: { type: Map, of: Number, default: {} }, // variantKey -> count
    conversions: { type: Map, of: Number, default: {} },
  },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

experimentSchema.index({ status: 1, enabled: 1, startAt: 1, endAt: 1 });
experimentSchema.index({ campaignId: 1 });

export const GrowthExperiment: mongoose.Model<any> = (mongoose.models.GrowthExperiment as mongoose.Model<any>) || mongoose.model<any>('GrowthExperiment', experimentSchema);
