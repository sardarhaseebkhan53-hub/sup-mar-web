// @ts-nocheck
import { getCampaignBySlug, listCampaigns } from '../services/campaignService.js';
import { trackEvent, getCampaignFunnel } from '../services/marketingEventService.js';
import { AppError } from '../utils/AppError.js';
import { Listing } from '../models/Listing.js';

export async function publicList(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const filter: any = { publicOnly: true, activeOnly: true };
  if (req.query.audience) filter.audience = String(req.query.audience);
  const data = await listCampaigns(filter, page, limit);
  res.json({ success: true, data });
}

export async function getBySlug(req, res) {
  const { slug } = req.params;
  const campaign = await getCampaignBySlug(slug, false);
  if (!campaign) throw new AppError(404, 'Campaign not found or not active', 'CAMPAIGN_NOT_FOUND');

  // Track view
  const userId = req.auth?.userId || null;
  await trackEvent({ type: 'campaign_view', userId, campaignId: String(campaign._id || campaign.id), source: 'campaign_landing', metadata: { slug } }, req).catch(()=>{});

  // Load featured listings
  let listings: any[] = [];
  if (campaign.targetListings && campaign.targetListings.length > 0) {
    try {
      listings = await Listing.find({ _id: { $in: campaign.targetListings }, status: 'published', moderationState: { $ne: 'Removed' } }).select('_id publicId title slug price currency coverImage categorySlug viewCount').limit(24).lean();
    } catch {}
  } else if (campaign.targetCategorySlugs && campaign.targetCategorySlugs.length > 0) {
    try {
      listings = await Listing.find({ categorySlug: { $in: campaign.targetCategorySlugs }, status: 'published' }).sort({ publishedAt: -1 }).limit(24).select('_id publicId title slug price currency coverImage categorySlug').lean();
    } catch {}
  }

  res.json({ success: true, data: { campaign, listings } });
}

export async function trackView(req, res) {
  const { id } = req.params;
  const { trackEvent } = await import('../services/marketingEventService.js');
  const userId = req.auth?.userId || null;
  await trackEvent({ type: 'campaign_view', userId, campaignId: id }, req);
  res.json({ success: true });
}

export async function trackClick(req, res) {
  const { id } = req.params;
  const { type, listingId } = req.body || {};
  const userId = req.auth?.userId || null;
  const eventType = type === 'listing_view' ? 'listing_view' : type === 'cta_click' ? 'cta_click' : 'cta_click';
  await trackEvent({ type: eventType, userId, campaignId: id, listingId: listingId || null, metadata: req.body }, req);
  res.json({ success: true });
}

export async function funnel(req, res) {
  const { id } = req.params;
  const data = await getCampaignFunnel(id);
  res.json({ success: true, data });
}

export async function countdown(req, res) {
  const { slug } = req.params;
  const campaign = await getCampaignBySlug(slug, true);
  if (!campaign) throw new AppError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  const now = new Date();
  const end = new Date(campaign.endAt);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const valid = end > now && campaign.status === 'active';
  res.json({ success: true, data: { valid, endAt: campaign.endAt, countdown: { days, hours, minutes, seconds, totalMs: diff }, status: campaign.status } });
}
