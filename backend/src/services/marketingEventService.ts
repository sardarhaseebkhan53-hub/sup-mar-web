// @ts-nocheck
import mongoose from 'mongoose';
import { MarketingEvent } from '../models/MarketingEvent.js';
import { Campaign } from '../models/Campaign.js';
import { AppError } from '../utils/AppError.js';
import { sha256 } from '../utils/security.js';

const memoryEvents = new Map<string, any>();
function isConnected() { return mongoose.connection.readyState === 1; }

function getMeta(req: any) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
  return { ipHash: sha256(String(ip)), userAgent: (req?.get?.('user-agent') || '').slice(0, 300) };
}

export async function trackEvent(input: {
  type: string;
  userId?: string | null;
  anonymousId?: string | null;
  campaignId?: string | null;
  couponId?: string | null;
  listingId?: string | null;
  referralCodeId?: string | null;
  referralId?: string | null;
  source?: string;
  medium?: string;
  placement?: string;
  metadata?: any;
}, req?: any) {
  const { ipHash, userAgent } = getMeta(req);
  const payload: any = {
    type: input.type,
    userId: input.userId || null,
    anonymousId: input.anonymousId || null,
    campaignId: input.campaignId || null,
    couponId: input.couponId || null,
    listingId: input.listingId || null,
    referralCodeId: input.referralCodeId || null,
    referralId: input.referralId || null,
    source: input.source || '',
    medium: input.medium || '',
    placement: input.placement || '',
    metadata: input.metadata || {},
    ipHash,
    userAgent,
    timestamp: new Date(),
  };

  if (isConnected()) {
    const ev = await MarketingEvent.create(payload);
    // Update campaign analytics atomically
    if (payload.campaignId) {
      const fieldMap: Record<string, string> = {
        campaign_view: 'analytics.views',
        cta_click: 'analytics.clicks',
        coupon_apply: 'analytics.couponApplications',
        coupon_redeem: 'analytics.couponRedemptions',
        listing_view: 'analytics.listingsViewed',
        eligible_transaction: 'analytics.conversions',
        share: 'analytics.shares',
      };
      const key = fieldMap[input.type];
      if (key) await Campaign.updateOne({ _id: payload.campaignId }, { $inc: { [key]: 1 } });
      else if (input.type === 'impression') await Campaign.updateOne({ _id: payload.campaignId }, { $inc: { 'analytics.views': 1 } });
    }
    return ev.toObject();
  } else {
    const id = Math.random().toString(36).slice(2);
    const doc = { _id: id, id, ...payload, createdAt: new Date() };
    memoryEvents.set(id, doc);
    return doc;
  }
}

export async function listEvents(filter: any = {}, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const query: any = {};
  if (filter.type) query.type = filter.type;
  if (filter.campaignId) query.campaignId = filter.campaignId;
  if (filter.userId) query.userId = filter.userId;
  if (filter.couponId) query.couponId = filter.couponId;
  if (filter.listingId) query.listingId = filter.listingId;

  if (isConnected()) {
    const [rows, total] = await Promise.all([
      MarketingEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      MarketingEvent.countDocuments(query),
    ]);
    return { events: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  let all = [...memoryEvents.values()].filter(e => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.campaignId && String(e.campaignId) !== String(filter.campaignId)) return false;
    return true;
  }).sort((a,b)=>+b.timestamp - +a.timestamp);
  return { events: all.slice(skip, skip + limit), pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } };
}

export async function getCampaignFunnel(campaignId: string) {
  if (!isConnected()) {
    const evs = [...memoryEvents.values()].filter(e => String(e.campaignId) === String(campaignId));
    const count = (type: string) => evs.filter(e => e.type === type).length;
    const impression = count('impression') || count('campaign_view') || evs.length;
    const views = count('campaign_view');
    const listingViews = count('listing_view');
    const cta = count('cta_click');
    const couponApply = count('coupon_apply');
    const couponRedeem = count('coupon_redeem');
    const conversions = count('eligible_transaction');
    return { impression, campaignVisit: views, listingView: listingViews, cta, couponApply, couponRedeem, conversion: conversions };
  }
  const pipeline = [
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ];
  const agg = await MarketingEvent.aggregate(pipeline);
  const map = Object.fromEntries(agg.map((r: any) => [r._id, r.count]));
  return {
    impression: map['impression'] || map['campaign_view'] || 0,
    campaignVisit: map['campaign_view'] || 0,
    listingView: map['listing_view'] || 0,
    cta: map['cta_click'] || 0,
    couponApply: map['coupon_apply'] || 0,
    couponRedeem: map['coupon_redeem'] || 0,
    conversion: map['eligible_transaction'] || 0,
  };
}

export function resetMarketingMemory() {
  memoryEvents.clear();
}
