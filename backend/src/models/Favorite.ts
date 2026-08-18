import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  listingPublicId: { type: String, required: true, uppercase: true },
  priceAlertEnabled: { type: Boolean, default: false },
  lastKnownPrice: { type: Number, default: null },
  lastAlertedPrice: { type: Number, default: null },
}, { timestamps: { createdAt: true, updatedAt: true } });

favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, listingPublicId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index({ listingPublicId: 1, priceAlertEnabled: 1 });

export const Favorite: mongoose.Model<any> = (mongoose.models.Favorite as mongoose.Model<any>) || mongoose.model<any>('Favorite', favoriteSchema);
