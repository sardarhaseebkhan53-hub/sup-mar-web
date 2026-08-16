import mongoose from 'mongoose';
import { AUTH_PURPOSE_VALUES } from '../constants/account.js';

const verificationChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  target: { type: String, required: true, index: true },
  channel: { type: String, enum: ['email', 'sms'], required: true },
  purpose: { type: String, enum: AUTH_PURPOSE_VALUES, required: true, index: true },
  secretHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  resendCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  resendAvailableAt: { type: Date, required: true },
  lockedUntil: Date,
  consumedAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

verificationChallengeSchema.index({ target: 1, purpose: 1, createdAt: -1 });
verificationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
export const VerificationChallenge = mongoose.models.VerificationChallenge || mongoose.model('VerificationChallenge', verificationChallengeSchema);
