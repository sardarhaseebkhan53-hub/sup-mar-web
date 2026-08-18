import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { findCityByName, haversineKm } from '../constants/locations.js';
import { listFavorites } from './favoriteService.js';
import { listFollowing } from './followService.js';
import { getPublishedMemoryListings, listPublicListingsBySeller, presentPublicListing, relatedListings } from './listingService.js';
import { listRecentlyViewed } from './recentlyViewedService.js';
import { listRecentSearches } from './recentSearchService.js';
import { listSavedSearches } from './savedSearchService.js';
import { searchListings } from './searchService.js';

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item: any) => item.status === 'published');
}

function exclude(rows: any[], ids: Set<string>) {
  return rows.filter((item) => !ids.has(item.publicId));
}

export async function listingDiscovery(listing: any, limit = 8) {
  // Phase 16 — similar items are ranked semantically over real listings by the vector search service.
  const { getVectorSearch } = await import('./vectorSearchService.js');
  const semantic = await getVectorSearch().searchSimilar(listing, limit).catch(async () => []);
  const similar = semantic.length
    ? semantic.map((item) => presentPublicListing(item.listing))
    : await relatedListings(listing, limit);
  const moreFromSeller = listing.sellerId ? await listPublicListingsBySeller(String(listing.sellerId), 'newest', listing.publicId, 4) : [];
  const used = new Set([listing.publicId, ...similar.map((item: any) => item.publicId), ...moreFromSeller.map((item: any) => item.publicId)]);
  const also = catalog()
    .filter((item: any) => !used.has(item.publicId))
    .sort((a: any, b: any) => Number(Boolean(b.isPromoted)) - Number(Boolean(a.isPromoted)) || (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 4)
    .map(presentPublicListing);
  return { similar, moreFromSeller, youMayAlsoLike: also };
}

export async function personalizedHome(userId?: string | null, city?: string) {
  const sections: Array<{ id: string; title: string; listings?: any[]; sellers?: any[]; searches?: any[] }> = [];
  const used = new Set<string>();
  if (userId) {
    const viewed = await listRecentlyViewed(userId, 8);
    if (viewed.length) {
      sections.push({ id: 'continue', title: 'Continue Browsing', listings: viewed });
      viewed.forEach((item: any) => used.add(item.publicId));
    }
    const favorites = await listFavorites(userId, 1, 8);
    const availableFavorites = (favorites.listings || []).filter((item: any) => !item.unavailable && !used.has(item.publicId));
    if (availableFavorites.length) {
      sections.push({ id: 'favorites', title: 'Your Favorites', listings: availableFavorites.slice(0, 4) });
      availableFavorites.forEach((item: any) => used.add(item.publicId));
    }
    const searches = await listSavedSearches(userId);
    const basedOn: any[] = [];
    for (const search of searches.slice(0, 2)) {
      const result = await searchListings({
        q: search.query || undefined,
        category: search.categoryId || undefined,
        location: search.location || undefined,
        minPrice: search.minPrice ?? undefined,
        maxPrice: search.maxPrice ?? undefined,
        sort: 'newest',
        page: 1,
        limit: 6,
      });
      basedOn.push(...exclude(result.listings, used));
    }
    if (!basedOn.length) {
      const recent = await listRecentSearches(userId);
      for (const search of recent.slice(0, 2)) {
        if (!search.query) continue;
        const result = await searchListings({ q: search.query, sort: 'newest', page: 1, limit: 4 });
        basedOn.push(...exclude(result.listings, used));
      }
    }
    const uniqueBased = basedOn.filter((item, index, rows) => rows.findIndex((entry) => entry.publicId === item.publicId) === index).slice(0, 4);
    if (uniqueBased.length) {
      sections.push({ id: 'searches', title: 'Based on Your Searches', listings: uniqueBased.map((item) => item.publicId ? item : presentPublicListing(item)) });
      uniqueBased.forEach((item: any) => used.add(item.publicId));
    }
    const recommended = exclude(catalog(), used).sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4).map(presentPublicListing);
    if (recommended.length) {
      sections.push({ id: 'recommended', title: 'Recommended for You', listings: recommended });
      recommended.forEach((item: any) => used.add(item.publicId));
    }
    const following = await listFollowing(userId);
    if (following.sellers.length) sections.push({ id: 'following', title: 'Followed Sellers', sellers: following.sellers.slice(0, 6) });
  }
  if (city) {
    const origin = findCityByName(city);
    const nearby = catalog()
      .filter((item: any) => !used.has(item.publicId))
      .map((item: any) => {
        const target = findCityByName(item.location?.city);
        const distance = origin && target ? haversineKm(origin, target) : item.location?.city?.toLowerCase() === city.toLowerCase() ? 0 : 9999;
        return { item, distance };
      })
      .filter((entry) => entry.distance <= 80)
      .sort((a, b) => a.distance - b.distance || +new Date(b.item.createdAt) - +new Date(a.item.createdAt))
      .slice(0, 4)
      .map((entry) => presentPublicListing(entry.item));
    if (nearby.length) sections.push({ id: 'near', title: 'New Near You', listings: nearby });
  }
  return { sections };
}
