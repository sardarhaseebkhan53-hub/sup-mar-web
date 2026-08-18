import mongoose from 'mongoose';

const schema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  listingCredits: { type: Number, min: 0, default: 0 },
  promotionCredits: { type: Number, min: 0, default: 0 },
  featuredDays: { type: Number, min: 0, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: true } });

export const SellerCreditWallet: mongoose.Model<any> = (mongoose.models.SellerCreditWallet as mongoose.Model<any>) || mongoose.model<any>('SellerCreditWallet', schema);
