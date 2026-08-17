import mongoose from 'mongoose';
import { AD_SLOTS } from '../constants/adSlots.js';

const adCampaignSchema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true },
  advertiserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  slotIds: [{ type: String, enum: AD_SLOTS, required: true }],
  creative: {
    type: { type: String, enum: ['image', 'html', 'house'], default: 'image' },
    desktopUrl: String, mobileUrl: String, alt: String, destinationUrl: String,
  },
  targeting: { categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], cities: [String], device: { type: String, enum: ['all', 'desktop', 'mobile'], default: 'all' } },
  budget: { amount: mongoose.Schema.Types.Decimal128, currency: { type: String, default: 'PKR' } },
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'ended'], default: 'draft', index: true },
  startsAt: Date,
  endsAt: Date,
  metrics: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
}, { timestamps: true });

adCampaignSchema.index({ slotIds: 1, status: 1, startsAt: 1, endsAt: 1 });
export const AdCampaign: mongoose.Model<any> = (mongoose.models.AdCampaign as mongoose.Model<any>) || mongoose.model<any>('AdCampaign', adCampaignSchema);
