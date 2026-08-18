import { z } from 'zod';
import { env } from '../config/env.js';
import { checkAiRateLimit } from '../ai/rateLimit.js';
import { handleAiChat } from '../services/aiChatService.js';
import { runAiSearch } from '../services/aiSearchService.js';
import { compareListings, explainListing, listingAssistant, priceInsight, qualityScore, suggestAttributes } from '../services/aiListingAssistantService.js';
import { recommendListings } from '../services/recommendationService.js';
import { createSupportTicket, listSupportTickets } from '../services/supportTicketService.js';
import { getConversationForUser, listConversations } from '../services/aiConversationStore.js';
import { assertAiEnabled, getAiSettings, publicAiConfig, updateAiSettings } from '../services/aiSettingsService.js';
import { aiAnalytics, recordAiEvent } from '../services/aiAnalyticsService.js';
import { AppError } from '../utils/AppError.js';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(env.ai.maxInputChars),
  conversationId: z.string().trim().max(80).optional(),
  listingId: z.string().trim().max(80).optional(),
  listingIds: z.array(z.string().trim().max(80)).max(3).optional(),
  guestKey: z.string().trim().max(80).optional(),
});

const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
}).strict();

const guestSignalsSchema = z.object({
  categories: z.array(z.string().trim().regex(/^[a-z0-9-]{1,60}$/)).max(8).optional(),
  searches: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  viewed: z.array(z.string().trim().min(2).max(24)).max(12).optional(),
  location: z.string().trim().max(60).optional(),
}).optional();

const recommendationSchema = z.object({
  guestKey: z.string().trim().max(80).optional(),
  guestSignals: guestSignalsSchema,
  location: z.string().trim().max(60).optional(),
  category: z.string().trim().regex(/^[a-z0-9-]{1,60}$/).optional(),
  query: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(12).optional(),
}).strict();

function rateKey(req: any) {
  return req.auth?.userId || req.body?.guestKey || req.ip || 'anon';
}

type GuardFeature = 'assistant' | 'search' | 'recommendations' | 'listingAssistant' | 'priceInsights' | 'support';

async function guard(req: any, feature?: GuardFeature) {
  const settings = await assertAiEnabled(feature);
  const limit = checkAiRateLimit(rateKey(req), { perMinute: settings.requestLimitPerMinute, perDay: settings.requestLimitPerDay });
  if (!limit.ok) throw new AppError(429, 'Too many QAVLIO AI requests. Try again shortly.', 'AI_RATE_LIMITED');
  return settings;
}

async function track(req: any, type: string, started: number, extra: Record<string, unknown> = {}) {
  const settings = await getAiSettings().catch(() => null);
  await recordAiEvent(type, {
    userId: req.auth?.userId,
    durationMs: Date.now() - started,
    provider: settings?.provider,
    model: settings?.model,
    ...extra,
  });
}

export async function chat(req, res) {
  const started = Date.now();
  const settings = await guard(req, 'assistant');
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Enter a question I can help with.', 'VALIDATION_ERROR', parsed.error.flatten());
  try {
    const result = await handleAiChat({ ...parsed.data, userId: req.auth?.userId || null });
    await track(req, 'chat', started, { feature: 'assistant', meta: { resultCount: result.reply.resultCount || 0 } });
    res.json({ success: true, data: { ...result, settings: publicAiConfig(settings) } });
  } catch {
    await recordAiEvent('error', { userId: req.auth?.userId, feature: 'assistant', success: false, durationMs: Date.now() - started });
    res.json({ success: true, data: { conversationId: parsed.data.conversationId || '', reply: unavailableReply() } });
  }
}

export async function search(req, res) {
  const started = Date.now();
  await guard(req, 'search');
  const parsed = searchSchema.safeParse({ query: req.body?.query ?? req.body?.q });
  if (!parsed.success) throw new AppError(422, 'Enter a search question.', 'VALIDATION_ERROR');
  try {
    const result = await runAiSearch(parsed.data.query);
    await track(req, result.empty ? 'search_empty' : 'search_hit', started, { feature: 'search', cached: Boolean((result as any).cached), meta: { total: result.total } });
    res.json({ success: true, data: result });
  } catch {
    await recordAiEvent('error', { userId: req.auth?.userId, feature: 'search', success: false, durationMs: Date.now() - started });
    res.json({ success: true, data: { empty: true, listings: [], fallbackSearch: true, message: 'QAVLIO AI is temporarily unavailable.', actions: [{ type: 'search', label: 'Continue with normal search', href: `/search?q=${encodeURIComponent(parsed.data.query)}` }] } });
  }
}

export async function compare(req, res) {
  const started = Date.now();
  await guard(req, 'assistant');
  const ids = Array.isArray(req.body?.listingIds) ? req.body.listingIds : [];
  const data = await compareListings(ids);
  await track(req, 'compare', started, { feature: 'assistant', meta: { count: ids.length } });
  res.json({ success: true, data });
}

export async function recommendations(req, res) {
  const started = Date.now();
  await guard(req, 'recommendations');
  const parsed = recommendationSchema.safeParse({ guestKey: req.body?.guestKey, guestSignals: req.body?.guestSignals, location: req.body?.location, category: req.body?.category, query: req.body?.query, limit: Number(req.body?.limit) || undefined });
  const data = await recommendListings({
    userId: req.auth?.userId || null,
    guestKey: parsed.success ? parsed.data.guestKey : undefined,
    guestSignals: parsed.success ? parsed.data.guestSignals : undefined,
    location: parsed.success ? parsed.data.location : undefined,
    currentSearch: req.body?.query,
    category: req.body?.category,
    limit: Number(req.body?.limit) || 8,
  });
  await track(req, 'recommend', started, { feature: 'recommendations', meta: { count: data.listings.length } });
  res.json({ success: true, data });
}

export async function listingAssist(req, res) {
  const started = Date.now();
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
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: data.action } });
  res.json({ success: true, data });
}

/* -------------------- Phase 16 dedicated listing assistant endpoints (§60) -------------------- */

const listingInputSchema = z.object({
  text: z.string().trim().max(2000).optional(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  category: z.string().trim().regex(/^[a-z0-9-]{1,60}$/).optional(),
  subcategory: z.string().trim().regex(/^[a-z0-9-]{1,60}$/).optional(),
  condition: z.string().trim().max(30).optional(),
  price: z.number().min(0).max(1_000_000_000_000).optional(),
  imageCount: z.number().int().min(0).max(40).optional(),
  attributes: z.record(z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
  location: z.string().trim().max(80).optional(),
  excludeListingId: z.string().trim().max(24).optional(),
}).strict();

export async function listingTitle(req, res) {
  const started = Date.now();
  await guard(req, 'listingAssistant');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide the current title details.', 'VALIDATION_ERROR');
  const data = await listingAssistant({ action: 'title', title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, facts: normalizeFacts(parsed.data) });
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: 'title' } });
  res.json({ success: true, data });
}

export async function listingDescription(req, res) {
  const started = Date.now();
  await guard(req, 'listingAssistant');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide the listing details you have.', 'VALIDATION_ERROR');
  const data = await listingAssistant({ action: 'description', title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, facts: normalizeFacts(parsed.data) });
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: 'description' } });
  res.json({ success: true, data });
}

export async function listingAttributes(req, res) {
  const started = Date.now();
  await guard(req, 'listingAssistant');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide the item text.', 'VALIDATION_ERROR');
  const data = await suggestAttributes(parsed.data.text || [parsed.data.title, parsed.data.description].filter(Boolean).join(' '));
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: 'attributes', count: Object.keys(data.attributes).length } });
  res.json({ success: true, data });
}

export async function listingCategory(req, res) {
  const started = Date.now();
  await guard(req, 'listingAssistant');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide the item text.', 'VALIDATION_ERROR');
  const data = await listingAssistant({ action: 'category', title: parsed.data.title, description: parsed.data.description, category: parsed.data.category });
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: 'category' } });
  res.json({ success: true, data });
}

export async function listingPriceInsight(req, res) {
  const started = Date.now();
  await guard(req, 'priceInsights');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide a category for the price insight.', 'VALIDATION_ERROR');
  const data = await priceInsight({
    category: parsed.data.category,
    subcategory: parsed.data.subcategory,
    attributes: parsed.data.attributes,
    price: parsed.data.price,
    excludeListingId: parsed.data.excludeListingId,
    brand: parsed.data.attributes?.brand ? String(parsed.data.attributes.brand) : undefined,
    model: parsed.data.attributes?.model ? String(parsed.data.attributes.model) : undefined,
  });
  await track(req, 'listing_assistant', started, { feature: 'priceInsights', meta: { available: data.available, comparables: data.comparables } });
  res.json({ success: true, data });
}

export async function listingQuality(req, res) {
  const started = Date.now();
  await guard(req, 'listingAssistant');
  const parsed = listingInputSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(422, 'Provide the listing draft.', 'VALIDATION_ERROR');
  const data = qualityScore({ ...parsed.data, imageCount: parsed.data.imageCount ?? 0 });
  await track(req, 'listing_assistant', started, { feature: 'listingAssistant', meta: { action: 'quality', score: data.score } });
  res.json({ success: true, data });
}

function normalizeFacts(input: z.infer<typeof listingInputSchema>): Record<string, string> {
  const facts: Record<string, string> = {};
  if (input.condition) facts.condition = input.condition;
  if (input.price !== undefined) facts.price = String(input.price);
  if (input.location) facts.location = input.location;
  for (const [key, value] of Object.entries(input.attributes || {})) if (typeof value === 'string' || typeof value === 'number') facts[key] = String(value);
  return facts;
}

export async function support(req, res) {
  const started = Date.now();
  await guard(req, 'support');
  if (!req.auth?.userId) throw new AppError(401, 'Sign in to create a support request.', 'AUTH_REQUIRED');
  const ticket = await createSupportTicket(req.auth.userId, {
    conversationId: req.body?.conversationId,
    category: String(req.body?.category || 'other'),
    description: String(req.body?.description || ''),
    priority: req.body?.priority,
  });
  await track(req, 'support', started, { feature: 'support' });
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

export async function adminAiSettings(_req, res) {
  const settings = await getAiSettings();
  res.json({ success: true, data: { ...settings, hasServerKey: Boolean(env.ai.apiKey), envProvider: env.ai.provider } });
}

export async function adminUpdateAiSettings(req, res) {
  res.json({ success: true, data: await updateAiSettings(req.auth.userId, req.body) });
}

export async function adminAiAnalytics(req, res) {
  res.json({ success: true, data: await aiAnalytics(Number(req.query.days) || 30) });
}

function unavailableReply() {
  return {
    text: 'QAVLIO AI is temporarily unavailable.',
    unavailable: true,
    actions: [{ type: 'search', label: 'Continue with normal search', href: '/search' }],
    suggestions: ['Browse categories', 'Open Help Center'],
  };
}
