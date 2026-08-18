import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  listingId: { type: String, required: true, uppercase: true },
  price: { type: Number, required: true },
  previousPrice: { type: Number, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ listingId: 1, createdAt: -1 });

export const ListingPriceHistory: mongoose.Model<any> = (mongoose.models.ListingPriceHistory as mongoose.Model<any>) || mongoose.model<any>('ListingPriceHistory', schema);
