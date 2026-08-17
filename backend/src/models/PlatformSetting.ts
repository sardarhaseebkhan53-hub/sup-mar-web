import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema<any>({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  scope: { type: String, enum: ['public', 'private'], default: 'private', index: true },
  description: String,
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const PlatformSetting: mongoose.Model<any> = (mongoose.models.PlatformSetting as mongoose.Model<any>) || mongoose.model<any>('PlatformSetting', platformSettingSchema);
