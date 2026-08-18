import mongoose from 'mongoose';

/**
 * SellerTeamMember (Phase 17 §51–54) — business team invitations and memberships.
 * Invited users authenticate through their existing QAVLIO account; no separate passwords.
 * Roles drive the permission matrix; financial access stays owner-only.
 */
const schema = new mongoose.Schema<any>(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    inviteEmail: { type: String, trim: true, lowercase: true, maxlength: 160, required: true },
    role: { type: String, enum: ['owner', 'manager', 'staff'], default: 'staff', index: true },
    status: { type: String, enum: ['invited', 'active', 'revoked', 'expired'], default: 'invited', index: true },
    inviteTokenHash: { type: String, default: '' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ ownerId: 1, status: 1 });
schema.index({ inviteEmail: 1, ownerId: 1 });

export const SellerTeamMember: mongoose.Model<any> =
  (mongoose.models.SellerTeamMember as mongoose.Model<any>) || mongoose.model<any>('SellerTeamMember', schema);
