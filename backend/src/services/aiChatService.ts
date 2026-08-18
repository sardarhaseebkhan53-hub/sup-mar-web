import { MARKETPLACE_POLICIES, QUICK_PROMPTS } from '../constants/aiPolicies.js';
import { canUseTool, executeTool, policyFor } from '../ai/tools.js';
import { detectPromptInjection, detectSensitiveAction, looksLikeSecretProbe, sanitizeUserText } from '../ai/promptSecurity.js';
import type { AiReply, SearchIntent } from '../ai/types.js';
import { runAiSearch } from './aiSearchService.js';
import { compareListings, explainListing, listingAssistant } from './aiListingAssistantService.js';
import { appendMessage, getOrCreateConversation, listMessages } from './aiConversationStore.js';
import { recommendListings } from './recommendationService.js';

type ChatInput = {
  message: string;
  conversationId?: string;
  listingId?: string;
  listingIds?: string[];
  guestKey?: string;
  userId?: string | null;
};

export async function handleAiChat(input: ChatInput): Promise<{ conversationId: string; reply: AiReply }> {
  const message = sanitizeUserText(input.message);
  if (!message) return empty('Ask me about listings, prices, selling, or QAVLIO help.');

  if (detectPromptInjection(message) || looksLikeSecretProbe(message)) {
    return empty('I can help with QAVLIO listings, search, and support. I cannot change system instructions or share secrets.');
  }
  if (detectSensitiveAction(message) && !/how (do|can|to)|why|what|explain|help/.test(message.toLowerCase())) {
    return empty('I can explain how that works, but I cannot approve listings, refund payments, change prices, or change account permissions. Use the normal QAVLIO screens for those actions.');
  }

  const conversation = await getOrCreateConversation({ conversationId: input.conversationId, userId: input.userId, guestKey: input.guestKey, listingId: input.listingId });
  const history = await listMessages(conversation, 8);
  await appendMessage(conversation, 'user', message);
  const previousIntent: SearchIntent | null = conversation.lastIntent || null;
  const listingIds = [...new Set([...(input.listingIds || []), ...collectListingIds(history)])].slice(0, 3);
  const reply = await routeMessage(message, { userId: input.userId, listingId: input.listingId, listingIds, previousIntent, conversationId: String(conversation._id || conversation.id) });
  await appendMessage(conversation, 'assistant', reply.text, { tools: (reply.listings || []).length ? [{ name: 'searchListings', listingIds: (reply.listings || []).map((item) => item.publicId), ok: true }] : [], meta: { resultCount: reply.resultCount }, intent: reply.filters || previousIntent });
  return { conversationId: String(conversation._id || conversation.id), reply };
}

async function routeMessage(message: string, ctx: { userId?: string | null; listingId?: string; listingIds: string[]; previousIntent: SearchIntent | null; conversationId: string }): Promise<AiReply> {
  const text = message.toLowerCase();

  if (/compare/.test(text) && (ctx.listingIds.length >= 2 || /these listings/.test(text))) {
    if (ctx.listingIds.length < 2) return { text: 'Select 2 or 3 listings, then ask me to compare them.', suggestions: ['Open a listing and tap Compare'], actions: [{ type: 'browse', label: 'Browse listings', href: '/marketplace' }] };
    const compare = await compareListings(ctx.listingIds);
    return { text: 'Here is a side-by-side look at the selected QAVLIO listings.', bullets: compare.comparison.map((row: any) => `${label(row.field)}: ${row.values.join(' vs ')}`), compare, source: compare.source, suggestions: ['Which is closer to me?', 'Ask about listing completeness'] };
  }

  if (ctx.listingId && /(this listing|good deal|important details|ask the seller|summar)/.test(text)) {
    const insight = await explainListing(ctx.listingId);
    return {
      text: 'Here is what this QAVLIO listing actually states.',
      bullets: insight.summary.keyDetails.slice(0, 6),
      insight,
      source: 'According to this listing.',
      suggestions: insight.summary.questions,
      actions: [{ type: 'open_listing', label: 'View listing', href: listingHref(ctx.listingId) }],
    };
  }

  if (/(help me sell|improve (my )?(title|description)|listing assistant|suggest (a )?categor)/.test(text)) {
    const assist = await listingAssistant({ action: 'improve', title: message.replace(/help me sell/i, '').trim() });
    return {
      text: 'I can help you write a clearer listing from facts you already know. Confirm anything before saving.',
      sellerAssist: assist,
      bullets: ['I will not invent storage, warranty, mileage, or condition.', 'You choose the category before it is saved.'],
      actions: [{ type: 'sell', label: 'Open listing form', href: '/seller/listings/new' }, { type: 'sell', label: 'AI Listing Assistant', href: '/seller/ai-assistant' }],
      suggestions: ['Improve this title', 'Suggest a category', 'How do I promote my listing?'],
    };
  }

  if (/(support|human|agent|escalate|complaint|not working)/.test(text)) {
    if (!ctx.userId) return { text: 'I can connect you with QAVLIO Support after you sign in.', actions: [{ type: 'login', label: 'Sign in', href: '/login?returnTo=/ai-assistant' }, { type: 'support', label: 'Help Center', href: '/help' }] };
    return {
      text: 'I can create a support request for a teammate. Tell me whether this is about a payment, listing, account, or chat issue.',
      actions: [{ type: 'support', label: 'Connect with QAVLIO Support', payload: { escalate: true } }],
      suggestions: ['Payment issue', 'Listing issue', 'Account issue'],
    };
  }

  if (/(payment|pending|paid|refund|billing)/.test(text)) {
    if (/another user|someone else|their payment|user [a-z0-9]+ payment/i.test(message)) {
      return { text: 'I can only show payment details for your own account after you sign in.' };
    }
    if (!canUseTool('getPaymentStatus', Boolean(ctx.userId))) {
      const policy = await policyReply('payment');
      return { ...policy, text: 'Sign in to check your own payment status. I never show card details.', actions: [{ type: 'login', label: 'Sign in', href: '/login?returnTo=/seller/payments' }, ...(policy.actions || [])] };
    }
    const result: any = await executeTool('getPaymentStatus', {}, ctx);
    if (result.error) {
      const policy = await policyReply('payment');
      return { ...policy, text: result.error };
    }
    const latest = result.payment || result.payments?.[0];
    if (!latest) {
      const policy = await policyReply('payment');
      return { ...policy, text: 'I could not find a payment on your account.' };
    }
    const statusText = (MARKETPLACE_POLICIES.payments.statuses as any)[latest.status] || `Your payment is currently marked as ${latest.status}.`;
    return { text: statusText, bullets: [`Type: ${latest.type}`, `Amount: Rs. ${Number(latest.amount).toLocaleString()}`, `Reference: ${latest.reference}`], source: 'According to your QAVLIO payment record.', actions: [{ type: 'browse', label: 'Open billing', href: '/seller/payments' }] };
  }

  if (/(how do i|how to|what is|policy|promote|listing fee|create listing|message sellers|block|report|login|signup|password|notification)/.test(text)) {
    return policyReply(message);
  }

  if (/(recommend|for me|similar)/.test(text)) {
    const recs = await recommendListings({ userId: ctx.userId, limit: 8 });
    return {
      text: recs.coldStart ? 'I do not know your preferences yet. Here are popular QAVLIO listings right now.' : 'Recommended from your QAVLIO activity.',
      listings: recs.listings,
      resultCount: recs.listings.length,
      source: recs.coldStart ? 'Based on popular QAVLIO listings.' : 'Based on your QAVLIO activity.',
    };
  }

  if (isSearchLike(text) || ctx.previousIntent) {
    const result = await runAiSearch(message, ctx.previousIntent);
    if (result.empty) {
      return {
        text: 'I couldn\'t find a matching listing right now.',
        filters: result.intent,
        suggestions: result.suggestions.map((item: any) => item.label || String(item)),
        actions: [{ type: 'search', label: 'Continue with normal search', href: searchHref(result.intent, message) }],
        fallbackSearch: result.fallbackSearch,
        resultCount: 0,
      };
    }
    return {
      text: `Here are ${result.total} matching listing${result.total === 1 ? '' : 's'}.`,
      listings: result.listings,
      filters: result.intent,
      source: result.source,
      suggestions: result.suggestions.map((item: any) => item.label || item),
      actions: [{ type: 'search', label: 'See all results', href: searchHref(result.intent, message) }],
      resultCount: result.total,
      fallbackSearch: result.fallbackSearch,
    };
  }

  return {
    text: 'Hi! I\'m QAVLIO Assistant. What are you looking for?',
    suggestions: [...QUICK_PROMPTS],
    actions: [{ type: 'browse', label: 'Browse marketplace', href: '/marketplace' }, { type: 'sell', label: 'Create a listing', href: '/sell' }],
  };
}

async function policyReply(topic: string): Promise<AiReply> {
  const policy = await policyFor(topic);
  return {
    text: policy.text,
    source: policy.source,
    suggestions: ['How do I create a listing?', 'How do I promote my listing?', 'Why is my payment pending?'],
    actions: [{ type: 'open_help', label: 'Open Help Center', href: '/help' }],
  };
}

function isSearchLike(text: string) {
  return /(find|show|search|looking for|under|iphone|car|laptop|furniture|near|used|new)/.test(text);
}

function searchHref(intent: SearchIntent, query: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (intent.category) params.set('category', intent.category);
  if (intent.location) params.set('location', intent.location);
  if (intent.maxPrice !== undefined) params.set('maxPrice', String(intent.maxPrice));
  if (intent.minPrice !== undefined) params.set('minPrice', String(intent.minPrice));
  if (intent.condition?.length) params.set('condition', intent.condition.join(','));
  Object.entries(intent.attributes || {}).forEach(([key, value]) => params.set(`attr.${key}`, String(value)));
  return `/search?${params}`;
}

function listingHref(id: string) {
  return `/listing/${id}`;
}

function collectListingIds(history: any[]) {
  return history.flatMap((item) => (item.tools || []).flatMap((tool: any) => tool.listingIds || []));
}

function label(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function empty(text: string) {
  return { conversationId: '', reply: { text, suggestions: [...QUICK_PROMPTS] } };
}
