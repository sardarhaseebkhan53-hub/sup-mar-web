// @ts-nocheck
import mongoose from 'mongoose';
import { Referral } from '../models/Referral.js';
import { Coupon } from '../models/Coupon.js';
import { CouponRedemption } from '../models/CouponRedemption.js';
import { Campaign } from '../models/Campaign.js';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { RewardLedger } from '../models/RewardLedger.js';
import { User } from '../models/User.js';
import { ListingShare } from '../models/ListingShare.js';

function isConnected() { return mongoose.connection.readyState === 1; }

export async function getGrowthAnalytics(range: string = '30d') {
  const now = new Date();
  let fromDate: Date;
  switch (range) {
    case 'today': fromDate = new Date(now.setHours(0,0,0,0)); break;
    case '7d': fromDate = new Date(Date.now() - 7*24*60*60*1000); break;
    case '90d': fromDate = new Date(Date.now() - 90*24*60*60*1000); break;
    case '30d':
    default: fromDate = new Date(Date.now() - 30*24*60*60*1000);
  }

  if (!isConnected()) {
    return {
      newUsers: 0,
      referralSignups: 0,
      referralConversion: 0,
      couponUsage: 0,
      campaignConversions: 0,
      returningUsers: 0,
      referrals: { invites: 0, signups: 0, eligible: 0, rewardsIssued: 0, conversionRate: 0 },
      coupons: { created: 0, active: 0, applications: 0, redemptions: 0, discountAmount: 0, usageRate: 0 },
      campaigns: { total: 0, reach: 0, views: 0, clicks: 0, conversions: 0 },
      topCampaigns: [],
    };
  }

  const [newUsers, referralSignups, returningUsers, referralsAgg, couponsAgg, redemptionsAgg, campaignsAgg, marketingAgg, rewardAgg] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: fromDate } }),
    MarketingEvent.countDocuments({ type: 'referral_signup', timestamp: { $gte: fromDate } }),
    User.countDocuments({ lastLoginAt: { $gte: fromDate }, createdAt: { $lt: fromDate } }),
    Referral.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: null, total: { $sum: 1 }, eligible: { $sum: { $cond: [{ $in: ['$status', ['eligible','rewarded']] }, 1, 0] } }, rewarded: { $sum: { $cond: [{ $eq: ['$status','rewarded'] }, 1, 0] } }, suspicious: { $sum: { $cond: ['$fraud.isSuspicious',1,0] } } } },
    ]),
    Coupon.aggregate([
      { $group: { _id: null, created: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status','active'] },1,0] } }, totalUsage: { $sum: '$usageCount' } } },
    ]),
    CouponRedemption.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: null, applications: { $sum: 1 }, redemptions: { $sum: { $cond: [{ $eq: ['$status','redeemed'] },1,0] } }, discount: { $sum: '$discountAmount' } } },
    ]),
    Campaign.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: null, total: { $sum: 1 }, views: { $sum: '$analytics.views' }, clicks: { $sum: '$analytics.clicks' }, conversions: { $sum: '$analytics.conversions' }, revenue: { $sum: '$analytics.revenue' } } },
    ]),
    MarketingEvent.aggregate([
      { $match: { timestamp: { $gte: fromDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    RewardLedger.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: null, issued: { $sum: { $cond: [{ $eq: ['$status','available'] },1,0] } }, amount: { $sum: '$amount' } } },
    ]),
  ]);

  const referralData = referralsAgg[0] || { total: 0, eligible: 0, rewarded: 0, suspicious: 0 };
  const couponData = couponsAgg[0] || { created: 0, active: 0, totalUsage: 0 };
  const redemptionData = redemptionsAgg[0] || { applications: 0, redemptions: 0, discount: 0 };
  const campaignData = campaignsAgg[0] || { total: 0, views: 0, clicks: 0, conversions: 0, revenue: 0 };

  const conversionRate = referralData.total ? (referralData.eligible / referralData.total) * 100 : 0;
  const usageRate = couponData.created ? (couponData.totalUsage / (couponData.created * 10)) * 100 : 0;

  // Top campaigns by conversions
  const topCampaigns = await Campaign.find({}).sort({ 'analytics.conversions': -1, 'analytics.views': -1 }).limit(10).lean();

  return {
    newUsers,
    referralSignups,
    referralConversion: Number(conversionRate.toFixed(2)),
    couponUsage: redemptionData.redemptions,
    campaignConversions: campaignData.conversions,
    returningUsers,
    referrals: {
      invites: referralData.total,
      signups: referralSignups,
      eligible: referralData.eligible,
      rewardsIssued: referralData.rewarded,
      suspicious: referralData.suspicious,
      conversionRate: Number(conversionRate.toFixed(2)),
      rewardsAmount: (rewardAgg[0]?.amount || 0),
    },
    coupons: {
      created: couponData.created,
      active: couponData.active,
      applications: redemptionData.applications,
      redemptions: redemptionData.redemptions,
      discountAmount: redemptionData.discount,
      usageRate: Number(usageRate.toFixed(2)),
    },
    campaigns: {
      total: campaignData.total,
      views: campaignData.views,
      clicks: campaignData.clicks,
      conversions: campaignData.conversions,
      revenue: campaignData.revenue,
      ctr: campaignData.views ? Number(((campaignData.clicks / campaignData.views) * 100).toFixed(2)) : 0,
    },
    topCampaigns: topCampaigns.map((c:any) => ({
      id: String(c._id),
      name: c.name,
      slug: c.seo?.slug,
      status: c.status,
      views: c.analytics?.views || 0,
      clicks: c.analytics?.clicks || 0,
      conversions: c.analytics?.conversions || 0,
      revenue: c.analytics?.revenue || 0,
      ctr: c.analytics?.views ? Number(((c.analytics?.clicks / c.analytics?.views) * 100).toFixed(2)) : 0,
    })),
    events: Object.fromEntries(marketingAgg.map((e:any)=>[e._id, e.count])),
  };
}

export async function getReferralAnalytics(range = '30d') {
  const fromDate = range === 'today' ? new Date(new Date().setHours(0,0,0,0)) : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 24*60*60*1000);
  if (!isConnected()) return { invites: 0, signups: 0, eligible: 0, rewardsIssued: 0, conversionRate: 0, daily: [] };
  const daily = await Referral.aggregate([
    { $match: { createdAt: { $gte: fromDate } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, eligible: { $sum: { $cond: [{ $in: ['$status',['eligible','rewarded']] },1,0] } }, rewarded: { $sum: { $cond: [{ $eq: ['$status','rewarded'] },1,0] } } } },
    { $sort: { _id: 1 } },
  ]);
  const total = await Referral.countDocuments({ createdAt: { $gte: fromDate } });
  const eligible = await Referral.countDocuments({ createdAt: { $gte: fromDate }, status: { $in: ['eligible','rewarded'] } });
  const rewarded = await Referral.countDocuments({ createdAt: { $gte: fromDate }, status: 'rewarded' });
  return { invites: total, signups: total, eligible, rewardsIssued: rewarded, conversionRate: total ? Number(((eligible/total)*100).toFixed(2)) : 0, daily };
}

export async function getCouponAnalytics(range = '30d') {
  const fromDate = range === 'today' ? new Date(new Date().setHours(0,0,0,0)) : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 24*60*60*1000);
  if (!isConnected()) return { created: 0, active: 0, applications: 0, redemptions: 0, discount: 0, daily: [] };
  const [created, active, redemptions, discountAgg, daily] = await Promise.all([
    Coupon.countDocuments({ createdAt: { $gte: fromDate } }),
    Coupon.countDocuments({ status: 'active' }),
    CouponRedemption.countDocuments({ createdAt: { $gte: fromDate }, status: 'redeemed' }),
    CouponRedemption.aggregate([{ $match: { createdAt: { $gte: fromDate } } }, { $group: { _id: null, total: { $sum: '$discountAmount' } } }]),
    CouponRedemption.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, discount: { $sum: '$discountAmount' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  return { created, active, applications: redemptions, redemptions, discountAmount: discountAgg[0]?.total || 0, daily, usageRate: created ? Number(((redemptions / Math.max(1, created * 5)) * 100).toFixed(2)) : 0 };
}

export async function getCampaignAnalytics(range = '30d', sellerId?: string) {
  const fromDate = range === 'today' ? new Date(new Date().setHours(0,0,0,0)) : new Date(Date.now() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 24*60*60*1000);
  if (!isConnected()) return { campaigns: 0, views: 0, clicks: 0, conversions: 0, revenue: 0, daily: [] };
  const match: any = { createdAt: { $gte: fromDate } };
  if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId);
  const agg = await Campaign.aggregate([
    { $match: match },
    { $group: { _id: null, campaigns: { $sum: 1 }, views: { $sum: '$analytics.views' }, clicks: { $sum: '$analytics.clicks' }, conversions: { $sum: '$analytics.conversions' }, revenue: { $sum: '$analytics.revenue' } } },
  ]);
  const daily = await MarketingEvent.aggregate([
    { $match: { timestamp: { $gte: fromDate }, ...(sellerId ? {} : {}), type: { $in: ['campaign_view','cta_click','eligible_transaction'] } } },
    { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, type: '$type' }, count: { $sum: 1 } } },
    { $sort: { '_id.date': 1 } },
  ]);
  return { ...(agg[0] || { campaigns: 0, views: 0, clicks: 0, conversions: 0, revenue: 0 }), daily };
}

export async function getShareAnalytics(sellerId?: string) {
  if (!isConnected()) return { totalShares: 0, listingViewsFromShares: 0 };
  const match: any = {};
  if (sellerId) {
    // Need listings of seller
    const { Listing } = await import('../models/Listing.js');
    const listings = await Listing.find({ sellerId }).select('_id').lean();
    const ids = listings.map((l:any)=>l._id);
    match.listingId = { $in: ids };
  }
  const [shares, views] = await Promise.all([
    ListingShare.countDocuments(match),
    MarketingEvent.countDocuments({ type: 'listing_view', source: 'shared_link', ...(match.listingId ? { listingId: match.listingId } : {}) }),
  ]);
  return { totalShares: shares, listingViewsFromShares: views };
}
