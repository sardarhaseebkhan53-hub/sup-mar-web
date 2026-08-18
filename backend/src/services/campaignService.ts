// @ts-nocheck
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Campaign } from '../models/Campaign.js';
import { AppError } from '../utils/AppError.js';
import { getGrowthSettings } from './growthSettingsService.js';

const memoryCampaigns = new Map<string, any>();
function isConnected() { return mongoose.connection.readyState === 1; }

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `campaign-${crypto.randomBytes(3).toString('hex')}`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (attempt < 5) {
    if (isConnected()) {
      const exists = await Campaign.findOne({ 'seo.slug': slug }).lean();
      if (!exists) return slug;
    } else {
      const exists = [...memoryCampaigns.values()].find(c => c.seo?.slug === slug);
      if (!exists) return slug;
    }
    attempt += 1;
    slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createCampaign(input: any, createdBy: string) {
  const now = new Date();
  const startAt = input.startAt ? new Date(input.startAt) : now;
  const endAt = input.endAt ? new Date(input.endAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (endAt <= startAt) throw new AppError(422, 'Campaign end date must be after start date', 'CAMPAIGN_DATE_INVALID');

  let slug = input.slug ? slugify(input.slug) : slugify(input.name);
  slug = await ensureUniqueSlug(slug);

  const doc: any = {
    name: input.name,
    description: input.description || '',
    banner: {
      imageUrl: input.banner?.imageUrl || input.bannerImage || '',
      mobileImageUrl: input.banner?.mobileImageUrl || '',
      ctaText: input.banner?.ctaText || 'Explore',
      ctaLink: input.banner?.ctaLink || '',
      placement: input.banner?.placement || 'home',
    },
    startAt,
    endAt,
    audience: input.audience || 'all',
    couponId: input.couponId || null,
    targetCategories: input.targetCategories || [],
    targetCategorySlugs: input.targetCategorySlugs || [],
    targetListings: input.targetListings || [],
    status: input.status || 'draft',
    seo: {
      title: input.seo?.title || input.name,
      description: input.seo?.description || (input.description || '').slice(0, 160),
      slug,
      ogImage: input.seo?.ogImage || input.banner?.imageUrl || '',
    },
    analytics: { views: 0, clicks: 0, couponApplications: 0, couponRedemptions: 0, listingsViewed: 0, leads: 0, conversions: 0, revenue: 0, shares: 0 },
    createdBy,
    sellerId: input.sellerId || null,
    scope: input.scope || (input.sellerId ? 'seller' : 'platform'),
    featured: Boolean(input.featured),
    priority: input.priority ?? 10,
    isPublic: input.isPublic ?? true,
    enabled: input.enabled ?? true,
    frequency: input.frequency || { dailyLimit: 2, weeklyLimit: 10, cooldownHours: 24 },
  };

  if (isConnected()) {
    const created = await Campaign.create(doc);
    return created.toObject();
  } else {
    const id = crypto.randomUUID();
    const record = { _id: id, id, ...doc, createdAt: new Date(), updatedAt: new Date() };
    memoryCampaigns.set(id, record);
    return record;
  }
}

export async function updateCampaign(campaignId: string, input: any, requester: { userId: string; roles: string[] }) {
  if (isConnected()) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
    const isAdmin = requester.roles.some(r => ['admin','super_admin','moderator','finance'].includes(r));
    const isOwner = String(campaign.createdBy) === String(requester.userId) || (campaign.sellerId && String(campaign.sellerId) === String(requester.userId));
    if (!isAdmin && !isOwner) throw new AppError(403, 'You cannot edit this campaign', 'FORBIDDEN');
    if (input.sellerId && campaign.scope !== 'platform' && String(campaign.sellerId) !== String(requester.userId) && !isAdmin) throw new AppError(403, 'Cannot change campaign ownership', 'FORBIDDEN');

    const updatable = ['name','description','banner','startAt','endAt','audience','couponId','targetCategories','targetCategorySlugs','targetListings','status','seo','featured','priority','isPublic','enabled','frequency','scope','sellerId'];
    for (const key of updatable) {
      if (key in input) {
        if (key === 'seo' && input.seo) {
          if (input.seo.slug) {
            const newSlug = slugify(input.seo.slug);
            if (newSlug !== campaign.seo.slug) {
              const unique = await ensureUniqueSlug(newSlug);
              campaign.seo.slug = unique;
            }
          }
          if (input.seo.title) campaign.seo.title = input.seo.title;
          if (input.seo.description) campaign.seo.description = input.seo.description;
          if (input.seo.ogImage) campaign.seo.ogImage = input.seo.ogImage;
        } else if (key === 'banner' && input.banner) {
          campaign.banner = { ...campaign.banner, ...input.banner };
        } else {
          (campaign as any)[key] = input[key];
        }
      }
    }
    if (campaign.endAt <= campaign.startAt) throw new AppError(422, 'Campaign end date must be after start date', 'CAMPAIGN_DATE_INVALID');
    await campaign.save();
    return campaign.toObject();
  } else {
    const c = memoryCampaigns.get(campaignId);
    if (!c) throw new AppError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
    Object.assign(c, input, { updatedAt: new Date() });
    if (input.seo?.slug) c.seo.slug = slugify(input.seo.slug);
    return c;
  }
}

export async function getCampaignBySlug(slug: string, includeInactive = false) {
  if (isConnected()) {
    const query: any = { 'seo.slug': slug.toLowerCase() };
    if (!includeInactive) query.status = 'active';
    let campaign = await Campaign.findOne(query).lean();
    if (!campaign) return null;
    const now = new Date();
    if (!includeInactive) {
      if (campaign.startAt && new Date(campaign.startAt) > now) return null;
      if (campaign.endAt && new Date(campaign.endAt) < now) return null;
      if (!campaign.enabled) return null;
    }
    return campaign;
  } else {
    const c = [...memoryCampaigns.values()].find(x => x.seo.slug === slug.toLowerCase());
    if (!c) return null;
    if (!includeInactive && c.status !== 'active') return null;
    return c;
  }
}

export async function getCampaignById(id: string) {
  if (isConnected()) return Campaign.findById(id).lean();
  return memoryCampaigns.get(id) || null;
}

export async function listCampaigns(filter: any = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const query: any = {};
  if (filter.status) query.status = filter.status;
  if (filter.scope) query.scope = filter.scope;
  if (filter.sellerId) query.sellerId = filter.sellerId;
  if (filter.audience) query.audience = filter.audience;
  if (filter.q) query.name = { $regex: filter.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (filter.publicOnly) { query.isPublic = true; query.status = 'active'; query.enabled = true; }
  if (filter.activeOnly) {
    query.status = 'active';
    query.enabled = true;
    const now = new Date();
    query.startAt = { $lte: now };
    query.endAt = { $gte: now };
  }

  if (isConnected()) {
    const [rows, total] = await Promise.all([
      Campaign.find(query).sort({ priority: -1, startAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(query),
    ]);
    return { campaigns: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  let all = [...memoryCampaigns.values()].filter(c => {
    if (filter.status && c.status !== filter.status) return false;
    if (filter.scope && c.scope !== filter.scope) return false;
    if (filter.sellerId && String(c.sellerId) !== String(filter.sellerId)) return false;
    if (filter.q && !c.name.toLowerCase().includes(filter.q.toLowerCase())) return false;
    if (filter.activeOnly && c.status !== 'active') return false;
    return true;
  }).sort((a,b)=> (b.priority - a.priority) || (+b.startAt - +a.startAt));
  return { campaigns: all.slice(skip, skip + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function expireCampaigns() {
  if (!isConnected()) return 0;
  const now = new Date();
  const result = await Campaign.updateMany({ status: { $in: ['active','scheduled'] }, endAt: { $lt: now } }, { $set: { status: 'completed' } });
  return result.modifiedCount || 0;
}

export async function scheduleCampaigns() {
  if (!isConnected()) return 0;
  const now = new Date();
  const result = await Campaign.updateMany({ status: 'scheduled', startAt: { $lte: now }, endAt: { $gte: now } }, { $set: { status: 'active' } });
  return result.modifiedCount || 0;
}

export async function deleteCampaign(campaignId: string) {
  if (isConnected()) {
    const res = await Campaign.findByIdAndUpdate(campaignId, { $set: { status: 'archived', enabled: false } }, { new: true }).lean();
    return res;
  }
  const c = memoryCampaigns.get(campaignId);
  if (c) { c.status = 'archived'; c.enabled = false; }
  return c;
}

export function resetCampaignMemory() {
  memoryCampaigns.clear();
}
