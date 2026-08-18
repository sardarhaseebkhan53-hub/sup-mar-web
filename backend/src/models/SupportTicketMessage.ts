import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  internal: { type: Boolean, default: false, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ ticketId: 1, createdAt: 1 });

export const SupportTicketMessage: mongoose.Model<any> = (mongoose.models.SupportTicketMessage as mongoose.Model<any>) || mongoose.model<any>('SupportTicketMessage', schema);
