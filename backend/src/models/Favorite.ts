import mongoose from 'mongoose';
const favoriteSchema = new mongoose.Schema<any>({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });
export const Favorite: mongoose.Model<any> = (mongoose.models.Favorite as mongoose.Model<any>) || mongoose.model<any>('Favorite', favoriteSchema);
