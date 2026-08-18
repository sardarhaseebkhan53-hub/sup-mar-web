import mongoose from 'mongoose';

const seoSchema = new mongoose.Schema<any>({
  title: { type: String, trim: true, maxlength: 150, default: '' },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  slug: { type: String, trim: true, lowercase: true, required: true, unique: true, index: true },
  ogImage: { type: String, default: '' },
}, { _id: false });

const analyticsSchema = new mongoose.Schema<any>({
  views: { type: Number, default: 0, min: 0 },
  clicks: { type: Number, default: 0, min: 0 },
  couponApplications: { type: Number, default: 0, min: 0 },
  couponRedemptions: { type: Number, default: 0, min: 0 },
  listingsViewed: { type: Number, default: 0, min: 0 },
  leads: { type: Number, default: 0, min: 0 },
  conversions: { type: Number, default: 0, min: 0 },
  revenue: { type: Number, default: 0, min: 0 },
  shares: { type: Number, default: 0, min: 0 },
}, { _id: false });

const campaignSchema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  banner: {
    imageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    ctaText: { type: String, default: 'Explore', maxlength: 40 },
    ctaLink: { type: String, default: '' },
    placement: { type: String, enum: ['home', 'category', 'listing', 'search', 'global'], default: 'home' },
  },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  audience: { type: String, enum: ['all', 'new_users', 'returning_users', 'sellers', 'category_interested', 'wishlist', 'saved_search'], default: 'all', index: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null, index: true },
  targetCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  targetCategorySlugs: [{ type: String, trim: true, lowercase: true }],
  targetListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'], default: 'draft', index: true },
  seo: { type: seoSchema, required: true },
  analytics: { type: analyticsSchema, default: () => ({}) },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  scope: { type: String, enum: ['platform', 'seller'], default: 'platform', index: true },
  featured: { type: Boolean, default: false, index: true },
  priority: { type: Number, default: 10, min: 0, max: 100 },
  isPublic: { type: Boolean, default: true },
  featureFlag: { type: String, default: 'growth_campaigns' },
  enabled: { type: Boolean, default: true },
  frequency: {
    dailyLimit: { type: Number, default: 2, min: 0, max: 100 },
    weeklyLimit: { type: Number, default: 10, min: 0, max: 500 },
    cooldownHours: { type: Number, default: 24, min: 0, max: 720 },
  },
}, { timestamps: true });

campaignSchema.index({ status: 1, startAt: 1, endAt: 1 });
campaignSchema.index({ 'seo.slug': 1, status: 1 });
campaignSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ scope: 1, status: 1, isPublic: 1, startAt: 1, endAt: 1 });
campaignSchema.index({ priority: -1, startAt: -1 });

export const Campaign: mongoose.Model<any> = (mongoose.models.Campaign as mongoose.Model<any>) || mongoose.model<any>('Campaign', campaignSchema);
