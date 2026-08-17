import mongoose from 'mongoose';

const sellerProfileSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1200, default: '' },
  avatar: { type: String, default: null },
  location: {
    country: { type: String, default: 'PK' },
    province: { type: String, default: '' },
    city: { type: String, default: '' },
    area: { type: String, default: '' },
  },
  contactPreference: { type: String, enum: ['chat', 'chat_and_call', 'call'], default: 'chat' },
  verificationStatus: { type: String, enum: ['not_verified', 'pending', 'verified', 'rejected'], default: 'not_verified', index: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  activeListingCount: { type: Number, min: 0, default: 0 },
  soldListingCount: { type: Number, min: 0, default: 0 },
  responseRate: { type: Number, min: 0, max: 100, default: null },
  responseTimeMinutes: { type: Number, min: 0, default: null },
  accountType: { type: String, enum: ['individual', 'business'], default: 'individual' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

sellerProfileSchema.index({ isActive: 1, createdAt: -1 });
export const SellerProfile: mongoose.Model<any> = (mongoose.models.SellerProfile as mongoose.Model<any>) || mongoose.model<any>('SellerProfile', sellerProfileSchema);
