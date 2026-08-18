import mongoose from 'mongoose';
const listingViewSchema = new mongoose.Schema<any>({ listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true }, fingerprint: { type: String, required: true }, bucket: { type: String, required: true }, viewedAt: { type: Date, default: Date.now, expires: '8d' } });
listingViewSchema.index({ listingId: 1, fingerprint: 1, bucket: 1 }, { unique: true });
export const ListingView: mongoose.Model<any> = (mongoose.models.ListingView as mongoose.Model<any>) || mongoose.model<any>('ListingView', listingViewSchema);
