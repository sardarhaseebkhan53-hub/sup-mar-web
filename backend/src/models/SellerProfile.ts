import mongoose from 'mongoose';

const sellerProfileSchema = new mongoose.Schema<any>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true, index: true },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  publicSlug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
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
  /** Phase 17 business profile — only surfaced for business accounts. */
  business: {
    name: { type: String, trim: true, maxlength: 140, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    logo: { type: String, default: null },
    category: { type: String, trim: true, maxlength: 80, default: '' },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    workingHours: {
      type: [{
        day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        open: { type: Boolean, default: true },
        from: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '' },
        to: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '' },
      }],
      default: [],
    },
    contact: {
      chat: { type: Boolean, default: true },
      call: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    showContactDetails: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true, index: true },
  safetyStatus: { type: String, enum: ['normal', 'restricted', 'suspended'], default: 'normal', index: true },
}, { timestamps: true });

sellerProfileSchema.index({ isActive: 1, createdAt: -1 });
export const SellerProfile: mongoose.Model<any> = (mongoose.models.SellerProfile as mongoose.Model<any>) || mongoose.model<any>('SellerProfile', sellerProfileSchema);
