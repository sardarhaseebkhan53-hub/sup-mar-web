import mongoose from 'mongoose';

const accountLinkRequestSchema = new mongoose.Schema<any>({
  requestedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetPhone: { type: String, required: true },
  status: { type: String, enum: ['pending_verification', 'ready_for_review', 'approved', 'rejected', 'expired'], default: 'pending_verification', index: true },
  identityConfirmedAt: Date,
  otpVerifiedAt: Date,
  warningAcceptedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

accountLinkRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
export const AccountLinkRequest: mongoose.Model<any> = (mongoose.models.AccountLinkRequest as mongoose.Model<any>) || mongoose.model<any>('AccountLinkRequest', accountLinkRequestSchema);
