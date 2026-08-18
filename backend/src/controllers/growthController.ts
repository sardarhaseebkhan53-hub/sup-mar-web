// @ts-nocheck
import { getGrowthAnalytics, getReferralAnalytics, getCouponAnalytics, getCampaignAnalytics, getShareAnalytics } from '../services/growthAnalyticsService.js';
import { getGrowthSettings, updateGrowthSettings } from '../services/growthSettingsService.js';
import { listCampaigns } from '../services/campaignService.js';

export async function analytics(req, res) {
  const range = String(req.query.range || '30d');
  const data = await getGrowthAnalytics(range);
  res.json({ success: true, data });
}

export async function referralAnalytics(req, res) {
  const range = String(req.query.range || '30d');
  const data = await getReferralAnalytics(range);
  res.json({ success: true, data });
}

export async function couponAnalytics(req, res) {
  const range = String(req.query.range || '30d');
  const data = await getCouponAnalytics(range);
  res.json({ success: true, data });
}

export async function campaignAnalytics(req, res) {
  const range = String(req.query.range || '30d');
  const sellerId = req.query.sellerId ? String(req.query.sellerId) : undefined;
  const data = await getCampaignAnalytics(range, sellerId);
  res.json({ success: true, data });
}

export async function shareAnalytics(req, res) {
  const data = await getShareAnalytics(req.query.sellerId ? String(req.query.sellerId) : undefined);
  res.json({ success: true, data });
}

export async function getSettings(req, res) {
  const data = await getGrowthSettings();
  res.json({ success: true, data });
}

export async function patchSettings(req, res) {
  const updated = await updateGrowthSettings(req.body, req.auth.userId);
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'GROWTH_SETTINGS_UPDATED', 'growth_settings', 'global', { keys: Object.keys(req.body) }, req, 'success').catch(()=>{});
  res.json({ success: true, data: updated });
}

export async function sellerCampaigns(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: any = { sellerId: req.auth.userId };
  if (req.query.status) filter.status = String(req.query.status);
  const data = await listCampaigns(filter, page, limit);
  res.json({ success: true, data });
}

export async function topCampaigns(req, res) {
  const metric = String(req.query.metric || 'conversions');
  const page = Number(req.query.page) || 1;
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const sortMap: Record<string, any> = {
    conversions: { 'analytics.conversions': -1 },
    revenue: { 'analytics.revenue': -1 },
    ctr: { 'analytics.clicks': -1 },
    redemptions: { 'analytics.couponRedemptions': -1 },
  };
  const { Campaign } = await import('../models/Campaign.js');
  const sort = sortMap[metric] || sortMap.conversions;
  const campaigns = await Campaign.find({ status: { $in: ['active','completed'] } }).sort(sort).skip((page-1)*limit).limit(limit).lean();
  res.json({ success: true, data: { campaigns, metric } });
}

// Seller's own campaign analytics
export async function sellerAnalytics(req, res) {
  const range = String(req.query.range || '30d');
  const data = await getCampaignAnalytics(range, req.auth.userId);
  const share = await getShareAnalytics(req.auth.userId);
  res.json({ success: true, data: { ...data, shares: share } });
}
