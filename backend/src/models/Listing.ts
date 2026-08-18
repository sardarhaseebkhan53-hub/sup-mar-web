import crypto from 'node:crypto';
import mongoose from 'mongoose';

export const LISTING_STATUSES = Object.freeze([
  'draft',
  'pending',
  'published',
  'rejected',
  'paused',
  'sold',
  'expired',
  'removed',
]);

const mediaSchema = new mongoose.Schema<any>({
  url: { type: String, required: true }, thumbnailUrl: String,
  key: { type: String, required: true },
  alt: { type: String, maxlength: 180, default: '' },
  order: { type: Number, min: 0, default: 0 }, isCover: { type: Boolean, default: false },
  width: Number, height: Number,
  type: { type: String, enum: ['image', 'video'], default: 'image' },
}, { _id: false });

const listingSchema = new mongoose.Schema<any>({
  publicId: { type: String, default: () => `QV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`, unique: true, immutable: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  categorySlug: { type: String, trim: true, lowercase: true },
  subcategorySlug: { type: String, trim: true, lowercase: true },
  categorySchemaVersion: { type: Number, min: 1, default: 1 },
  title: { type: String, default: '', trim: true, maxlength: 100 },
  slug: { type: String, default: '', trim: true },
  description: { type: String, default: '', maxlength: 10000 },
  price: { type: mongoose.Schema.Types.Decimal128, default: null },
  currency: { type: String, uppercase: true, default: 'PKR' },
  negotiable: { type: Boolean, default: false },
  condition: { type: String, enum: ['new', 'like-new', 'used', 'open-box', 'refurbished', 'for-parts', 'not-applicable'], default: 'used' },
  media: { type: [mediaSchema], default: [] },
  coverImage: { type: String, default: null },
  isPromoted: { type: Boolean, default: false },
  monetization: {
    publicationEntitlement: { type: String, enum: ['none', 'free', 'paid', 'credit'], default: 'none' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    creditTransactionId: { type: String, default: null },
    chargedAt: Date,
  },
  videoUrl: { type: String, default: null },
  /** Phase 17 inventory — optional SKU + stock tracking for business sellers. */
  sku: { type: String, trim: true, uppercase: true, maxlength: 40, default: '' },
  stock: {
    tracked: { type: Boolean, default: false },
    quantity: { type: Number, min: 0, max: 1_000_000, default: 1 },
    lowStockThreshold: { type: Number, min: 0, max: 100_000, default: 2 },
    stayVisibleWhenOutOfStock: { type: Boolean, default: true },
  },
  location: {
    country: { type: String, default: 'PK' },
    province: String,
    city: String,
    area: String,
    point: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: undefined } },
  },
  contactPreference: { type: String, enum: ['chat', 'call', 'chat-and-call'], default: 'chat' },
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: LISTING_STATUSES, default: 'draft', index: true },
  moderationState: { type: String, enum: ['Draft','Pending Review','Approved','Rejected','Suspended','Removed','Expired','Sold'], default: 'Draft', index: true },
  availability: { type: String, enum: ['available', 'reserved', 'unavailable'], default: 'available', index: true },
  promotion: {
    status: { type: String, enum: ['none', 'pending', 'active', 'expired', 'cancelled'], default: 'none' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromotionProduct', default: null },
    startsAt: Date,
    endsAt: Date,
  },
  verificationStatus: { type: String, enum: ['not-verified', 'pending', 'verified', 'rejected'], default: 'not-verified' },
  safetyStatus: { type: String, enum: ['normal', 'flagged', 'restricted'], default: 'normal', index: true },
  moderation: {
    riskScore: Number,
    reasons: [String],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: { type: String, maxlength: 500 },
    removedReason: { type: String, maxlength: 500 },
  },
  publishedAt: Date,
  expiresAt: { type: Date, index: true },
  viewCount: { type: Number, min: 0, default: 0 },
  favoriteCount: { type: Number, min: 0, default: 0 },
  reportCount: { type: Number, min: 0, default: 0 },
  messagesCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ 'location.point': '2dsphere' }, { sparse: true });
listingSchema.index({ status: 1, categoryId: 1, publishedAt: -1 });
listingSchema.index({ status: 1, subcategoryId: 1, publishedAt: -1 });
listingSchema.index({ status: 1, categoryId: 1, price: 1 });
listingSchema.index({ status: 1, isPromoted: -1, publishedAt: -1 });
listingSchema.index({ status: 1, 'location.city': 1, publishedAt: -1 });
listingSchema.index({ status: 1, verificationStatus: 1, createdAt: -1 });
listingSchema.index({ safetyStatus: 1, 'moderation.riskScore': -1, createdAt: -1 });
listingSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
listingSchema.index({ 'promotion.status': 1, 'promotion.endsAt': 1 });
listingSchema.index({ slug: 1, _id: 1 }, { unique: true });

export const Listing: mongoose.Model<any> = (mongoose.models.Listing as mongoose.Model<any>) || mongoose.model<any>('Listing', listingSchema);
