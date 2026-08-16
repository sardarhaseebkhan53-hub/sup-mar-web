import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, required: true, index: true },
  outcome: { type: String, enum: ['success', 'failure', 'info'], default: 'info' },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low', index: true },
  requestId: { type: String, index: true },
  ipHash: String,
  userAgent: { type: String, maxlength: 500 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, immutable: true });

securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
export const SecurityEvent = mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', securityEventSchema);
