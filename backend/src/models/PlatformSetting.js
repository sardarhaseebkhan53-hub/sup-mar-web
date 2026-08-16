import mongoose from 'mongoose';

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  scope: { type: String, enum: ['public', 'private'], default: 'private', index: true },
  description: String,
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const PlatformSetting = mongoose.models.PlatformSetting || mongoose.model('PlatformSetting', platformSettingSchema);
