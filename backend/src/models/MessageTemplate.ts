import mongoose from 'mongoose';

/**
 * MessageTemplate (Phase 17 §25–26) — seller quick replies for messaging.
 * Templates are manually triggered helpers; no automated sending or spam.
 */
const schema = new mongoose.Schema<any>(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, minlength: 2, maxlength: 80, required: true },
    body: { type: String, trim: true, minlength: 2, maxlength: 500, required: true },
    usageCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

schema.index({ sellerId: 1, updatedAt: -1 });

export const MessageTemplate: mongoose.Model<any> =
  (mongoose.models.MessageTemplate as mongoose.Model<any>) || mongoose.model<any>('MessageTemplate', schema);
