import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  familyId: { type: String, required: true, index: true },
  remember: { type: Boolean, default: false },
  device: { type: String, default: 'Unknown device', maxlength: 120 },
  browser: { type: String, default: 'Unknown browser', maxlength: 120 },
  platform: { type: String, default: '', maxlength: 80 },
  ipHash: { type: String, default: '' },
  ipApproximation: { type: String, default: 'Unknown location', maxlength: 120 },
  userAgent: { type: String, default: '', maxlength: 500 },
  loginAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revokeReason: { type: String, enum: ['logout', 'logout_all', 'rotated', 'password_change', 'account_status', 'reuse_detected', 'admin'], default: undefined },
}, { timestamps: true });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1, lastActiveAt: -1 });
export const Session: mongoose.Model<any> = (mongoose.models.Session as mongoose.Model<any>) || mongoose.model<any>('Session', sessionSchema);
