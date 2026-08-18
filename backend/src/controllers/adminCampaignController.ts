import { createCampaign, updateCampaign, listCampaigns, getCampaignById, expireCampaigns, scheduleCampaigns } from '../services/campaignService.js';
import { getCampaignFunnel } from '../services/marketingEventService.js';

export async function list(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: any = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.scope) filter.scope = String(req.query.scope);
  if (req.query.audience) filter.audience = String(req.query.audience);
  if (req.query.q) filter.q = String(req.query.q);
  if (req.query.sellerId) filter.sellerId = String(req.query.sellerId);
  const data = await listCampaigns(filter, page, limit);
  res.json({ success: true, data });
}

export async function create(req, res) {
  const campaign = await createCampaign(req.body, req.auth.userId);
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'ADMIN_CAMPAIGN_CREATED', 'campaign', String(campaign._id || campaign.id), { name: campaign.name, slug: campaign.seo?.slug }, req, 'success').catch(()=>{});
  res.status(201).json({ success: true, data: campaign });
}

export async function update(req, res) {
  const { id } = req.params;
  const campaign = await updateCampaign(id, req.body, { userId: req.auth.userId, roles: req.auth.roles });
  const { logAdminActivity } = await import('../services/adminActivityService.js');
  await logAdminActivity(req.auth.userId, 'ADMIN_CAMPAIGN_UPDATED', 'campaign', id, { updates: Object.keys(req.body), status: (campaign as any).status }, req, 'success').catch(()=>{});
  res.json({ success: true, data: campaign });
}

export async function getById(req, res) {
  const { id } = req.params;
  const campaign = await getCampaignById(id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });
  const funnel = await getCampaignFunnel(id);
  res.json({ success: true, data: { campaign, funnel } });
}

export async function adminExpire(req, res) {
  const expired = await expireCampaigns();
  const scheduled = await scheduleCampaigns();
  res.json({ success: true, data: { expired, scheduled, message: 'Campaign statuses synchronized' } });
}
