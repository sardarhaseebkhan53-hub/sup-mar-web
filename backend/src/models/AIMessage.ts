import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIConversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  message: { type: String, required: true, maxlength: 8000 },
  tools: { type: [{ name: String, listingIds: [String], ok: Boolean }], default: [] },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ conversationId: 1, createdAt: 1 });

export const AIMessage: mongoose.Model<any> = (mongoose.models.AIMessage as mongoose.Model<any>) || mongoose.model<any>('AIMessage', schema);
