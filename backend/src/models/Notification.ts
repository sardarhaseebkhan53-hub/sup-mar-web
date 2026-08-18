import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['message', 'favorite', 'listing', 'system', 'saved_search', 'price_alert', 'seller_update', 'listing_status'], required: true },
  title: { type: String, maxlength: 150, required: true },
  body: { type: String, maxlength: 500, required: true },
  relatedId: { type: String, maxlength: 100 },
  relatedType: { type: String, enum: ['conversation', 'listing', 'system', 'search', 'seller'] },
  channel: { type: String, enum: ['in-app', 'email', 'push'], default: 'in-app' },
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: mongoose.Model<any> = (mongoose.models.Notification as mongoose.Model<any>) || mongoose.model<any>('Notification', schema);
