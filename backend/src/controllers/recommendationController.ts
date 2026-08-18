import { z } from 'zod';
import { checkAiRateLimit } from '../ai/rateLimit.js';
import { assertAiEnabled } from '../services/aiSettingsService.js';
import { recordAiEvent } from '../services/aiAnalyticsService.js';
import { getRecommendationService } from '../services/recommendationService.js';
import { AppError } from '../utils/AppError.js';

const guestSignalsSchema = z.object({
  categories: z.array(z.string().trim().regex(/^[a-z0-9-]{1,60}$/)).max(8).optional(),
  searches: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  viewed: z.array(z.string().trim().min(2).max(24)).max(12).optional(),
  location: z.string().trim().max(60).optional(),
});

const sectionsQuery = z.object({
  location: z.string().trim().max(60).optional(),
  category: z.string().trim().regex(/^[a-z0-9-]{1,60}$/).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

async function guard(req: any) {
  const settings = await assertAiEnabled('recommendations');
  const key = req.auth?.userId || req.query?.guestKey || req.ip || 'anon';
  const limit = checkAiRateLimit(key, { perMinute: Math.max(settings.requestLimitPerMinute, 30), perDay: settings.requestLimitPerDay });
  if (!limit.ok) throw new AppError(429, 'Too many requests. Try again shortly.', 'AI_RATE_LIMITED');
}

function guestSignalsFrom(req: any) {
  const raw: Record<string, unknown> = { ...req.query, ...(req.body || {}) };
  let signals = raw.guestSignals;
  if (typeof signals === 'string') {
    try { signals = JSON.parse(signals); } catch { signals = undefined; }
  }
  if (signals && typeof signals === 'object') {
    const parsed = guestSignalsSchema.safeParse(signals);
    if (parsed.success) return parsed.data;
  }
  if (typeof raw.guestCategories === 'string') {
    const categories = String(raw.guestCategories).split(',').map((item: string) => item.trim()).filter(Boolean).slice(0, 8).filter((item: string) => /^[a-z0-9-]{1,60}$/.test(item));
    if (categories.length) return { categories };
  }
  return undefined;
}

/** GET /api/recommendations — homepage sections: for-you / because-viewed / because-searched / trending. */
export async function sections(req, res) {
  const started = Date.now();
  await guard(req);
  const parsed = sectionsQuery.safeParse(req.query);
  const service = getRecommendationService();
  const data = await service.getForUser({
    userId: req.auth?.userId || null,
    guestKey: typeof req.query.guestKey === 'string' ? req.query.guestKey.slice(0, 80) : null,
    guestSignals: guestSignalsFrom(req),
    location: parsed.success ? parsed.data.location : undefined,
    category: parsed.success ? parsed.data.category : undefined,
    limit: parsed.success ? parsed.data.limit : undefined,
  });
  await recordAiEvent('recommend', { userId: req.auth?.userId, feature: 'recommendations', durationMs: Date.now() - started, meta: { sections: data.sections.length } });
  res.json({ success: true, data });
}

/** GET /api/recommendations/trending */
export async function trending(req, res) {
  const started = Date.now();
  await guard(req);
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 12);
  const city = typeof req.query.location === 'string' ? String(req.query.location).slice(0, 60) : undefined;
  const service = getRecommendationService();
  const results = await service.getTrending(limit, city);
  const listings = results.map((item) => item.listing);
  await recordAiEvent('recommend', { userId: req.auth?.userId, feature: 'recommendations', durationMs: Date.now() - started, meta: { scope: 'trending', count: listings.length } });
  res.json({ success: true, data: { listings, matched: results.map((item) => ({ publicId: item.listing.publicId, reasons: item.reasons })), personalized: false, basis: 'Built from real QAVLIO view activity.' } });
}

/** GET /api/recommendations/similar/:listingId */
export async function similar(req, res) {
  const started = Date.now();
  await guard(req);
  const listingId = String(req.params.listingId || '').slice(0, 24);
  const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 12);
  const location = typeof req.query.location === 'string' ? req.query.location.slice(0, 60) : undefined;
  const service = getRecommendationService();
  const results = await service.getSimilarListings(listingId, limit, location);
  if (!results.length) {
    await recordAiEvent('recommend', { userId: req.auth?.userId, feature: 'recommendations', durationMs: Date.now() - started, meta: { scope: 'similar', listingId, empty: true } });
    throw new AppError(404, 'I couldn\u2019t find that listing, so I can\u2019t suggest similar items.', 'LISTING_NOT_FOUND');
  }
  await recordAiEvent('recommend', { userId: req.auth?.userId, feature: 'recommendations', durationMs: Date.now() - started, meta: { scope: 'similar', listingId, count: results.length } });
  res.json({
    success: true,
    data: {
      listings: results.map((item) => item.listing),
      matched: results.map((item) => ({ publicId: item.listing.publicId, score: item.score, reasons: item.reasons })),
      basis: 'Matched from live QAVLIO listings in the same category by content, price, and location.',
    },
  });
}
