import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', required: true, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  listingPublicId: { type: String, required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['listing_impression', 'listing_click', 'listing_view', 'favorite_added', 'contact_seller'], required: true, index: true },
  fingerprint: { type: String, required: true },
  bucket: { type: String, required: true },
  placement: { type: String, default: 'organic' },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ promotionId: 1, type: 1, fingerprint: 1, bucket: 1 }, { unique: true });
schema.index({ sellerId: 1, createdAt: -1 });
schema.index({ promotionId: 1, createdAt: -1 });

export const PromotionEvent: mongoose.Model<any> = (mongoose.models.PromotionEvent as mongoose.Model<any>) || mongoose.model<any>('PromotionEvent', schema);
