import { MARKETPLACE_POLICIES } from '../constants/aiPolicies.js';
import { getCategoryBySlug, getActiveCategories } from '../services/categoryService.js';
import { findListingByPublicKey } from '../services/listingService.js';
import { getMarketplaceSettings } from '../services/marketplaceSettingsService.js';
import { getPayment, listSellerPayments } from '../services/paymentService.js';
import { recommendListings } from '../services/recommendationService.js';
import { runAiSearch } from '../services/aiSearchService.js';
import { compareListings, explainListing } from '../services/aiListingAssistantService.js';
import { createSupportTicket } from '../services/supportTicketService.js';
import { presentAiListing } from './listings.js';
import type { AiToolName, SearchIntent } from './types.js';

export const PUBLIC_TOOLS: AiToolName[] = ['searchListings', 'getListing', 'getCategory', 'compareListings', 'getMarketplacePolicy', 'recommendListings'];
export const AUTH_TOOLS: AiToolName[] = ['getPaymentStatus', 'getUserRecommendations', 'createSupportTicket'];
export const ADMIN_TOOLS: AiToolName[] = [];

export function authorizedTools(authenticated: boolean): AiToolName[] {
  return authenticated ? [...PUBLIC_TOOLS, ...AUTH_TOOLS] : [...PUBLIC_TOOLS];
}

export function canUseTool(name: string, authenticated: boolean): name is AiToolName {
  if ((ADMIN_TOOLS as string[]).includes(name)) return false;
  return authorizedTools(authenticated).includes(name as AiToolName);
}

export async function executeTool(name: AiToolName, args: Record<string, unknown>, ctx: { userId?: string | null; conversationId?: string; previousIntent?: SearchIntent | null }) {
  switch (name) {
    case 'searchListings':
      return runAiSearch(String(args.query || args.q || ''), ctx.previousIntent);
    case 'getListing': {
      const record: any = await findListingByPublicKey(String(args.listingId || args.id || ''));
      if (!record) return { error: 'I couldn\'t find that listing right now.' };
      return { listing: presentAiListing(record), insight: await explainListing(record.publicId) };
    }
    case 'compareListings':
      return compareListings((args.listingIds as string[]) || []);
    case 'getCategory': {
      const slug = String(args.slug || args.category || '');
      if (!slug) return { categories: (await getActiveCategories()).map((item: any) => ({ name: item.name, slug: item.slug })) };
      const category = await getCategoryBySlug(slug);
      return category ? { name: category.name, slug: category.slug, description: category.description } : { error: 'I couldn\'t find that category.' };
    }
    case 'getMarketplacePolicy':
      return policyFor(String(args.topic || 'general'));
    case 'recommendListings':
      return recommendListings({ userId: ctx.userId, currentSearch: args.query ? String(args.query) : undefined, category: args.category ? String(args.category) : undefined, limit: 8 });
    case 'getUserRecommendations':
      if (!ctx.userId) return { error: 'Sign in to get personalized recommendations.' };
      return recommendListings({ userId: ctx.userId, limit: 8 });
    case 'getPaymentStatus': {
      if (!ctx.userId) return { error: 'Sign in to view your own payment status.' };
      if (args.userId && String(args.userId) !== ctx.userId) return { error: 'I can only show payment details for your own account.' };
      if (args.paymentId) {
        try {
          const payment = await getPayment(ctx.userId, String(args.paymentId));
          return { payment: { status: payment.status, type: payment.type, amount: payment.amount, currency: payment.currency, reference: payment.reference, listingPublicId: payment.listingPublicId } };
        } catch {
          return { error: 'I couldn\'t find that payment on your account.' };
        }
      }
      const list = await listSellerPayments(ctx.userId, { page: 1, limit: 5, sort: 'newest' });
      return { payments: list.payments.map((item: any) => ({ status: item.status, type: item.type, amount: item.amount, currency: item.currency, reference: item.reference })) };
    }
    case 'createSupportTicket': {
      if (!ctx.userId) return { error: 'Sign in to create a support request.' };
      const ticket = await createSupportTicket(ctx.userId, {
        conversationId: ctx.conversationId,
        category: String(args.category || 'other'),
        description: String(args.description || ''),
        priority: args.priority ? String(args.priority) : 'medium',
      });
      return { ticket };
    }
    default:
      return { error: 'That tool is not available.' };
  }
}

export async function policyFor(topic: string) {
  const settings = await getMarketplaceSettings();
  const key = topic.toLowerCase();
  const extra = {
    listingFee: `The current additional listing fee is Rs. ${settings.additionalListingFee} ${settings.currency}. The free listing quota is ${settings.freeListingLimit}.`,
    promotions: settings.promotionEnabled
      ? `Promotions currently available: ${settings.promotionProducts.map((item: any) => `${item.name} (Rs. ${item.price})`).join('; ')}.`
      : 'Promotions are currently unavailable.',
  };
  if (/fee|listing fee|price to (post|publish)/.test(key)) return { topic: 'listing-fee', text: extra.listingFee, source: 'According to QAVLIO marketplace settings.' };
  if (/promot/.test(key)) return { topic: 'promotions', text: `${MARKETPLACE_POLICIES.promotions.how} ${extra.promotions}`, source: 'According to QAVLIO marketplace settings.' };
  if (/payment|pending|refund/.test(key)) return { topic: 'payments', text: `${MARKETPLACE_POLICIES.payments.process} ${MARKETPLACE_POLICIES.payments.credentials}`, source: 'According to QAVLIO payment policy.' };
  if (/chat|message|block|report/.test(key)) return { topic: 'chat', text: `${MARKETPLACE_POLICIES.chat.messageSellers} ${MARKETPLACE_POLICIES.chat.block} ${MARKETPLACE_POLICIES.chat.report}`, source: 'According to QAVLIO help topics.' };
  if (/login|signup|password|profile|account/.test(key)) return { topic: 'account', text: `${MARKETPLACE_POLICIES.account.login} ${MARKETPLACE_POLICIES.account.passwordReset}`, source: 'According to QAVLIO account help.' };
  if (/safety|scam|meet|buying|selling|otp|block/.test(key)) {
    const { safetyPolicyText } = await import('../services/safetyPolicyService.js');
    return safetyPolicyText(key);
  }
  if (/create listing|sell|post/.test(key)) return { topic: 'listing', text: `${MARKETPLACE_POLICIES.listing.howToCreate} ${extra.listingFee}`, source: 'According to QAVLIO listing help.' };
  return { topic: 'general', text: MARKETPLACE_POLICIES.role, source: 'According to QAVLIO policy.' };
}
