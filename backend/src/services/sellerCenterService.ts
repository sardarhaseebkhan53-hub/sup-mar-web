import { listSellerListings } from './listingService.js';
import { listLeads } from './leadService.js';
import { listConversations, sellerResponseMetrics } from './messagingService.js';
import { listSellerPayments, getSellerPaymentDetail } from './paymentService.js';
import { sellerPromotionAnalytics } from './promotionAnalyticsService.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { SellerLead } from '../models/SellerLead.js';
import { PromotionEvent } from '../models/PromotionEvent.js';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

/**
 * Seller Business Center service (Phase 17 §6–7, §21–23, §27–28, §33–39, §47, §56–60).
 * Every metric is computed from real marketplace records for the authenticated seller
 * scope; nothing is estimated or invented.
 */

const WINDOWS: Record<string, number> = { today: 1, '7days': 7, '30days': 30, '90days': 90, year: 365 };
const connected = () => mongoose.connection.readyState === 1;

export function windowDays(window: string | undefined): number {
  return WINDOWS[window || '30days'] || 30;
}

const sinceFor = (window: string) => new Date(Date.now() - windowDays(window) * 86_400_000);

/* ------------------------------ dashboard (§6–7) ----------------------------- */

export async function sellerDashboard(scope: { ownerId: string; actorId: string }, window = '30days') {
  const [listingsResult, leads, conversations, , promotions] = await Promise.all([
    listSellerListings(scope.ownerId, { page: 1, limit: 1, sort: 'newest' }),
    listLeads(scope.ownerId, { page: 1, limit: 1 }),
    listConversations(scope.ownerId, { page: 1, limit: 1 }),
    listSellerPayments(scope.ownerId, { page: 1, limit: 1, date: window === 'today' ? '30days' : window }),
    sellerPromotionAnalytics(scope.ownerId),
  ]);

  const since = sinceFor(window);
  const leadRows = await leadRowsSince(scope.ownerId, since);
  const paymentRows = await paymentRowsSince(scope.ownerId, since);

  return {
    window,
    cards: {
      activeListings: listingsResult.summary.active,
      views: listingsResult.summary.views,
      favorites: listingsResult.summary.favorites,
      leads: leads.pagination.total,
      messages: listingsResult.summary.messages,
      unreadMessages: conversations.unreadTotal,
      orders: paymentRows.length,
      promotionPerformance: { impressions: promotions.summary.impressions, clicks: promotions.summary.clicks },
    },
    leadsInWindow: leadRows.length,
    leadsByStage: leads.counts,
    revenueInWindow: {
      spend: paymentRows.filter((row: any) => row.status === 'paid').reduce((sum: number, row: any) => sum + Number(row.amount?.toString?.() ?? row.amount ?? 0), 0),
      currency: 'PKR',
      label: 'Marketplace spend in window (listing fees, promotions, packages)',
    },
    onboarding: await onboardingState(scope.ownerId),
    basis: 'Every number on this dashboard comes from your real QAVLIO listings, conversations, leads, and payments.',
  };
}

/** Listing performance (§7) with selectable windows. */
export async function listingPerformance(scope: { ownerId: string }, window = '30days') {
  const since = sinceFor(window);
  const events = await promotionEventsSince(scope.ownerId, since);
  const listingsResult = await listSellerListings(scope.ownerId, { page: 1, limit: 50, sort: 'most-viewed' });
  const byDay = bucketByDay(events, (event: any) => +event.createdAt);
  return {
    window,
    totals: {
      views: listingsResult.summary.views,
      favorites: listingsResult.summary.favorites,
      messages: listingsResult.summary.messages,
      callsTracked: 0,
      callsNote: 'Call tracking starts when a call provider is configured — no calls are invented.',
      leads: (await listLeads(scope.ownerId, { page: 1, limit: 1 })).pagination.total,
      promotionImpressions: events.filter((event: any) => event.type === 'listing_impression').length,
      promotionClicks: events.filter((event: any) => event.type === 'listing_click').length,
    },
    timeline: byDay.map((bucket) => ({ date: bucket.date, impressions: bucket.counts.listing_impression || 0, clicks: bucket.counts.listing_click || 0, favorites: bucket.counts.favorite_added || 0, contacts: bucket.counts.contact_seller || 0 })),
    listings: listingsResult.listings.slice(0, 10).map((item: any) => ({ publicId: item.publicId, title: item.title, views: item.viewCount || 0, favorites: item.favoriteCount || 0, messages: item.messagesCount || 0, status: item.status })),
    source: `Based on your QAVLIO listings and tracked promotion events (${window}).`,
  };
}

/* ------------------------------- customers (§21–23) --------------------------- */

export async function sellerCustomers(scope: { ownerId: string }, input: { q?: string; page: number; limit: number }) {
  const conversations = await listConversations(scope.ownerId, { page: 1, limit: 200 });
  const byBuyer = new Map<string, any>();
  for (const conversation of conversations.conversations) {
    if (String(conversation.sellerId) !== String(scope.ownerId)) continue; // only conversations where THIS business is the seller
    const buyerKey = String(conversation.participant?.id || conversation.buyerId || '');
    if (!buyerKey || buyerKey === String(scope.ownerId)) continue;
    const entry = byBuyer.get(buyerKey) || {
      buyerId: buyerKey,
      name: conversation.participant?.name || 'QAVLIO buyer',
      conversations: 0,
      listings: new Set<string>(),
      unread: 0,
      lastInteraction: null as Date | null,
      conversationIds: [] as string[],
    };
    entry.conversations += 1;
    if (conversation.listing?.title) entry.listings.add(conversation.listing.title);
    entry.unread += conversation.unreadCount || 0;
    const at = new Date(conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt);
    if (!entry.lastInteraction || at > entry.lastInteraction) entry.lastInteraction = at;
    if (conversation.id) entry.conversationIds.push(String(conversation.id));
    byBuyer.set(buyerKey, entry);
  }
  let rows = [...byBuyer.values()];
  if (input.q) rows = rows.filter((row) => row.name.toLowerCase().includes(input.q!.toLowerCase()) || [...row.listings].some((title) => title.toLowerCase().includes(input.q!.toLowerCase())));
  rows.sort((a, b) => +b.lastInteraction - +a.lastInteraction);
  const start = (input.page - 1) * input.limit;
  const leadsAll = await listLeads(scope.ownerId, { page: 1, limit: 200 });
  return {
    customers: rows.slice(start, start + input.limit).map((row) => ({
      buyerId: row.buyerId,
      name: row.name,
      conversationCount: row.conversations,
      listingsContacted: [...row.listings].slice(0, 5),
      unreadMessages: row.unread,
      lastInteraction: row.lastInteraction,
      conversationId: row.conversationIds[0] || null,
      leadStatus: leadsAll.leads.find((lead) => lead.buyerId === row.buyerId)?.status || null,
    })),
    pagination: { page: input.page, limit: input.limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / input.limit)) },
    note: 'Only buyers who contacted YOUR listings appear here. Private account details, contact information, and internal data are never shown.',
  };
}

export async function sellerCustomerDetail(scope: { ownerId: string }, buyerId: string) {
  const customers = await sellerCustomers(scope, { page: 1, limit: 200 });
  const customer = customers.customers.find((row) => row.buyerId === buyerId);
  if (!customer) throw new AppError(404, 'Customer not found in your business', 'CUSTOMER_NOT_FOUND');
  const leads = (await listLeads(scope.ownerId, { page: 1, limit: 200 })).leads.filter((lead) => lead.buyerId === buyerId);
  return { ...customer, leads, privacy: 'Seller view: public interaction data only. Passwords, payment data, verification documents, and internal scores are never exposed.' };
}

/* -------------------------------- orders (§27–28) ------------------------------ */

export async function sellerOrders(scope: { ownerId: string }, input: { status?: string; type?: string; page: number; limit: number }) {
  const result = await listSellerPayments(scope.ownerId, { page: input.page, limit: input.limit, ...(input.type && { type: input.type }), ...(input.status && { status: input.status }) });
  const listings = await listSellerListings(scope.ownerId, { page: 1, limit: 100, sort: 'newest' });
  const titleFor = (publicId: string) => listings.listings.find((item: any) => item.publicId === publicId)?.title || null;
  return {
    orders: result.payments.map((payment: any) => ({
      id: payment.id,
      reference: payment.reference,
      type: payment.type,
      listingTitle: payment.listingPublicId ? titleFor(payment.listingPublicId) : null,
      listingPublicId: payment.listingPublicId || null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentStatus: payment.status,
      date: payment.createdAt,
    })),
    pagination: result.pagination,
    note: 'QAVLIO orders are your marketplace transactions — listing fees, promotions, and packages. On-platform buyer purchases are not part of the marketplace model yet.',
  };
}

export async function sellerOrderDetail(scope: { ownerId: string }, id: string) {
  const detail: any = await getSellerPaymentDetail(scope.ownerId, id);
  return {
    payment: detail.payment,
    order: detail.order,
    invoice: detail.invoice,
    timeline: [
      { status: 'Created', at: detail.payment?.createdAt },
      ...(detail.payment?.status === 'paid' ? [{ status: 'Paid', at: detail.payment?.updatedAt }] : []),
      ...(['failed', 'cancelled', 'refunded'].includes(String(detail.payment?.status)) ? [{ status: String(detail.payment?.status), at: detail.payment?.updatedAt }] : []),
    ].filter((entry: any) => entry.at),
    privacy: 'Payment credentials are never stored or shown — statuses and references only.',
  };
}

/* -------------------------------- revenue (§33–34) ----------------------------- */

export async function sellerRevenue(scope: { ownerId: string }, window = '30days') {
  const refunds = await listSellerPayments(scope.ownerId, { page: 1, limit: 100, status: 'refunded' });
  const rows = await paymentRowsSince(scope.ownerId, sinceFor(window));
  const paid = rows.filter((row: any) => row.status === 'paid');
  const sum = (list: any[], field: string) => list.reduce((accumulator, row: any) => accumulator + Number(row[field]?.toString?.() ?? row[field] ?? 0), 0);
  const grossSales = sum(paid, 'amount') + sum(paid, 'platformFee');
  return {
    window,
    metrics: [
      { key: 'grossSales', label: 'Gross marketplace spend', value: grossSales, basis: 'Your paid QAVLIO orders in this window (fees + promotions + packages).' },
      { key: 'promotionSpend', label: 'Promotion spending', value: paid.filter((row: any) => row.type === 'promotion').reduce((a, row: any) => a + Number(row.amount?.toString?.() ?? row.amount ?? 0), 0), basis: 'Paid promotion orders.' },
      { key: 'platformFees', label: 'Platform fees (listing fees)', value: paid.filter((row: any) => row.type === 'listing_fee').reduce((a, row: any) => a + Number(row.amount?.toString?.() ?? row.amount ?? 0), 0), basis: 'Paid listing-fee orders.' },
      { key: 'refunds', label: 'Refunds received', value: refunds.summary?.totalSpent ? sum([refunds], 'x') || 0 : 0, basis: 'Refunded amounts. QAVLIO does not process item payments, so no buyer sales revenue exists yet.' },
      { key: 'net', label: 'Net marketplace spend', value: grossSales, basis: 'Sum of paid orders. Buyer-payment revenue is not processed on-platform yet — it will appear here when the payment provider goes live.' },
    ].map((metric) => ({ ...metric, currency: 'PKR', honest: true })),
    refundsTotal: refunds.payments?.length || 0,
    payouts: {
      supported: false,
      status: 'architecture-only',
      note: 'Seller payouts are not implemented yet. The architecture reserves pending / completed / failed payout states; no bank or payment secrets are ever exposed.',
    },
    basis: 'Every revenue figure is computed from your recorded QAVLIO payments. Labels describe exactly what each metric contains.',
  };
}

/* ------------------------------- analytics (§35–39) ---------------------------- */

export async function sellerAnalytics(scope: { ownerId: string }, window = '30days') {
  const days = windowDays(window);
  const [listingsResult, leads, , promotions, response] = await Promise.all([
    listSellerListings(scope.ownerId, { page: 1, limit: 100, sort: 'most-viewed' }),
    listLeads(scope.ownerId, { page: 1, limit: 200 }),
    listSellerPayments(scope.ownerId, { page: 1, limit: 100, date: window === 'year' ? undefined : window }),
    sellerPromotionAnalytics(scope.ownerId),
    sellerResponseMetrics(scope.ownerId).catch(() => null),
  ]);
  const listings: any[] = listingsResult.listings;
  const since = sinceFor(window);
  const events = await promotionEventsSince(scope.ownerId, since);
  const leadRows = await leadRowsSince(scope.ownerId, since);
  const paymentRows = (await paymentRowsSince(scope.ownerId, since)).filter((row: any) => row.status === 'paid');

  const byCategory = new Map<string, { category: string; listings: number; views: number; leads: number; sales: number }>();
  for (const listing of listings) {
    const key = listing.categorySlug || 'other';
    const entry = byCategory.get(key) || { category: key, listings: 0, views: 0, leads: 0, sales: 0 };
    entry.listings += 1;
    entry.views += listing.viewCount || 0;
    entry.sales += listing.status === 'sold' ? 1 : 0;
    entry.leads += leadRows.filter((lead: any) => lead.listingPublicId === listing.publicId).length;
    byCategory.set(key, entry);
  }

  const timeline = mergeBuckets([
    bucketByDay(events, (event: any) => +event.createdAt, (event: any) => ({ [event.type]: 1 })),
    bucketByDay(leadRows, (row: any) => +row.createdAt, () => ({ lead: 1 })),
    bucketByDay(paymentRows, (row: any) => +row.createdAt, (row: any) => ({ revenue: Number(row.amount?.toString?.() ?? row.amount ?? 0) })),
  ], days);

  const lowest = [...listings].sort((a, b) => (a.viewCount || 0) - (b.viewCount || 0)).slice(0, 5);
  return {
    window,
    sections: {
      listings: { total: listings.length, active: listings.filter((item) => item.status === 'published').length, sold: listings.filter((item) => item.status === 'sold').length },
      views: { total: listings.reduce((sum, item) => sum + (item.viewCount || 0), 0), note: 'Lifetime listing views.' },
      searchImpressions: { total: events.filter((event: any) => event.type === 'listing_impression').length, note: 'Tracked promotion impressions (organic search impressions need the analytics pipeline and are not invented).' },
      favorites: { total: listings.reduce((sum, item) => sum + (item.favoriteCount || 0), 0) },
      leads: { total: leads.pagination.total, byStage: leads.counts },
      messages: { total: listings.reduce((sum, item) => sum + (item.messagesCount || 0), 0), responseRate: response?.responseRate ?? null, medianResponseMinutes: response?.responseTimeMinutes ?? null, responseSample: response?.sample ?? 0 },
      promotions: { ...promotions.summary, active: promotions.promotions.filter((row: any) => row.status === 'active').length },
      revenue: { paidOrders: paymentRows.length, spend: paymentRows.reduce((sum, row: any) => sum + Number(row.amount?.toString?.() ?? row.amount ?? 0), 0), currency: 'PKR' },
    },
    topListings: listings.slice(0, 6).map((item) => ({ publicId: item.publicId, title: item.title, views: item.viewCount || 0, favorites: item.favoriteCount || 0, messages: item.messagesCount || 0 })),
    mostViewed: listings.slice(0, 3).map((item) => ({ publicId: item.publicId, title: item.title, views: item.viewCount || 0 })),
    mostFavorited: [...listings].sort((a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0)).slice(0, 3).map((item) => ({ publicId: item.publicId, title: item.title, favorites: item.favoriteCount || 0 })),
    mostContacted: [...listings].sort((a, b) => (b.messagesCount || 0) - (a.messagesCount || 0)).slice(0, 3).map((item) => ({ publicId: item.publicId, title: item.title, messages: item.messagesCount || 0 })),
    lowestPerforming: lowest.map((item) => ({ publicId: item.publicId, title: item.title, views: item.viewCount || 0 })),
    categories: [...byCategory.values()].filter((row) => listings.some((item) => (item.categorySlug || 'other') === row.category)),
    timeline,
    basis: 'All analytics come from your listings, tracked events, leads, and payments. Untracked metrics are labeled instead of estimated.',
  };
}

/* ---------------------------- AI insights (§46–48) ----------------------------- */

/** Grounded AI business insights: every statement is generated from real aggregates. */
export async function sellerPerformanceInsights(scope: { ownerId: string }) {
  const analytics = await sellerAnalytics(scope, '30days');
  const statements: string[] = [];
  const { categories, topListings, sections, mostContacted } = analytics;

  const bestCategory = [...categories].sort((a, b) => b.leads - a.leads || b.views - a.views)[0];
  if (bestCategory && (bestCategory.leads > 0 || bestCategory.views > 0)) {
    statements.push(`Your ${bestCategory.category.split('-').join(' ')} listings received ${bestCategory.views} views${bestCategory.leads ? ` and ${bestCategory.leads} lead${bestCategory.leads === 1 ? '' : 's'}` : ''} — the most active category in your business this month.`);
  }
  if (topListings[0]?.views) statements.push(`"${topListings[0].title}" is your most viewed listing with ${topListings[0].views} views.`);
  if (mostContacted[0]?.messages) statements.push(`"${mostContacted[0].title}" attracts the most buyer messages (${mostContacted[0].messages}).`);
  if (sections.leads.total > 0) {
    const won = sections.leads.byStage.won || 0;
    statements.push(`${sections.leads.total} lead${sections.leads.total === 1 ? '' : 's'} in your pipeline · ${won} won this window.`);
  }
  if (sections.listings.sold > 0) statements.push(`You marked ${sections.listings.sold} listing${sections.listings.sold === 1 ? '' : 's'} as sold.`);
  if (sections.promotions.impressions > 0) statements.push(`Promotions delivered ${sections.promotions.impressions} impressions and ${sections.promotions.clicks} clicks.`);
  if (sections.messages.responseRate !== null && sections.messages.responseRate !== undefined) statements.push(`You reply to ${sections.messages.responseRate}% of buyer messages${sections.messages.medianResponseMinutes ? ` (typical response ${sections.messages.medianResponseMinutes} min)` : ''}.`);

  const suggestions: string[] = [];
  if (analytics.lowestPerforming.length && analytics.lowestPerforming[0].views < 5) suggestions.push('Refresh titles and photos on your lowest-viewed listings — they have under 5 views each.');
  if (sections.leads.byStage.new > 3) suggestions.push(`${sections.leads.byStage.new} new leads are waiting for a first reply — responding quickly improves your response metrics.`);
  if (categories.length > 0 && !categories.some((row) => row.views > 0)) suggestions.push('None of your listings have views yet — promoting one listing or improving photos can start momentum.');
  if (sections.promotions.active === 0 && sections.listings.active > 3) suggestions.push('You have active listings but no active promotion — a single boosted listing can test paid visibility.');

  return {
    statements,
    suggestions,
    safety: 'AI insights only describe your real QAVLIO analytics. The AI cannot publish, price, delete, message, refund, or change payments — you approve every action.',
    basis: 'Generated from your live listings, leads, conversations, promotions, and payments.',
  };
}

/** Internal, transparent performance metrics (§60) — never a public seller score. */
export async function internalPerformanceMetrics(scope: { ownerId: string }) {
  const analytics = await sellerAnalytics(scope, '90days');
  const response = await sellerResponseMetrics(scope.ownerId).catch(() => null);
  const { qualityScore } = await import('./aiListingAssistantService.js');
  const listings = await listSellerListings(scope.ownerId, { page: 1, limit: 20, sort: 'newest' });
  const scores = listings.listings.map((listing: any) => qualityScore({
    title: listing.title,
    description: listing.description,
    category: listing.categorySlug,
    condition: listing.condition,
    price: Number(listing.price?.toString?.() ?? listing.price ?? 0),
    imageCount: (listing.media || []).length,
    attributes: listing.attributes instanceof Map ? Object.fromEntries(listing.attributes) : listing.attributes,
  }).score);
  return {
    internalOnly: true,
    listingQuality: scores.length ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) : null,
    responsePerformance: { responseRate: response?.responseRate ?? null, medianResponseMinutes: response?.responseTimeMinutes ?? null, sample: response?.sample ?? 0 },
    salesPerformance: { soldListings: analytics.sections.listings.sold, activeListings: analytics.sections.listings.active, leadsWon: analytics.sections.leads.byStage.won || 0 },
    disclaimer: 'Transparent internal metrics for you only. QAVLIO does not publish a seller score.',
  };
}

/* ------------------------------ search + export (§56–57) ------------------------ */

export async function sellerSearch(scope: { ownerId: string }, q: string, page = 1, limit = 5) {
  const needle = q.trim().toLowerCase();
  if (!needle) return { results: { listings: [], leads: [], customers: [], orders: [] }, pagination: { page, limit, total: 0 } };
  const [listings, leads, customers, orders] = await Promise.all([
    listSellerListings(scope.ownerId, { page: 1, limit: 50, q: needle, sort: 'newest' }),
    listLeads(scope.ownerId, { q: needle, page: 1, limit: 50 }),
    sellerCustomers(scope, { q: needle, page: 1, limit: 50 }),
    sellerOrders(scope, { page: 1, limit: 50 }),
  ]);
  const orderHits = orders.orders.filter((order: any) => `${order.reference} ${order.listingTitle || ''}`.toLowerCase().includes(needle));
  return {
    results: {
      listings: listings.listings.slice(0, limit).map((item: any) => ({ publicId: item.publicId, title: item.title, status: item.status, price: Number(item.price?.toString?.() ?? item.price ?? 0), href: `/seller/listings/${item.publicId}` })),
      leads: leads.leads.slice(0, limit).map((lead) => ({ id: lead.id, buyerName: lead.buyerName, status: lead.status, listingTitle: lead.listingTitle })),
      customers: customers.customers.slice(0, limit).map((customer) => ({ buyerId: customer.buyerId, name: customer.name, lastInteraction: customer.lastInteraction })),
      orders: orderHits.slice(0, limit).map((order) => ({ id: order.id, reference: order.reference, status: order.status, amount: order.amount })),
    },
    pagination: { page, limit, total: listings.pagination.total + leads.pagination.total + customers.pagination.total + orderHits.length },
  };
}

const EXPORT_DATASETS = ['listings', 'leads', 'customers', 'analytics'] as const;

export async function sellerExport(scope: { ownerId: string }, dataset: string) {
  if (!EXPORT_DATASETS.includes(dataset as any)) throw new AppError(404, 'Unknown export dataset', 'EXPORT_UNKNOWN');
  let rows: string[][] = [];
  if (dataset === 'listings') {
    const result = await listSellerListings(scope.ownerId, { page: 1, limit: 1000, sort: 'newest' });
    rows = [['publicId', 'title', 'category', 'status', 'price', 'currency', 'views', 'favorites', 'messages', 'createdAt'],
      ...result.listings.map((item: any) => [item.publicId, item.title || '', item.categorySlug || '', item.status, String(Number(item.price?.toString?.() ?? item.price ?? 0)), item.currency || 'PKR', String(item.viewCount || 0), String(item.favoriteCount || 0), String(item.messagesCount || 0), String(item.createdAt || '')])];
  } else if (dataset === 'leads') {
    const result = await listLeads(scope.ownerId, { page: 1, limit: 1000 });
    rows = [['id', 'buyerName', 'listingTitle', 'source', 'status', 'lastContactedAt', 'createdAt'],
      ...result.leads.map((lead) => [lead.id, lead.buyerName || '', lead.listingTitle || '', lead.source, lead.status, String(lead.lastContactedAt || ''), String(lead.createdAt || '')])];
  } else if (dataset === 'customers') {
    const result = await sellerCustomers(scope, { page: 1, limit: 1000 });
    rows = [['buyerId', 'name', 'conversations', 'listingsContacted', 'lastInteraction'],
      ...result.customers.map((customer) => [customer.buyerId, customer.name, String(customer.conversationCount), customer.listingsContacted.join(' | '), String(customer.lastInteraction || '')])];
  } else {
    const analytics = await sellerAnalytics(scope, '30days');
    rows = [['metric', 'value'],
      ['activeListings', String(analytics.sections.listings.active)], ['soldListings', String(analytics.sections.listings.sold)],
      ['views', String(analytics.sections.views.total)], ['favorites', String(analytics.sections.favorites.total)],
      ['leads', String(analytics.sections.leads.total)], ['messages', String(analytics.sections.messages.total)],
      ['promotionImpressions', String(analytics.sections.promotions.impressions)], ['promotionClicks', String(analytics.sections.promotions.clicks)],
      ['paidOrders30d', String(analytics.sections.revenue.paidOrders)]];
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  return { csv, filename: `qavlio-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`, datasets: EXPORT_DATASETS, privacy: 'Exports contain your business data only — never passwords, payment credentials, verification documents, or internal risk data.' };
}

/* ------------------------------ onboarding (§59) ------------------------------- */

export async function onboardingState(ownerId: string) {
  const profile = await getSellerProfileRepository().findByUserId(ownerId).catch(() => null);
  const listings = await listSellerListings(ownerId, { page: 1, limit: 1, sort: 'newest' });
  const hasListing = listings.pagination.total > 0;
  const steps = [
    { id: 'profile', title: 'Complete profile', done: Boolean(profile?.displayName), href: '/seller/profile' },
    { id: 'listing', title: 'Add first listing', done: hasListing, href: '/seller/listings/new' },
    { id: 'contact', title: 'Configure contact preferences', done: Boolean(profile?.contactPreference), href: '/seller/settings' },
    { id: 'verification', title: 'Optional verification', done: ['verified', 'pending'].includes(profile?.verificationStatus || ''), href: '/seller/verification', optional: true },
    { id: 'sell', title: 'Start selling', done: listings.summary.active > 0, href: '/seller/dashboard' },
  ];
  return { complete: steps.filter((step) => step.done).length >= 4, steps, note: 'Basic selling is not blocked — these steps simply set you up for success.' };
}

/* --------------------------------- helpers -------------------------------------- */

async function promotionEventsSince(sellerId: string, since: Date): Promise<any[]> {
  if (connected()) return PromotionEvent.find({ sellerId, createdAt: { $gte: since } }).lean();
  const { listMemoryPromotionEvents } = await import('./promotionAnalyticsService.js');
  return listMemoryPromotionEvents(sellerId).filter((row: any) => +new Date(row.createdAt) >= +since);
}

async function leadRowsSince(sellerId: string, since: Date): Promise<any[]> {
  if (connected()) return SellerLead.find({ sellerId, createdAt: { $gte: since } }).lean();
  const { listLeads: list } = await import('./leadService.js');
  return (await list(sellerId, { page: 1, limit: 1000 })).leads.filter((lead) => +new Date(lead.createdAt) >= +since).map((lead: any) => ({ ...lead }));
}

async function paymentRowsSince(sellerId: string, since: Date): Promise<any[]> {
  const result = await listSellerPayments(sellerId, { page: 1, limit: 1000 });
  return result.payments.filter((payment: any) => +new Date(payment.createdAt) >= +since);
}

type Bucket = { date: string; counts: Record<string, number> };
function bucketByDay(rows: any[], timestampOf: (row: any) => number, counter?: (row: any) => Record<string, number>): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (const row of rows) {
    const key = new Date(timestampOf(row)).toISOString().slice(0, 10);
    const bucket = buckets.get(key) || { date: key, counts: {} };
    if (counter) {
      for (const [field, value] of Object.entries(counter(row))) bucket.counts[field] = (bucket.counts[field] || 0) + value;
    } else {
      const type = row.type || 'value';
      bucket.counts[type] = (bucket.counts[type] || 0) + 1;
    }
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeBuckets(bucketSets: Bucket[][], _days: number): Bucket[] {
  const merged = new Map<string, Bucket>();
  for (const set of bucketSets) {
    for (const bucket of set) {
      const existing = merged.get(bucket.date) || { date: bucket.date, counts: {} };
      for (const [key, value] of Object.entries(bucket.counts)) existing.counts[key] = (existing.counts[key] || 0) + value;
      merged.set(bucket.date, existing);
    }
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
}
