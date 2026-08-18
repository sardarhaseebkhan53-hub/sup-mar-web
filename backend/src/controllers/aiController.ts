import { z } from 'zod';
import { env } from '../config/env.js';
import { checkAiRateLimit } from '../ai/rateLimit.js';
import { detectPromptInjection, looksLikeSecretProbe, sanitizeUserText } from '../ai/promptSecurity.js';
import { handleAiChat } from '../services/aiChatService.js';
import { runAiSearch } from '../services/aiSearchService.js';
import {
  compareListings,
  explainListing,
  extractListingAttributes,
  generateDescription,
  generateTitle,
  listingAssistant,
  listingQuality,
  priceInsight,
  suggestCategoryPath,
} from '../services/aiListingAssistantService.js';
import { RecommendationService, recommendListings } from '../services/recommendationService.js';
import { createSupportTicket, listSupportTickets } from '../services/supportTicketService.js';
import { getConversationForUser, listConversations } from '../services/aiConversationStore.js';
import { assertAiEnabled, ALLOWED_MODELS, getAiSettings, publicAiConfig, updateAiSettings } from '../services/aiSettingsService.js';
import { aiAnalytics, recordAiEvent } from '../services/aiAnalyticsService.js';
import { aiUsageAnalytics } from '../services/aiUsageService.js';
import { AppError } from '../utils/AppError.js';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(env.ai.maxInputChars),
  conversationId: z.string().trim().max(80).optional(),
  listingId: z.string().trim().max(80).optional(),
  listingIds: z.array(z.string().trim().max(80)).max(4).optional(),
  guestKey: z.string().trim().max(80).optional(),
});

const listingIdSchema = z.string().trim().max(80).regex(/^[A-Za-z0-9-]+$/);

const listingContextSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10_000).optional(),
  category: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional(),
  subcategory: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional(),
  condition: z.string().trim().max(40).optional(),
  location: z.object({ city: z.string().trim().max(80).optional(), area: z.string().trim().max(80).optional() }).optional(),
  price: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
  images: z.coerce.number().int().min(0).max(50).optional(),
  attributes: z.record(z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(80).optional(),
});

function rateKey(req: any) {
  return req.auth?.userId || req.ip || 'anon';
}

async function guard(req: any, feature?: 'assistant' | 'search' | 'recommendations' | 'listingAssistant' | 'support' | 'priceInsights' | 'semanticSearch') {
  const settings = await assertAiEnabled(feature);
  const limit = checkAiRateLimit(rateKey(req), { perMinute: settings.requestLimitPerMinute, perDay: settings.requestLimitPerDay });
  if (!limit.ok) throw new AppError(429, 'Too many QAVLIO AI requests. Try again shortly.', 'AI_RATE_LIMITED');
  return { settings, limit };
}

/** Reject prompt-injection and secret-probing attempts before any provider call. */
function assertSafeInput(value: string) {
  const text = sanitizeUserText(value, env.ai.maxInputChars);
  if (detectPromptInjection(text) || looksLikeSecretProbe(text)) {
    throw new AppError(400, 'I can help with QAVLIO listings and search. I cannot change system instructions or share secrets.', 'AI_UNSAFE_INPUT');
  }
  return text;
}

function guestSignalsFrom(req: any) {
  const body = req.body || {};
  const query = req.query || {};
  const listRaw = body.recentListingIds ?? query.recentListingIds;
  const searchRaw = body.recentSearches ?? query.recentSearches;
  const toArray = (value: unknown) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map((item) => sanitizeUserText(String(item), 80))
    .filter(Boolean)
    .slice(0, 12);
  const city = sanitizeUserText(String(body.city ?? query.city ?? ''), 80) || undefined;
  return { recentListingIds: toArray(listRaw), recentSearches: toArray(searchRaw), city };
}

function parseListingContext(body: unknown) {
  const parsed = listingContextSchema.safeParse(body || {});
  if (!parsed.success) throw new AppError(422, 'Check the listing details you sent.', 'VALIDATION_ERROR', parsed.error.flatten());
  return parsed.data;
}

/* ------------------------------------------------------------------- chat */

export async function chat(req, res) {
  const started = Date.now();
  const { settings } = await guard(req, 'assistant');
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Enter a question I can help with.', 'VALIDATION_ERROR', parsed.error.flatten());
  try {
    const result = await handleAiChat({ ...parsed.data, userId: req.auth?.userId || null });
    await recordAiEvent('chat', { userId: req.auth?.userId, durationMs: Date.now() - started, meta: { resultCount: result.reply.resultCount || 0 } });
    res.json({ success: true, data: { ...result, settings: publicAiConfig(settings) } });
  } catch {
    await recordAiEvent('error', { userId: req.auth?.userId, success: false, durationMs: Date.now() - started });
    res.json({ success: true, data: { conversationId: parsed.data.conversationId || '', reply: unavailableReply() } });
  }
}

/* ----------------------------------------------------------------- search */

export async function search(req, res) {
  const started = Date.now();
  const { settings } = await guard(req, 'search');
  const raw = String(req.body?.query ?? req.body?.q ?? '').trim();
  if (!raw || raw.length > 200) throw new AppError(422, 'Enter a search question.', 'VALIDATION_ERROR');
  const query = assertSafeInput(raw);
  try {
    const result = await runAiSearch(query, null, {
      userId: req.auth?.userId || null,
      limit: Math.min(Number(req.body?.limit) || 12, 24),
      semantic: settings.features.semanticSearch !== false,
    });
    await recordAiEvent(result.empty ? 'search_empty' : 'search_hit', { userId: req.auth?.userId, durationMs: Date.now() - started, meta: { total: result.total } });
    res.json({ success: true, data: result });
  } catch {
    await recordAiEvent('error', { userId: req.auth?.userId, success: false, durationMs: Date.now() - started });
    res.json({
      success: true,
      data: {
        empty: true,
        listings: [],
        fallbackSearch: true,
        message: 'QAVLIO AI is temporarily unavailable.',
        actions: [{ type: 'search', label: 'Continue with normal search', href: `/search?q=${encodeURIComponent(query)}` }],
      },
    });
  }
}

/* ---------------------------------------------------------------- compare */

export async function compare(req, res) {
  await guard(req, 'assistant');
  const ids = Array.isArray(req.body?.listingIds) ? req.body.listingIds : [];
  const parsed = z.array(listingIdSchema).min(2).max(4).safeParse(ids);
  if (!parsed.success) throw new AppError(422, 'Select 2 to 4 listings to compare.', 'VALIDATION_ERROR');
  const data = await compareListings(parsed.data, { maxItems: 4 });
  await recordAiEvent('compare', { userId: req.auth?.userId, meta: { count: parsed.data.length } });
  res.json({ success: true, data });
}

/* -------------------------------------------------------- recommendations */

export async function recommendations(req, res) {
  await guard(req, 'recommendations');
  const data = await recommendListings({
    userId: req.auth?.userId || null,
    currentSearch: req.body?.query ? sanitizeUserText(String(req.body.query), 120) : undefined,
    category: req.body?.category ? sanitizeUserText(String(req.body.category), 80) : undefined,
    limit: Number(req.body?.limit) || 8,
  });
  await recordAiEvent('recommend', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function recommendationFeed(req, res) {
  await guard(req, 'recommendations');
  const started = Date.now();
  const data = await RecommendationService.getHomeSections({
    userId: req.auth?.userId || null,
    city: req.query?.city ? sanitizeUserText(String(req.query.city), 80) : undefined,
    guestSignals: guestSignalsFrom(req),
    limit: Math.min(Number(req.query?.limit) || 8, 12),
  });
  await recordAiEvent('recommend', { userId: req.auth?.userId, durationMs: Date.now() - started });
  res.json({ success: true, data });
}

export async function similarListings(req, res) {
  await guard(req, 'recommendations');
  const parsed = listingIdSchema.safeParse(String(req.params.listingId || ''));
  if (!parsed.success) throw new AppError(422, 'Provide a valid listing id.', 'VALIDATION_ERROR');
  const data = await RecommendationService.getSimilarListings(parsed.data, { limit: Math.min(Number(req.query?.limit) || 8, 24) });
  await recordAiEvent('recommend_similar', { userId: req.auth?.userId, meta: { count: data.listings.length } });
  res.json({ success: true, data });
}

export async function trendingListings(req, res) {
  await guard(req, 'recommendations');
  const data = await RecommendationService.getTrending({
    limit: Math.min(Number(req.query?.limit) || 8, 24),
    city: req.query?.city ? sanitizeUserText(String(req.query.city), 80) : undefined,
    categorySlug: req.query?.category ? sanitizeUserText(String(req.query.category), 80) : undefined,
  });
  await recordAiEvent('recommend_trending', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

/* ------------------------------------------------------- listing assistant */

export async function listingAssist(req, res) {
  await guard(req, 'listingAssistant');
  if (req.body?.listingId && req.body?.action === 'explain') {
    res.json({ success: true, data: await explainListing(String(req.body.listingId)) });
    return;
  }
  const data = await listingAssistant({
    action: String(req.body?.action || 'improve'),
    title: req.body?.title,
    description: req.body?.description,
    category: req.body?.category,
    facts: req.body?.facts && typeof req.body.facts === 'object' ? req.body.facts : undefined,
  });
  await recordAiEvent('listing_assistant', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function listingTitle(req, res) {
  await guard(req, 'listingAssistant');
  const context = parseListingContext(req.body);
  if (context.title) assertSafeInput(context.title);
  if (context.description) assertSafeInput(context.description);
  const data = await generateTitle({ ...context, userId: req.auth?.userId || null });
  await recordAiEvent('listing_title', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function listingDescription(req, res) {
  await guard(req, 'listingAssistant');
  const context = parseListingContext(req.body);
  if (context.title) assertSafeInput(context.title);
  if (context.description) assertSafeInput(context.description);
  const data = await generateDescription({
    ...context,
    location: context.location?.city,
    userId: req.auth?.userId || null,
  });
  await recordAiEvent('listing_description', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function listingAttributes(req, res) {
  await guard(req, 'listingAssistant');
  const context = parseListingContext(req.body);
  const data = await extractListingAttributes({
    title: context.title,
    description: context.description,
    category: context.category,
    existing: context.attributes,
    userId: req.auth?.userId || null,
  });
  await recordAiEvent('listing_attributes', { userId: req.auth?.userId, meta: { count: data.attributes.length } });
  res.json({ success: true, data });
}

export async function listingCategory(req, res) {
  await guard(req, 'listingAssistant');
  const context = parseListingContext(req.body);
  const data = await suggestCategoryPath({
    title: context.title,
    description: context.description,
    attributes: context.attributes,
    userId: req.auth?.userId || null,
  });
  await recordAiEvent('listing_category', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function listingPriceInsight(req, res) {
  await guard(req, 'priceInsights');
  const context = parseListingContext(req.body);
  const data = await priceInsight({
    category: context.category,
    subcategory: context.subcategory,
    brand: context.brand || (context.attributes?.brand !== undefined ? String(context.attributes.brand) : undefined),
    model: context.model || (context.attributes?.model !== undefined ? String(context.attributes.model) : undefined),
    condition: context.condition,
    location: context.location?.city,
    price: context.price,
    title: context.title,
  });
  await recordAiEvent('price_insight', { userId: req.auth?.userId, meta: { available: data.available } });
  res.json({ success: true, data });
}

export async function listingQualityScore(req, res) {
  await guard(req, 'listingAssistant');
  const context = parseListingContext(req.body);
  const data = listingQuality({
    title: context.title,
    description: context.description,
    category: context.category,
    subcategory: context.subcategory,
    images: context.images,
    attributes: context.attributes,
    price: context.price,
    condition: context.condition,
    location: context.location,
  });
  await recordAiEvent('listing_quality', { userId: req.auth?.userId, meta: { score: data.score } });
  res.json({ success: true, data });
}

/* ---------------------------------------------------------------- support */

export async function support(req, res) {
  await guard(req, 'support');
  if (!req.auth?.userId) throw new AppError(401, 'Sign in to create a support request.', 'AUTH_REQUIRED');
  const ticket = await createSupportTicket(req.auth.userId, {
    conversationId: req.body?.conversationId,
    category: String(req.body?.category || 'other'),
    description: String(req.body?.description || ''),
    priority: req.body?.priority,
  });
  await recordAiEvent('support', { userId: req.auth.userId });
  res.status(201).json({ success: true, data: { ticket, message: 'Connect with QAVLIO Support — your request is open.' } });
}

export async function myTickets(req, res) {
  if (!req.auth?.userId) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  res.json({ success: true, data: await listSupportTickets(req.auth.userId) });
}

export async function conversations(req, res) {
  if (!req.auth?.userId) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  res.json({ success: true, data: await listConversations(req.auth.userId) });
}

export async function conversation(req, res) {
  const record = await getConversationForUser(req.params.id, req.auth?.userId || null, req.query.guestKey ? String(req.query.guestKey) : null);
  if (!record) throw new AppError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
  res.json({ success: true, data: record });
}

export async function status(_req, res) {
  res.json({ success: true, data: publicAiConfig(await getAiSettings()) });
}

/* ------------------------------------------------------------------ admin */

export async function adminAiSettings(_req, res) {
  const settings = await getAiSettings();
  res.json({ success: true, data: { ...settings, hasServerKey: Boolean(env.ai.apiKey), envProvider: env.ai.provider, allowedModels: ALLOWED_MODELS } });
}

export async function adminUpdateAiSettings(req, res) {
  res.json({ success: true, data: await updateAiSettings(req.auth.userId, req.body) });
}

export async function adminAiAnalytics(req, res) {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const [features, usage] = await Promise.all([aiAnalytics(days), aiUsageAnalytics(days)]);
  res.json({ success: true, data: { ...features, usage } });
}

function unavailableReply() {
  return {
    text: 'QAVLIO AI is temporarily unavailable.',
    unavailable: true,
    actions: [{ type: 'search', label: 'Continue with normal search', href: '/search' }],
    suggestions: ['Browse categories', 'Open Help Center'],
  };
}
