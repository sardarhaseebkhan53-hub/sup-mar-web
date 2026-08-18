import mongoose from 'mongoose';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { findCityByName, haversineKm } from '../constants/locations.js';
import { Favorite } from '../models/Favorite.js';
import { Listing } from '../models/Listing.js';
import { RecentlyViewed } from '../models/RecentlyViewed.js';
import { RecentSearch } from '../models/RecentSearch.js';
import { presentAiListing } from '../ai/listings.js';
import { getPublishedMemoryListings, findListingByPublicKey } from './listingService.js';
import { searchListings } from './searchService.js';
import { getVectorSearch } from './vectorSearchService.js';

/**
 * RecommendationService (Phase 16 §19–25, §46).
 * Signals: views, favorites, searches, categories, location, price ranges, recently viewed,
 * saved searches. Guests get non-account session signals passed explicitly — no login required.
 * No fake personalization: without meaningful signals we return honestly-labeled popular or
 * trending sections instead of claiming "for you".
 */

export type RecommendationListing = NonNullable<ReturnType<typeof presentAiListing>>;

export type RecommendationSection = {
  id: string;
  title: string;
  subtitle: string;
  personalized: boolean;
  basis?: string;
  listings: RecommendationListing[];
};

export type GuestSignals = {
  categories?: string[];
  searches?: string[];
  viewed?: string[];
  location?: string;
};

export type RecommendationInput = {
  userId?: string | null;
  guestKey?: string | null;
  guestSignals?: GuestSignals | null;
  location?: string | null;
  currentSearch?: string;
  category?: string;
  exclude?: string[];
  limit?: number;
};

const connected = () => mongoose.connection.readyState === 1;

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()];
}

async function candidatePool(categories: Set<string>, limit = 60): Promise<any[]> {
  if (connected()) {
    const query: any = { status: 'published', availability: 'available' };
    if (categories.size) query.categorySlug = { $in: [...categories] };
    return Listing.find(query).sort({ isPromoted: -1, viewCount: -1, publishedAt: -1 }).limit(limit).select('-moderation -reportCount').lean();
  }
  return catalog()
    .filter((item: any) => item.status === 'published' && (!categories.size || categories.has(item.categorySlug)))
    .sort((a: any, b: any) => Number(Boolean(b.isPromoted)) - Number(Boolean(a.isPromoted)) || (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, limit);
}

type RankContext = {
  preferredCategories: Set<string>;
  budget?: [number, number];
  city?: string;
  exclude: Set<string>;
  recentPublicIds?: string[];
};

/**
 * Ranking (§24): relevance → freshness → location → price compatibility → behavior → quality →
 * availability. Promoted listings get a small boost but must still clear the relevance bar.
 */
function rankListings(rows: any[], context: RankContext, limit: number) {
  const now = Date.now();
  return rows
    .filter((row) => !context.exclude.has(row.publicId))
    .map((row) => {
      const price = Number(row.price?.toString?.() ?? row.price ?? 0);
      let score = 0;
      const reasons: string[] = [];

      if (context.preferredCategories.has(row.categorySlug)) {
        score += 0.3;
        reasons.push('matches your interests');
      }
      const ageDays = Math.max(0, (now - +(row.publishedAt || row.createdAt || now)) / 86_400_000);
      score += Math.max(0, 0.2 * (1 - Math.min(1, ageDays / 30)));
      if (ageDays <= 7) reasons.push('freshly listed');

      if (context.city) {
        const distance = cityDistance(context.city, row.location?.city);
        if (distance !== null) {
          score += Math.max(0, 0.2 * (1 - Math.min(1, distance / 150)));
          if (distance <= 50) reasons.push('near you');
        }
      }

      if (context.budget && price > 0) {
        const [min, max] = context.budget;
        if (price >= min && price <= max) {
          score += 0.2;
          reasons.push('in your usual price range');
        } else {
          const overshoot = price > max ? price / Math.max(1, max) : min / Math.max(1, price);
          if (overshoot > 2.5) score -= 0.15;
        }
      }

      score += Math.min(0.15, Math.log10(1 + (row.viewCount || 0)) / 20);
      if (context.recentPublicIds?.includes(row.publicId)) score -= 0.4; // don't re-show just-viewed items
      if (row.isPromoted) score += 0.05;

      return { row, score, reasons };
    })
    .sort((a, b) => b.score - a.score || (b.row.viewCount || 0) - (a.row.viewCount || 0))
    .slice(0, limit)
    .map((entry) => {
      const listing = presentAiListing(entry.row);
      return listing ? { listing, reasons: entry.reasons } : null;
    })
    .filter((item): item is { listing: RecommendationListing; reasons: string[] } => Boolean(item));
}

function cityDistance(from: string, to: string | undefined): number | null {
  if (!to) return null;
  const origin = findCityByName(from);
  const target = findCityByName(to);
  if (!origin || !target) return from.toLowerCase() === to.toLowerCase() ? 0 : null;
  return haversineKm(origin, target);
}

/* ---------------------------------- signals ---------------------------------- */

async function userSignals(userId?: string | null) {
  if (!userId || !connected()) return { favoriteRows: [] as any[], viewedRows: [] as any[], searchRows: [] as any[] };
  const [favoriteRows, viewedRows, searchRows] = await Promise.all([
    Favorite.find({ userId }).sort({ createdAt: -1 }).limit(20).populate('listingId').lean().catch(() => []),
    RecentlyViewed.find({ userId }).sort({ viewedAt: -1 }).limit(20).lean().catch(() => []),
    RecentSearch.find({ userId }).sort({ searchedAt: -1 }).limit(10).lean().catch(() => []),
  ]);
  return { favoriteRows, viewedRows, searchRows };
}

function priceBandOf(rows: any[]): [number, number] | undefined {
  const prices = rows.map((row) => Number(row?.listingId?.price ?? row?.price ?? 0)).filter((value) => value > 0);
  if (prices.length < 2) return undefined;
  prices.sort((a, b) => a - b);
  const p25 = prices[Math.floor(prices.length * 0.25)];
  const p75 = prices[Math.floor(prices.length * 0.75)];
  return [Math.max(0, p25 * 0.6), p75 * 1.5];
}

/* --------------------------------- service ---------------------------------- */

export class RecommendationService {
  /** Homepage / profile feed. Honestly labeled — cold start sections never claim personalization. */
  async getForUser(input: RecommendationInput): Promise<{ sections: RecommendationSection[]; personalized: boolean; coldStart: boolean }> {
    const sections: RecommendationSection[] = [];
    const exclude = new Set(input.exclude || []);
    const { favoriteRows, viewedRows, searchRows } = await userSignals(input.userId);
    const guest = input.guestSignals || {};

    const viewedListings = viewedRows.map((row: any) => row.listingId || row).filter(Boolean);
    const favoriteListings = favoriteRows.map((row: any) => row.listingId).filter(Boolean);

    // Because You Viewed — needs real signals (account or guest session).
    const viewedPublicIds = [...new Set([...viewedListings.map((item: any) => item.publicId), ...(guest.viewed || [])])];
    if (viewedPublicIds.length) {
      const seedKey = viewedPublicIds[viewedPublicIds.length - 1];
      const seed: any = await findListingByPublicKey(seedKey);
      if (seed) {
        const similar = await this.getSimilarListings(seed.publicId, 4);
        const listings = similar.filter((item) => !exclude.has(item.listing.publicId)).map((item) => item.listing);
        if (listings.length) {
          listings.forEach((item) => exclude.add(item.publicId));
          sections.push({ id: 'because-viewed', title: 'Because You Viewed', subtitle: `Similar to ${seed.title}`, personalized: true, basis: 'Built from your recently viewed QAVLIO listings.', listings: listings.slice(0, 4) });
        }
      }
    }

    // Based on Your Searches — recent searches that actually return listings.
    const searchTerms = [...new Set([...searchRows.map((row: any) => row.query).filter(Boolean), ...(guest.searches || [])])].slice(0, 3);
    if (searchTerms.length) {
      const results: RecommendationListing[] = [];
      for (const term of searchTerms) {
        if (results.length >= 4) break;
        const found = await searchListings({ q: term, sort: 'recommended', page: 1, limit: 4, excludeListingIds: [...exclude] });
        for (const row of found.listings) {
          const listing = presentAiListing(row);
          if (listing && !exclude.has(listing.publicId)) {
            results.push(listing);
            exclude.add(listing.publicId);
          }
        }
      }
      if (results.length) sections.push({ id: 'because-searched', title: 'Based on Your Searches', subtitle: searchTerms.slice(0, 2).join(' · '), personalized: true, basis: 'Built from your recent QAVLIO searches.', listings: results.slice(0, 4) });
    }

    // Similar to Your Favorites.
    if (favoriteListings.length) {
      const seed: any = favoriteListings[0];
      if (seed?.publicId) {
        const similar = await this.getSimilarListings(seed.publicId, 4);
        const listings = similar.filter((item) => !exclude.has(item.listing.publicId)).map((item) => item.listing);
        if (listings.length) {
          listings.forEach((item) => exclude.add(item.publicId));
          sections.push({ id: 'like-favorites', title: 'Similar to Your Favorites', subtitle: `Because you saved ${seed.title}`, personalized: true, basis: 'Built from your favorited QAVLIO listings.', listings: listings.slice(0, 4) });
        }
      }
    }

    const preferredCategories = new Set<string>([
      ...viewedListings.map((item: any) => item.categorySlug).filter(Boolean),
      ...favoriteListings.map((item: any) => item.categorySlug).filter(Boolean),
      ...(guest.categories || []),
    ]);
    if (input.category) preferredCategories.add(input.category);

    const personalized = sections.length > 0;
    const band = priceBandOf([...viewedListings.map((row: any) => ({ listingId: row })), ...favoriteRows]);
    const viewedPublicIdSet = viewedPublicIds;

    // Recommended for You / Popular Near You (honest fallback) — §25.
    const pool = await candidatePool(preferredCategories.size ? preferredCategories : new Set(), 80);
    const city = input.location || input.guestSignals?.location || viewedListings.map((item: any) => item.location?.city).find(Boolean) || guest.location;
    const ranked = rankListings(pool, { preferredCategories, budget: band, city, exclude, recentPublicIds: viewedPublicIdSet }, 8);
    if (ranked.length) {
      ranked.forEach((item) => exclude.add(item.listing.publicId));
      sections.push(personalized
        ? { id: 'for-you', title: 'Recommended for You', subtitle: 'From your QAVLIO activity', personalized: true, basis: 'Built from your categories, price ranges, and location signals.', listings: ranked.map((item) => item.listing).slice(0, 4) }
        : { id: 'popular', title: 'Popular Near You', subtitle: 'Trending QAVLIO listings while we learn what you like', personalized: false, basis: 'Most viewed QAVLIO listings right now.', listings: ranked.map((item) => item.listing).slice(0, 4) });
    }

    // Trending Near You (§19) — location-weighted popularity; falls back to network-wide trending.
    const trending = await this.getTrending(4, city, [...exclude]);
    if (trending.length) sections.push({ id: 'trending-near', title: city ? `Trending Near ${city}` : 'Trending on QAVLIO', subtitle: 'Popular in the last 30 days', personalized: false, basis: 'Built from real QAVLIO view activity.', listings: trending.map((item) => item.listing) });

    return { sections, personalized, coldStart: !personalized };
  }

  /** Similar-item matching (§26) via the vector search service over real listings. */
  async getSimilarListings(listingId: string, limit = 8, location?: string) {
    const listing: any = await findListingByPublicKey(listingId);
    if (!listing) return [];
    return getVectorSearch().searchSimilar(listing, limit, location);
  }

  /** Trending: real view counts with freshness weighting; optionally near a city. */
  async getTrending(limit = 8, city?: string, exclude: string[] = []) {
    const pool = await candidatePool(new Set(), 120);
    const ranked = rankListings(pool, { preferredCategories: new Set(), city, exclude: new Set(exclude) }, limit);
    return ranked.map((item) => ({ listing: item.listing, reasons: item.reasons.length ? item.reasons : ['popular on QAVLIO'] }));
  }

  /** Because You Viewed, standalone (used by the API surface and AI tools). */
  async getBecauseYouViewed(input: RecommendationInput, limit = 4) {
    const { viewedRows } = await userSignals(input.userId);
    const viewed = viewedRows.map((row: any) => row.listingId || row).filter(Boolean);
    const guestViewed = input.guestSignals?.viewed || [];
    const ids = [...new Set([...viewed.map((item: any) => item.publicId), ...guestViewed])];
    if (!ids.length) return { listings: [] as RecommendationListing[], seed: null as string | null };
    const seed: any = await findListingByPublicKey(ids[ids.length - 1]);
    if (!seed) return { listings: [] as RecommendationListing[], seed: null as string | null };
    const similar = await this.getSimilarListings(seed.publicId, limit + 1, input.location || undefined);
    return { listings: similar.filter((item) => item.listing.publicId !== seed.publicId).slice(0, limit).map((item) => item.listing), seed: seed.title as string };
  }

  /** Because You Searched, standalone. */
  async getBecauseYouSearched(input: RecommendationInput, limit = 4) {
    const { searchRows } = await userSignals(input.userId);
    const terms = [...new Set([...searchRows.map((row: any) => row.query).filter(Boolean), ...(input.guestSignals?.searches || [])])].slice(0, 3);
    if (!terms.length && !input.currentSearch) return { listings: [] as RecommendationListing[], terms: [] as string[] };
    const effective = input.currentSearch && !terms.includes(input.currentSearch) ? [input.currentSearch, ...terms] : terms;
    const listings: RecommendationListing[] = [];
    const seen = new Set(input.exclude || []);
    for (const term of effective) {
      if (listings.length >= limit) break;
      const found = await searchListings({ q: term, sort: 'recommended', page: 1, limit: limit, excludeListingIds: [...seen] });
      for (const row of found.listings) {
        const listing = presentAiListing(row);
        if (listing && !seen.has(listing.publicId)) {
          listings.push(listing);
          seen.add(listing.publicId);
        }
      }
    }
    return { listings: listings.slice(0, limit), terms: effective.slice(0, 3) };
  }
}

/* --------------------------------- caching ----------------------------------- */

const RECOMMENDATION_TTL_MS = 60_000;
const recommendationCache = new Map<string, { at: number; payload: unknown }>();
let cacheVersion = 0;

function cacheKeyOf(input: RecommendationInput, scope: string) {
  return `${cacheVersion}|${scope}|${input.userId || input.guestKey || 'anon'}|${input.location || ''}|${input.category || ''}|${input.currentSearch || ''}|${(input.guestSignals?.categories || []).join(',')}|${(input.guestSignals?.searches || []).slice(0, 3).join(',')}|${(input.guestSignals?.viewed || []).slice(-3).join(',')}`;
}

async function cached<T>(scope: string, input: RecommendationInput, compute: () => Promise<T>): Promise<T> {
  const key = cacheKeyOf(input, scope);
  const hit = recommendationCache.get(key);
  if (hit && Date.now() - hit.at < RECOMMENDATION_TTL_MS) return hit.payload as T;
  const payload = await compute();
  if (recommendationCache.size > 300) recommendationCache.clear();
  recommendationCache.set(key, { at: Date.now(), payload });
  return payload;
}

/** §46 — invalidate when a listing is sold, removed, or meaningfully changes. */
export function invalidateRecommendations() {
  cacheVersion += 1;
  recommendationCache.clear();
}

export function __recommendationCacheStats() {
  return { entries: recommendationCache.size, version: cacheVersion };
}

let serviceSingleton: RecommendationService | null = null;
export function getRecommendationService(): RecommendationService {
  if (!serviceSingleton) serviceSingleton = new RecommendationService();
  return serviceSingleton;
}

/** Backward-compatible shape used by AI tools and the Phase 10 endpoints. */
export type LegacyRecommendationPayload = {
  listings: RecommendationListing[];
  personalized: boolean;
  coldStart: boolean;
  sections: Array<{ id: string; title: string; listings: RecommendationListing[] }>;
};

export async function recommendListings(input: RecommendationInput): Promise<LegacyRecommendationPayload> {
  const service = getRecommendationService();
  return cached('legacy', input, async (): Promise<LegacyRecommendationPayload> => {
    const feed = await service.getForUser({ ...input, limit: input.limit });
    const listings = feed.sections.flatMap((section) => section.listings).slice(0, Math.min(input.limit || 8, 12));
    const viewed = await service.getBecauseYouViewed(input, 4);
    return {
      listings,
      personalized: feed.personalized,
      coldStart: feed.coldStart,
      sections: feed.coldStart
        ? [
          { id: 'popular', title: 'Popular on QAVLIO', listings: listings.slice(0, 4) },
          { id: 'trending', title: 'Trending categories', listings: listings.slice(4, 8) },
        ]
        : [
          { id: 'interests', title: 'Based on your interests', listings: listings.slice(0, 4) },
          ...(viewed.listings.length ? [{ id: 'because-viewed', title: 'Because you viewed', listings: viewed.listings }] : []),
          { id: 'more', title: 'You may also like', listings: listings.slice(4, 8) },
        ],
    };
  });
}

export async function findRecommendableListing(listingKey: string) {
  const listing: any = await findListingByPublicKey(listingKey);
  return listing && ['published', 'paused', 'sold'].includes(listing.status || 'published') ? listing : null;
}
