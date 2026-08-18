import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  guestKey: { type: String, default: null, index: true },
  title: { type: String, maxlength: 160, default: 'QAVLIO Assistant' },
  lastIntent: { type: mongoose.Schema.Types.Mixed, default: null },
  listingId: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: { createdAt: true, updatedAt: true } });

schema.index({ userId: 1, updatedAt: -1 });
schema.index({ guestKey: 1, updatedAt: -1 });

export const AIConversation: mongoose.Model<any> = (mongoose.models.AIConversation as mongoose.Model<any>) || mongoose.model<any>('AIConversation', schema);
