import mongoose from 'mongoose';
const conversationSchema = new mongoose.Schema<any>({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, lastMessagePreview: { type: String, trim: true, maxlength: 180, default: '' }, lastMessageAt: Date,
  unreadCountBuyer: { type: Number, min: 0, default: 0 }, unreadCountSeller: { type: Number, min: 0, default: 0 },
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
conversationSchema.index({ buyerId: 1, sellerId: 1, listingId: 1 }, { unique: true });
conversationSchema.index({ buyerId: 1, updatedAt: -1 }); conversationSchema.index({ sellerId: 1, updatedAt: -1 });
export const Conversation: mongoose.Model<any> = (mongoose.models.Conversation as mongoose.Model<any>) || mongoose.model<any>('Conversation', conversationSchema);
