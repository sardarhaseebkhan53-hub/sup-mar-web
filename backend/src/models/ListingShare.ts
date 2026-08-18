import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema<any>({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  shareMethod: { type: String, enum: ['copy', 'native', 'whatsapp', 'facebook', 'twitter', 'link', 'other'], default: 'copy' },
  referralCode: { type: String, default: null, uppercase: true, trim: true },
  ipHash: { type: String, default: null },
  userAgent: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

shareSchema.index({ listingId: 1, createdAt: -1 });
shareSchema.index({ userId: 1, createdAt: -1 });

export const ListingShare: mongoose.Model<any> = (mongoose.models.ListingShare as mongoose.Model<any>) || mongoose.model<any>('ListingShare', shareSchema);
