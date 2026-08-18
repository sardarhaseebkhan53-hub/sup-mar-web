import mongoose from 'mongoose';

const marketingEventSchema = new mongoose.Schema<any>({
  type: { type: String, enum: ['impression', 'campaign_view', 'cta_click', 'listing_view', 'coupon_apply', 'coupon_redeem', 'eligible_transaction', 'share', 'wishlist_campaign', 'saved_search_campaign', 'referral_link_view', 'referral_signup', 'reward_earn', 'reward_redeem'], required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  anonymousId: { type: String, default: null, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null, index: true },
  referralCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCode', default: null },
  referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', default: null },
  source: { type: String, default: '', trim: true },
  medium: { type: String, default: '', trim: true },
  placement: { type: String, default: '', trim: true },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  ipHash: { type: String, default: null },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: () => new Date(), index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

marketingEventSchema.index({ type: 1, campaignId: 1, timestamp: -1 });
marketingEventSchema.index({ campaignId: 1, type: 1, timestamp: -1 });
marketingEventSchema.index({ couponId: 1, type: 1, timestamp: -1 });
marketingEventSchema.index({ userId: 1, type: 1, timestamp: -1 });
marketingEventSchema.index({ listingId: 1, type: 1, timestamp: -1 });
marketingEventSchema.index({ timestamp: -1 });

export const MarketingEvent: mongoose.Model<any> = (mongoose.models.MarketingEvent as mongoose.Model<any>) || mongoose.model<any>('MarketingEvent', marketingEventSchema);
