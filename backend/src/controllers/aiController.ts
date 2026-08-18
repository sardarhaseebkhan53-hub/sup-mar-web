import { z } from 'zod';
import { env } from '../config/env.js';
import { checkAiRateLimit } from '../ai/rateLimit.js';
import { handleAiChat } from '../services/aiChatService.js';
import { runAiSearch } from '../services/aiSearchService.js';
import { compareListings, explainListing, listingAssistant } from '../services/aiListingAssistantService.js';
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

function rateKey(req: any) {
  return req.auth?.userId || req.ip || 'anon';
}

async function guard(req: any, feature?: 'assistant' | 'search' | 'recommendations' | 'listingAssistant' | 'support') {
  const settings = await assertAiEnabled(feature);
  const limit = checkAiRateLimit(rateKey(req), { perMinute: settings.requestLimitPerMinute, perDay: settings.requestLimitPerDay });
  if (!limit.ok) throw new AppError(429, 'Too many QAVLIO AI requests. Try again shortly.', 'AI_RATE_LIMITED');
  return settings;
}

export async function chat(req, res) {
  const started = Date.now();
  const settings = await guard(req, 'assistant');
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

export async function search(req, res) {
  const started = Date.now();
  await guard(req, 'search');
  const query = String(req.body?.query || req.body?.q || '').trim();
  if (!query || query.length > 200) throw new AppError(422, 'Enter a search question.', 'VALIDATION_ERROR');
  try {
    const result = await runAiSearch(query);
    await recordAiEvent(result.empty ? 'search_empty' : 'search_hit', { userId: req.auth?.userId, durationMs: Date.now() - started, meta: { total: result.total } });
    res.json({ success: true, data: result });
  } catch {
    await recordAiEvent('error', { userId: req.auth?.userId, success: false });
    res.json({ success: true, data: { empty: true, listings: [], fallbackSearch: true, message: 'QAVLIO AI is temporarily unavailable.', actions: [{ type: 'search', label: 'Continue with normal search', href: `/search?q=${encodeURIComponent(query)}` }] } });
  }
}

export async function compare(req, res) {
  await guard(req, 'assistant');
  const ids = Array.isArray(req.body?.listingIds) ? req.body.listingIds : [];
  const data = await compareListings(ids);
  await recordAiEvent('compare', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

export async function recommendations(req, res) {
  await guard(req, 'recommendations');
  const data = await recommendListings({ userId: req.auth?.userId || null, currentSearch: req.body?.query, category: req.body?.category, limit: Number(req.body?.limit) || 8 });
  await recordAiEvent('recommend', { userId: req.auth?.userId });
  res.json({ success: true, data });
}

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
