import mongoose from 'mongoose';
const schema = new mongoose.Schema<any>({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true }, viewedAt: { type: Date, default: Date.now } });
schema.index({ userId: 1, listingId: 1 }, { unique: true }); schema.index({ userId: 1, viewedAt: -1 });
export const RecentlyViewed: mongoose.Model<any> = (mongoose.models.RecentlyViewed as mongoose.Model<any>) || mongoose.model<any>('RecentlyViewed', schema);
