import { presentAiListing } from '../ai/listings.js';
import { suggestCorrection } from '../ai/correction.js';
import { expandWithSynonyms } from '../ai/synonyms.js';
import { describeIntent, extractHeuristicIntent, intentExplanationChips, intentToSearchInput, mergeIntent, validateSearchIntent } from '../ai/intent.js';
import { getAiProvider, getHeuristicProvider } from '../ai/providerFactory.js';
import type { AppliedAiFilter, PublicAiListing, SearchIntent, ZeroResultSuggestions } from '../ai/types.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { CITIES, CATEGORY_ALIASES } from '../constants/aiPolicies.js';
import { citiesWithin } from '../constants/locations.js';
import { searchListings } from './searchService.js';

const SEARCH_CACHE_TTL_MS = 45_000;
const searchCache = new Map<string, { at: number; payload: AiSearchPayload }>();

export type AiSearchPayload = {
  intent: SearchIntent;
  query: string;
  interpreted: string[];
  explanation: string[];
  appliedFilters: AppliedAiFilter[];
  correction: { original: string; suggestion: string } | null;
  synonymExpansions: Array<{ alias: string; canonical: string }>;
  listings: PublicAiListing[];
  total: number;
  empty: boolean;
  fallbackSearch: boolean;
  zeroResult?: ZeroResultSuggestions;
  message?: string;
  suggestions: Array<{ label: string; payload: Record<string, string> }>;
  source?: string;
  cached?: boolean;
};

export function __resetAiSearchCache() {
  searchCache.clear();
}

/** Short-TTL cache so repeated AI searches (and AI assistant + page loads) deduplicate provider work. */
function cacheGet(key: string): AiSearchPayload | undefined {
  const hit = searchCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return undefined;
  }
  return hit.payload;
}

function cacheSet(key: string, payload: AiSearchPayload) {
  if (searchCache.size > 200) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 50);
    oldest.forEach(([k]) => searchCache.delete(k));
  }
  searchCache.set(key, { at: Date.now(), payload });
}

export async function extractValidatedIntent(query: string, previous?: SearchIntent | null, providerName?: string) {
  const heuristic = extractHeuristicIntent(query, previous);
  try {
    const provider = getAiProvider(providerName);
    const extracted = await provider.extractIntent(query, previous);
    return validateSearchIntent(mergeIntent(heuristic, extracted));
  } catch {
    return heuristic;
  }
}

export async function runAiSearch(query: string, previous?: SearchIntent | null, providerName?: string): Promise<AiSearchPayload> {
  const cleaned = String(query || '').trim().slice(0, 200);
  const cacheKey = `${cleaned.toLowerCase()}|${previous ? JSON.stringify(previous) : ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  let fallbackSearch = false;
  let intent: SearchIntent;
  try {
    intent = await extractValidatedIntent(cleaned, previous, providerName);
  } catch {
    intent = extractHeuristicIntent(cleaned, previous);
    fallbackSearch = true;
  }
  intent = validateSearchIntent({ ...intent, query: cleaned });

  // Controlled synonym expansion widens recall without rewriting the user's words.
  const synonyms = expandWithSynonyms(cleaned);
  let primary = await searchListings(intentToSearchInput(intent, 1, 8));
  if (!primary.total && synonyms.expansions.length) {
    const expanded = validateSearchIntent({ ...intent, keywords: [intent.keywords, ...synonyms.expansions.map((item) => item.canonical)].filter(Boolean).join(' ') });
    const widened = await searchListings(intentToSearchInput(expanded, 1, 8));
    if (widened.total) primary = widened;
  }

  let result = primary;
  if (!result.total && (intent.category || intent.attributes || intent.minYear || intent.maxYear)) {
    const relaxed = await searchListings(intentToSearchInput({ ...intent, attributes: undefined, minYear: undefined, maxYear: undefined }, 1, 8));
    if (relaxed.total) result = relaxed;
  }
  if (!result.total && (intent.keywords || intent.model)) {
    const keywordOnly = await searchListings({ q: [intent.model, intent.keywords].filter(Boolean).join(' '), sort: 'recommended', page: 1, limit: 8 });
    if (keywordOnly.total) {
      result = keywordOnly;
      fallbackSearch = true;
    }
  }
  // Descriptive noise ("for university", "for my sister") should not zero-out a good category match.
  if (!result.total && intent.category) {
    const categoryOnly = await searchListings(intentToSearchInput({ ...intent, keywords: undefined, model: undefined, attributes: undefined, minYear: undefined, maxYear: undefined }, 1, 8));
    if (categoryOnly.total) {
      result = categoryOnly;
      fallbackSearch = true;
    }
  }

  const listings = result.listings.map(presentAiListing).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const empty = listings.length === 0;
  const payload = empty
    ? {
      intent,
      query: cleaned,
      interpreted: describeIntent(intent),
      explanation: intentExplanationChips(intent),
      appliedFilters: appliedFiltersFor(intent),
      correction: suggestCorrection(cleaned),
      synonymExpansions: synonyms.expansions,
      listings: [],
      total: 0,
      empty,
      fallbackSearch,
      zeroResult: await buildZeroResultSuggestions(intent, cleaned),
      message: 'No exact matches found.',
      suggestions: [],
    }
    : {
      intent,
      query: cleaned,
      interpreted: describeIntent(intent),
      explanation: intentExplanationChips(intent),
      appliedFilters: appliedFiltersFor(intent),
      correction: suggestCorrection(cleaned),
      synonymExpansions: synonyms.expansions,
      listings,
      total: result.total,
      empty,
      fallbackSearch,
      source: `Based on ${result.total} QAVLIO listing${result.total === 1 ? '' : 's'}.`,
      suggestions: filterSuggestions(intent),
    };
  if (!empty) cacheSet(cacheKey, payload);
  return payload;
}

/** Structured, user-adjustable applied filters (§13): each maps to a normal QAVLIO search param. */
export function appliedFiltersFor(intent: SearchIntent): AppliedAiFilter[] {
  const chips: AppliedAiFilter[] = [];
  const push = (key: string, label: string, value: string, param: string) => chips.push({ key, label, value, param, removable: true });
  if (intent.category) {
    const category = DEFAULT_CATEGORIES.find((item) => item.slug === intent.category);
    push('category', 'Category', category?.name || intent.category, 'category');
  }
  if (intent.brand) push('brand', 'Brand', intent.brand, 'brand');
  if (intent.model) push('model', 'Model', intent.model, 'q');
  if (intent.keywords) push('keywords', 'Keywords', intent.keywords, 'q');
  if (intent.minPrice !== undefined) push('minPrice', 'Min price', `Rs. ${intent.minPrice.toLocaleString('en-PK')}`, 'minPrice');
  if (intent.maxPrice !== undefined) push('maxPrice', 'Max price', `Rs. ${intent.maxPrice.toLocaleString('en-PK')}`, 'maxPrice');
  if (intent.minYear !== undefined) push('minYear', 'From year', String(intent.minYear), 'minYear');
  if (intent.maxYear !== undefined) push('maxYear', 'To year', String(intent.maxYear), 'maxYear');
  (intent.condition || []).forEach((value) => push(`condition:${value}`, 'Condition', value.replace('-', ' '), 'condition'));
  if (intent.location) push('location', 'Location', intent.location, 'location');
  Object.entries(intent.attributes || {}).forEach(([key, value]) => push(`attr:${key}`, key, String(value), `attr.${key}`));
  return chips.slice(0, 12);
}

/**
 * Zero-result recovery (§12): every suggestion is built from real marketplace structure —
 * categories that actually contain listings, searches that return results, a price band with
 * matches, and real nearby cities. Nothing is fabricated.
 */
async function buildZeroResultSuggestions(intent: SearchIntent, query: string): Promise<ZeroResultSuggestions> {
  const relatedCategories: ZeroResultSuggestions['relatedCategories'] = [];
  const keywords = intent.keywords || intent.model || query;

  const categoryCandidates = intent.category
    ? [intent.category, ...DEFAULT_CATEGORIES.filter((item) => item.slug !== intent.category).slice(0, 6).map((item) => item.slug)]
    : DEFAULT_CATEGORIES.slice(0, 7).map((item) => item.slug);
  for (const slug of categoryCandidates) {
    if (relatedCategories.length >= 3) break;
    // Related categories describe where listings DO exist — the tight price is surfaced separately.
    const probe = await searchListings({ category: slug, sort: 'recommended', page: 1, limit: 1 });
    if (probe.total > 0) {
      const category = DEFAULT_CATEGORIES.find((item) => item.slug === slug);
      relatedCategories.push({ name: category?.name || slug, slug, href: `/marketplace/${slug}` });
    }
  }

  const similarSearches: string[] = [];
  const searchIdeas = [
    keywords,
    intent.brand || '',
    intent.category ? intent.category.split('-')[0] : '',
    'used ' + (keywords || 'items'),
  ].map((idea) => idea.trim()).filter(Boolean);
  for (const idea of [...new Set(searchIdeas)]) {
    if (similarSearches.length >= 3) break;
    const probe = await searchListings({ q: idea, sort: 'recommended', page: 1, limit: 1 });
    if (probe.total > 0) similarSearches.push(idea);
  }

  let broaderPrice: ZeroResultSuggestions['broaderPrice'];
  if (intent.maxPrice !== undefined) {
    const probe = await searchListings({ q: keywords || undefined, category: intent.category, sort: 'price-asc', page: 1, limit: 1 });
    if (probe.total > 0) {
      const cheapest = presentAiListing(probe.listings[0]);
      if (cheapest) {
        broaderPrice = {
          label: `Remove the Rs. ${intent.maxPrice.toLocaleString('en-PK')} limit — closest match starts at Rs. ${cheapest.price.toLocaleString('en-PK')}`,
          href: searchHref({ ...intent, maxPrice: undefined }, keywords),
        };
      }
    }
  }

  const nearbyLocations: ZeroResultSuggestions['nearbyLocations'] = [];
  if (intent.location) {
    const nearby = citiesWithin(intent.location, 120).filter((city) => city !== intent.location).slice(0, 2);
    for (const city of nearby) {
      const probe = await searchListings({ q: keywords || undefined, category: intent.category, location: city, sort: 'recommended', page: 1, limit: 1 });
      if (probe.total > 0) nearbyLocations.push({ label: city, href: searchHref({ ...intent, location: city }, keywords) });
    }
  } else {
    for (const city of CITIES.slice(0, 4)) {
      if (nearbyLocations.length >= 2) break;
      const probe = await searchListings({ q: keywords || undefined, category: intent.category, location: city, sort: 'recommended', page: 1, limit: 1 });
      if (probe.total > 0) nearbyLocations.push({ label: city, href: searchHref({ ...intent, location: city }, keywords) });
    }
  }

  return {
    message: 'No exact matches found.',
    relatedCategories,
    similarSearches,
    broaderPrice,
    nearbyLocations: nearbyLocations.slice(0, 2),
  };
}

function searchHref(intent: SearchIntent, keywords: string) {
  const params = new URLSearchParams();
  if (keywords) params.set('q', keywords);
  if (intent.category) params.set('category', intent.category);
  if (intent.location) params.set('location', intent.location);
  if (intent.maxPrice !== undefined) params.set('maxPrice', String(intent.maxPrice));
  if (intent.minPrice !== undefined) params.set('minPrice', String(intent.minPrice));
  if (intent.condition?.length) params.set('condition', intent.condition.join(','));
  return `/search?${params.toString()}`;
}

export function filterSuggestions(intent: SearchIntent) {
  const chips: { label: string; payload: Record<string, string> }[] = [];
  if (intent.category === 'computers-laptops') {
    chips.push({ label: '16GB RAM', payload: { 'attr.ram': '16GB' } });
    chips.push({ label: 'RTX', payload: { 'attr.gpu': 'RTX' } });
    chips.push({ label: 'SSD', payload: { 'attr.storageType': 'SSD' } });
  }
  if (intent.category === 'cars' || intent.category === 'vehicles') {
    chips.push({ label: 'Automatic', payload: { 'attr.transmission': 'Automatic' } });
    chips.push({ label: 'Used only', payload: { condition: 'used' } });
  }
  if (intent.category === 'mobiles') {
    chips.push({ label: 'Apple', payload: { 'attr.brand': 'Apple' } });
    chips.push({ label: 'Samsung', payload: { 'attr.brand': 'Samsung' } });
    chips.push({ label: 'Used only', payload: { condition: 'used' } });
  }
  if (!intent.location) chips.push({ label: 'Islamabad', payload: { location: 'Islamabad' } });
  if (!intent.condition?.includes('used')) chips.push({ label: 'Used only', payload: { condition: 'used' } });
  return [...new Map(chips.map((item) => [item.label, item])).values()].slice(0, 5);
}

export function heuristicFallback(query: string, previous?: SearchIntent | null) {
  return getHeuristicProvider().extractIntent(query, previous);
}

/** Used by the search page to keep category browsing fast when AI is not needed. */
export function aliasesForCategory(slug: string) {
  return Object.entries(CATEGORY_ALIASES).filter(([, target]) => target === slug).map(([alias]) => alias);
}
