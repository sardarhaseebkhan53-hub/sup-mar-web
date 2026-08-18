import mongoose from 'mongoose';
import { presentAiListing } from '../ai/listings.js';
import type { PublicAiListing } from '../ai/types.js';
import { env } from '../config/env.js';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { RecentSearch } from '../models/RecentSearch.js';
import { RecentlyViewed } from '../models/RecentlyViewed.js';
import { findListingByPublicKey, getPublishedMemoryListings } from './listingService.js';
import { searchListings } from './searchService.js';
import { VectorSearchService } from './vectorSearchService.js';

/**
 * Phase 16 RecommendationService.
 *
 * Recommendations are ranked from real QAVLIO listings using behavioural signals
 * the user already generated on the platform (views, favourites, searches,
 * location, price band). No sensitive personal attributes are ever used, and when
 * signals are insufficient we say so instead of faking personalisation.
 */

const connected = () => mongoose.connection.readyState === 1;

type Signals = {
  categories: string[];
  cities: string[];
  priceBand: { min: number; max: number } | null;
  seenPublicIds: string[];
  searchTerms: string[];
  hasSignals: boolean;
  strength: number;
};

/* ------------------------------------------------------------------ caching */

type CacheEntry = { value: any; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const ttl = () => Math.max(0, env.ai.recommendationCacheSeconds) * 1000;

function cacheGet(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { cache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key: string, value: any) {
  if (!ttl()) return value;
  cache.set(key, { value, expiresAt: Date.now() + ttl() });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return value;
}

/** Invalidate cached recommendations when listing availability or content changes. */
export function invalidateRecommendationCache(reason?: string) {
  cache.clear();
  return reason || 'cleared';
}

export function __resetRecommendationCache() { cache.clear(); }

/* ------------------------------------------------------------------ catalog */

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item: any) => item.status === 'published');
}

async function availableListings(options: { categories?: string[]; limit?: number; excludePublicIds?: string[]; city?: string } = {}) {
  const limit = Math.min(options.limit || 60, 200);
  const exclude = new Set((options.excludePublicIds || []).map((id) => String(id).toUpperCase()));
  if (connected()) {
    const query: any = { status: 'published', availability: 'available' };
    if (options.categories?.length) query.categorySlug = { $in: options.categories };
    if (options.city) query['location.city'] = new RegExp(`^${options.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const rows = await Listing.find(query).sort({ 'promotion.priority': -1, viewCount: -1, publishedAt: -1 }).limit(limit).select('-moderation -reportCount').lean();
    return rows.filter((row: any) => !exclude.has(String(row.publicId).toUpperCase()));
  }
  return catalog()
    .filter((row: any) => (!options.categories?.length || options.categories.includes(row.categorySlug))
      && (!options.city || String(row.location?.city || '').toLowerCase() === options.city.toLowerCase())
      && !exclude.has(String(row.publicId).toUpperCase()))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ signals */

/** Build preference signals from a user's own platform activity. */
export async function collectSignals(userId?: string | null, guestSignals?: { recentListingIds?: string[]; recentSearches?: string[]; city?: string }): Promise<Signals> {
  const categories: string[] = [];
  const cities: string[] = [];
  const prices: number[] = [];
  const seen: string[] = [];
  const searchTerms: string[] = [];

  const absorb = (listing: any) => {
    if (!listing) return;
    if (listing.categorySlug) categories.push(listing.categorySlug);
    if (listing.location?.city) cities.push(listing.location.city);
    const price = Number(listing.price?.toString?.() ?? listing.price ?? 0);
    if (price > 0) prices.push(price);
    if (listing.publicId) seen.push(String(listing.publicId).toUpperCase());
  };

  if (userId && connected()) {
    const [favorites, viewed, searches] = await Promise.all([
      Favorite.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
      RecentlyViewed.find({ userId }).sort({ viewedAt: -1 }).limit(20).lean(),
      RecentSearch.find({ userId }).sort({ searchedAt: -1 }).limit(10).lean(),
    ]);
    const ids = [...favorites, ...viewed].map((row: any) => row.listingPublicId).filter(Boolean);
    const listings = await Promise.all([...new Set(ids)].slice(0, 30).map((id) => findListingByPublicKey(String(id)).catch(() => null)));
    listings.forEach(absorb);
    searches.forEach((row: any) => { if (row.query) searchTerms.push(String(row.query)); });
  }

  // Guest / session signals — no account required to get relevant discovery.
  for (const id of (guestSignals?.recentListingIds || []).slice(0, 12)) {
    const listing = await findListingByPublicKey(String(id)).catch(() => null);
    absorb(listing);
  }
  (guestSignals?.recentSearches || []).slice(0, 6).forEach((term) => { if (term) searchTerms.push(String(term)); });
  if (guestSignals?.city) cities.push(guestSignals.city);

  const uniqueCategories = rank(categories);
  const uniqueCities = rank(cities);
  const priceBand = prices.length >= 2
    ? { min: Math.round(Math.min(...prices) * 0.6), max: Math.round(Math.max(...prices) * 1.4) }
    : prices.length === 1 ? { min: Math.round(prices[0] * 0.5), max: Math.round(prices[0] * 1.6) } : null;

  const strength = uniqueCategories.length * 2 + seen.length + searchTerms.length;
  return {
    categories: uniqueCategories,
    cities: uniqueCities,
    priceBand,
    seenPublicIds: [...new Set(seen)],
    searchTerms: [...new Set(searchTerms)].slice(0, 5),
    // "Recommended for you" requires meaningful evidence, not a single page view.
    hasSignals: strength >= 3,
    strength,
  };
}

function rank(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value).slice(0, 5);
}

/* ------------------------------------------------------------------ ranking */

/**
 * Transparent ranking. Promoted listings may receive a bounded boost but are only
 * eligible when they are already relevant to the signal set.
 */
export function scoreListing(listing: any, signals: Signals) {
  const price = Number(listing.price?.toString?.() ?? listing.price ?? 0);
  let score = 0;
  const reasons: string[] = [];

  if (signals.categories.includes(listing.categorySlug)) {
    const rankIndex = signals.categories.indexOf(listing.categorySlug);
    score += 40 - rankIndex * 5;
    reasons.push('Matches a category you browse');
  }
  if (listing.location?.city && signals.cities.some((city) => city.toLowerCase() === String(listing.location.city).toLowerCase())) {
    score += 18;
    reasons.push('Near your usual location');
  }
  if (signals.priceBand && price >= signals.priceBand.min && price <= signals.priceBand.max) {
    score += 14;
    reasons.push('In your usual price range');
  }
  if (signals.searchTerms.some((term) => String(listing.title || '').toLowerCase().includes(term.toLowerCase()))) {
    score += 16;
    reasons.push('Matches a recent search');
  }

  // Freshness
  const published = new Date(listing.publishedAt || listing.createdAt || Date.now()).getTime();
  const ageDays = Math.max(0, (Date.now() - published) / 86_400_000);
  score += Math.max(0, 12 - ageDays * 0.4);

  // Listing quality (completeness) and engagement
  const media = listing.media?.length || (listing.coverImage ? 1 : 0);
  if (media >= 3) score += 6; else if (media >= 1) score += 3;
  if (String(listing.description || '').length > 120) score += 4;
  score += Math.min(10, Math.log10(Math.max(1, listing.viewCount || 0)) * 4);

  // Availability is a hard requirement, not a score.
  if (listing.availability && listing.availability !== 'available') score = -1;
  if (listing.status && listing.status !== 'published') score = -1;

  // Bounded promoted boost, only when otherwise relevant.
  const promoted = Boolean(listing.isPromoted || listing.promotion?.status === 'active');
  if (promoted && score > 0) score += 8;

  return { score, reasons, promoted };
}

function present(rows: Array<{ listing: any; score: number; reasons: string[] }>, limit: number): PublicAiListing[] {
  const output: PublicAiListing[] = [];
  for (const row of rows) {
    if (output.length >= limit) break;
    if (row.score < 0) continue;
    const listing = presentAiListing(row.listing);
    if (!listing) continue;
    output.push({ ...listing, score: Number(row.score.toFixed(2)), reason: row.reasons[0] });
  }
  return output;
}

/* ------------------------------------------------------------------ service */

export const RecommendationService = {
  /** Personalised feed for a signed-in user (or a session with real signals). */
  async getForUser(input: { userId?: string | null; limit?: number; guestSignals?: { recentListingIds?: string[]; recentSearches?: string[]; city?: string }; exclude?: string[] } = {}) {
    const limit = Math.min(input.limit || 8, 24);
    const key = `forUser:${input.userId || 'guest'}:${limit}:${JSON.stringify(input.guestSignals || {})}:${(input.exclude || []).join(',')}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    const signals = await collectSignals(input.userId, input.guestSignals);
    const exclude = [...signals.seenPublicIds, ...(input.exclude || [])];
    const pool = await availableListings({ categories: signals.categories, limit: 80, excludePublicIds: exclude });
    const widePool = pool.length >= limit ? pool : [...pool, ...(await availableListings({ limit: 80, excludePublicIds: [...exclude, ...pool.map((item: any) => item.publicId)] }))];

    const scored = widePool.map((listing: any) => ({ listing, ...scoreListing(listing, signals) })).sort((a, b) => b.score - a.score);
    const listings = present(scored, limit);

    const payload = {
      listings,
      personalized: signals.hasSignals,
      coldStart: !signals.hasSignals,
      // No fake personalisation: the title changes when signals are insufficient.
      title: signals.hasSignals ? 'Recommended for You' : 'Popular Near You',
      basis: signals.hasSignals
        ? 'Based on listings you viewed, saved and searched on QAVLIO.'
        : 'Based on popular QAVLIO listings — we do not have enough activity to personalise this yet.',
      signals: { categories: signals.categories, cities: signals.cities, strength: signals.strength },
    };
    return cacheSet(key, payload);
  },

  /** Semantic + attribute similarity for a specific listing. */
  async getSimilarListings(listingKey: string, options: { limit?: number } = {}) {
    const limit = Math.min(options.limit || 8, 24);
    const key = `similar:${String(listingKey).toUpperCase()}:${limit}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    const reference: any = await findListingByPublicKey(String(listingKey)).catch(() => null);
    if (!reference) return { listings: [], reference: null, basis: 'That listing could not be found on QAVLIO.' };

    let hits: Array<{ listing: any; score: number }> = [];
    try {
      hits = await VectorSearchService.searchSimilar(reference, { limit: limit * 2 });
    } catch { hits = []; }

    if (!hits.length) {
      const fallback = await availableListings({ categories: reference.categorySlug ? [reference.categorySlug] : undefined, limit: 40, excludePublicIds: [reference.publicId] });
      hits = fallback.map((listing: any) => ({ listing, score: 0 }));
    }

    const referencePrice = Number(reference.price?.toString?.() ?? reference.price ?? 0);
    const scored = hits.map(({ listing, score }) => {
      const price = Number(listing.price?.toString?.() ?? listing.price ?? 0);
      const reasons: string[] = [];
      let total = score * 100;
      if (listing.categorySlug === reference.categorySlug) { total += 25; reasons.push('Same category'); }
      if (referencePrice && price) {
        const delta = Math.abs(price - referencePrice) / referencePrice;
        if (delta <= 0.25) { total += 18; reasons.push('Similar price'); }
        else if (delta <= 0.5) total += 8;
      }
      if (listing.location?.city && reference.location?.city && String(listing.location.city).toLowerCase() === String(reference.location.city).toLowerCase()) {
        total += 12;
        reasons.push('Nearby location');
      }
      if (listing.condition && listing.condition === reference.condition) { total += 6; reasons.push('Same condition'); }
      if (listing.availability && listing.availability !== 'available') total = -1;
      if (!reasons.length) reasons.push('Related listing');
      return { listing, score: total, reasons };
    }).sort((a, b) => b.score - a.score);

    const payload = {
      reference: presentAiListing(reference),
      listings: present(scored, limit),
      basis: 'Similar QAVLIO listings matched on category, attributes, price and location.',
    };
    return cacheSet(key, payload);
  },

  /** Genuinely trending: engagement over recently published, real listings. */
  async getTrending(options: { limit?: number; city?: string; categorySlug?: string } = {}) {
    const limit = Math.min(options.limit || 8, 24);
    const key = `trending:${options.city || ''}:${options.categorySlug || ''}:${limit}`;
    const cached = cacheGet(key);
    if (cached) return cached;

    let pool = await availableListings({ categories: options.categorySlug ? [options.categorySlug] : undefined, city: options.city, limit: 80 });
    if (!pool.length && options.city) pool = await availableListings({ categories: options.categorySlug ? [options.categorySlug] : undefined, limit: 80 });

    const scored = pool.map((listing: any) => {
      const ageDays = Math.max(0.5, (Date.now() - new Date(listing.publishedAt || listing.createdAt || Date.now()).getTime()) / 86_400_000);
      const engagement = (listing.viewCount || 0) + (listing.favoriteCount || 0) * 4 + (listing.messagesCount || 0) * 6;
      const score = engagement / Math.sqrt(ageDays);
      return { listing, score, reasons: [options.city ? `Popular in ${options.city}` : 'Popular on QAVLIO'] };
    }).sort((a, b) => b.score - a.score);

    const payload = {
      listings: present(scored, limit),
      title: options.city ? `Trending Near You` : 'Trending on QAVLIO',
      basis: 'Ranked by real views, favourites and messages on QAVLIO listings.',
    };
    return cacheSet(key, payload);
  },

  /** "Because You Viewed" — anchored on a listing the user actually opened. */
  async getBecauseYouViewed(input: { userId?: string | null; limit?: number; guestSignals?: { recentListingIds?: string[] } } = {}) {
    const limit = Math.min(input.limit || 8, 24);
    let anchorId: string | null = null;

    if (input.userId && connected()) {
      const recent: any = await RecentlyViewed.findOne({ userId: input.userId }).sort({ viewedAt: -1 }).lean();
      anchorId = recent?.listingPublicId || null;
    }
    if (!anchorId) anchorId = input.guestSignals?.recentListingIds?.[0] || null;
    if (!anchorId) return { listings: [], anchor: null, title: 'Because You Viewed', basis: 'View a listing and related items will appear here.' };

    const similar = await this.getSimilarListings(anchorId, { limit });
    return {
      listings: similar.listings,
      anchor: similar.reference,
      title: similar.reference ? `Because you viewed ${similar.reference.title}` : 'Because You Viewed',
      basis: 'Matched to the last QAVLIO listing you opened.',
    };
  },

  /** "Based on Your Searches" — re-runs the user's own saved/recent queries. */
  async getBecauseYouSearched(input: { userId?: string | null; limit?: number; guestSignals?: { recentSearches?: string[] } } = {}) {
    const limit = Math.min(input.limit || 8, 24);
    const terms: string[] = [];
    if (input.userId && connected()) {
      const rows = await RecentSearch.find({ userId: input.userId }).sort({ searchedAt: -1 }).limit(5).lean();
      rows.forEach((row: any) => { if (row.query) terms.push(String(row.query)); });
    }
    (input.guestSignals?.recentSearches || []).forEach((term) => { if (term) terms.push(String(term)); });

    const unique = [...new Set(terms)].slice(0, 3);
    if (!unique.length) return { listings: [], terms: [], title: 'Based on Your Searches', basis: 'Search for something and matching listings will appear here.' };

    const collected: any[] = [];
    for (const term of unique) {
      const result = await searchListings({ q: term, sort: 'recommended', page: 1, limit: Math.ceil(limit / unique.length) + 2 });
      collected.push(...result.listings);
    }
    const seen = new Set<string>();
    const listings: PublicAiListing[] = [];
    for (const item of collected) {
      if (listings.length >= limit) break;
      const id = String((item as any).publicId).toUpperCase();
      if (seen.has(id)) continue;
      seen.add(id);
      const listing = presentAiListing(item);
      if (listing) listings.push({ ...listing, reason: `Matches “${unique[0]}”` });
    }

    return { listings, terms: unique, title: 'Based on Your Searches', basis: `Re-ran your recent QAVLIO searches: ${unique.join(', ')}.` };
  },

  /** Listings similar to what the user favourited. */
  async getSimilarToFavorites(input: { userId?: string | null; limit?: number } = {}) {
    const limit = Math.min(input.limit || 8, 24);
    if (!input.userId || !connected()) return { listings: [], title: 'Similar to Your Favorites', basis: 'Save a listing and similar items will appear here.' };
    const favorite: any = await Favorite.findOne({ userId: input.userId }).sort({ createdAt: -1 }).lean();
    if (!favorite?.listingPublicId) return { listings: [], title: 'Similar to Your Favorites', basis: 'Save a listing and similar items will appear here.' };
    const similar = await this.getSimilarListings(favorite.listingPublicId, { limit });
    return { listings: similar.listings, title: 'Similar to Your Favorites', basis: 'Matched to a listing you saved on QAVLIO.' };
  },

  /** Homepage bundle used by RecommendationSection. */
  async getHomeSections(input: { userId?: string | null; city?: string; guestSignals?: { recentListingIds?: string[]; recentSearches?: string[]; city?: string }; limit?: number } = {}) {
    const limit = Math.min(input.limit || 8, 12);
    const [forYou, viewed, searched, favorites, trending] = await Promise.all([
      this.getForUser({ userId: input.userId, limit, guestSignals: input.guestSignals }),
      this.getBecauseYouViewed({ userId: input.userId, limit, guestSignals: input.guestSignals }),
      this.getBecauseYouSearched({ userId: input.userId, limit, guestSignals: input.guestSignals }),
      this.getSimilarToFavorites({ userId: input.userId, limit }),
      this.getTrending({ limit, city: input.city || input.guestSignals?.city }),
    ]);

    const sections = [
      { id: 'for-you', title: forYou.title, basis: forYou.basis, personalized: forYou.personalized, listings: forYou.listings },
      { id: 'because-you-viewed', title: viewed.title, basis: viewed.basis, personalized: true, listings: viewed.listings },
      { id: 'because-you-searched', title: searched.title, basis: searched.basis, personalized: true, listings: searched.listings },
      { id: 'similar-to-favorites', title: favorites.title, basis: favorites.basis, personalized: true, listings: favorites.listings },
      { id: 'trending', title: input.city || input.guestSignals?.city ? 'Trending Near You' : trending.title, basis: trending.basis, personalized: false, listings: trending.listings },
    ].filter((section) => section.listings.length > 0);

    return { sections, personalized: forYou.personalized, coldStart: forYou.coldStart };
  },
};

/* --------------------------------------------------- backwards-compatible API */

/** Retained for Phase 10 callers (AI tools, chat). Now backed by the Phase 16 engine. */
export async function recommendListings(input: { userId?: string | null; category?: string; currentSearch?: string; exclude?: string[]; limit?: number }) {
  const limit = Math.min(input.limit || 8, 12);
  if (input.category || input.currentSearch) {
    const guestSignals = { recentSearches: input.currentSearch ? [input.currentSearch] : [] };
    const scoped = input.category
      ? await RecommendationService.getTrending({ limit, categorySlug: input.category })
      : await RecommendationService.getBecauseYouSearched({ userId: input.userId, limit, guestSignals });
    if (scoped.listings.length) {
      return {
        listings: scoped.listings,
        personalized: Boolean(input.userId),
        coldStart: !input.userId,
        sections: [{ id: 'scoped', title: scoped.title || 'Related listings', listings: scoped.listings.slice(0, limit) }],
      };
    }
  }

  const result = await RecommendationService.getForUser({ userId: input.userId, limit, exclude: input.exclude });
  return {
    listings: result.listings,
    personalized: result.personalized,
    coldStart: result.coldStart,
    basis: result.basis,
    sections: result.personalized
      ? [
        { id: 'interests', title: 'Recommended for You', listings: result.listings.slice(0, 4) },
        { id: 'more', title: 'You may also like', listings: result.listings.slice(4, 8) },
      ]
      : [
        { id: 'popular', title: 'Popular Near You', listings: result.listings.slice(0, 4) },
        { id: 'trending', title: 'Recently Listed', listings: result.listings.slice(4, 8) },
      ],
  };
}
