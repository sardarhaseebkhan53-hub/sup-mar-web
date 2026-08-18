import mongoose from 'mongoose';

export const RESTRICTION_TYPES = ['LISTING','MESSAGING','ACCOUNT','SELLING'] as const;
const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: RESTRICTION_TYPES, required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  startAt: { type: Date, required: true, default: Date.now },
  endAt: { type: Date, default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Active','Expired','Revoked'], default: 'Active', index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, type: 1, status: 1, endAt: 1 });

export const UserRestriction: mongoose.Model<any> = (mongoose.models.UserRestriction as mongoose.Model<any>) || mongoose.model<any>('UserRestriction', schema);
