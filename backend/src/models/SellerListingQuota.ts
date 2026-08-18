import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  freeListingsUsed: { type: Number, min: 0, default: 0 },
  paidListingsUsed: { type: Number, min: 0, default: 0 },
  totalListings: { type: Number, min: 0, default: 0 },
  currentPeriod: { type: String, default: 'lifetime' },
}, { timestamps: { createdAt: true, updatedAt: true } });

export const SellerListingQuota: mongoose.Model<any> = (mongoose.models.SellerListingQuota as mongoose.Model<any>) || mongoose.model<any>('SellerListingQuota', schema);
