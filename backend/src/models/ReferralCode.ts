import mongoose from 'mongoose';

const referralCodeSchema = new mongoose.Schema<any>({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  usageCount: { type: Number, default: 0, min: 0 },
  successfulCount: { type: Number, default: 0, min: 0 },
  totalRewards: { type: Number, default: 0, min: 0 },
  lastUsedAt: { type: Date, default: null },
  custom: { type: Boolean, default: false },
}, { timestamps: true });

referralCodeSchema.index({ ownerId: 1, isActive: 1 });

export const ReferralCode: mongoose.Model<any> = (mongoose.models.ReferralCode as mongoose.Model<any>) || mongoose.model<any>('ReferralCode', referralCodeSchema);
