import mongoose from 'mongoose';

export const SUPPORT_STATUSES = Object.freeze(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']);
export const SUPPORT_PRIORITIES = Object.freeze(['low', 'medium', 'high', 'urgent']);
export const SUPPORT_CATEGORIES = Object.freeze(['payment', 'listing', 'account', 'chat', 'safety', 'other']);

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: String, default: null },
  category: { type: String, enum: SUPPORT_CATEGORIES, required: true, index: true },
  description: { type: String, required: true, maxlength: 4000 },
  priority: { type: String, enum: SUPPORT_PRIORITIES, default: 'medium' },
  status: { type: String, enum: SUPPORT_STATUSES, default: 'Open', index: true },
}, { timestamps: { createdAt: true, updatedAt: true } });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export const SupportTicket: mongoose.Model<any> = (mongoose.models.SupportTicket as mongoose.Model<any>) || mongoose.model<any>('SupportTicket', schema);
