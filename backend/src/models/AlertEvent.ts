import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: String, required: true },
  savedSearchId: { type: String, default: '' },
  listingId: { type: String, default: '' },
  type: { type: String, required: true, enum: ['saved_search', 'saved_search_digest', 'price_alert', 'price_digest', 'seller_update', 'listing_status'] },
  sentAt: { type: Date, default: Date.now },
  digestKey: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ userId: 1, savedSearchId: 1, listingId: 1, type: 1 }, { unique: true });
schema.index({ userId: 1, type: 1, sentAt: -1 });
schema.index({ digestKey: 1, userId: 1 });

export const AlertEvent: mongoose.Model<any> = (mongoose.models.AlertEvent as mongoose.Model<any>) || mongoose.model<any>('AlertEvent', schema);
