import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
  listingPublicId: { type: String, required: true, uppercase: true },
  viewedAt: { type: Date, default: Date.now },
});

schema.index({ userId: 1, listingPublicId: 1 }, { unique: true });
schema.index({ userId: 1, viewedAt: -1 });

export const RecentlyViewed: mongoose.Model<any> = (mongoose.models.RecentlyViewed as mongoose.Model<any>) || mongoose.model<any>('RecentlyViewed', schema);
