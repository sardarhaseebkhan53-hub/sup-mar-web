import { presentAiListing } from '../ai/listings.js';
import { describeIntent, extractHeuristicIntent, intentToAppliedFilters, intentToSearchInput, intentToSearchParams, mergeIntent, validateSearchIntent } from '../ai/intent.js';
import { getAiService } from '../ai/AIService.js';
import { getHeuristicProvider } from '../ai/providerFactory.js';
import { expandSynonyms, suggestCorrection } from '../ai/searchCorrection.js';
import type { SearchIntent } from '../ai/types.js';
import { getActiveCategories } from './categoryService.js';
import { searchListings } from './searchService.js';
import { VectorSearchService } from './vectorSearchService.js';
import { CITIES } from '../constants/aiPolicies.js';

/**
 * Phase 16 AI search.
 *
 * Pipeline: query → AI intent extraction → strict validation → QAVLIO database →
 * optional semantic re-rank → validated response. The model never queries MongoDB
 * and never authors a listing; every returned item is a real database record.
 */

export async function extractValidatedIntent(query: string, previous?: SearchIntent | null, providerName?: string, userId?: string | null) {
  const heuristic = extractHeuristicIntent(query, previous);
  try {
    const service = getAiService(providerName);
    const { intent } = await service.extractIntent(query, previous, { feature: 'search.intent', userId });
    return validateSearchIntent(mergeIntent(heuristic, intent));
  } catch {
    return heuristic;
  }
}

/** Category slugs are re-checked against the live taxonomy before they can filter. */
async function assertKnownCategory(intent: SearchIntent): Promise<SearchIntent> {
  if (!intent.category && !intent.subcategory) return intent;
  try {
    const categories = await getActiveCategories();
    const slugs = new Set((categories || []).map((item: any) => item.slug));
    const next = { ...intent };
    if (next.category && slugs.size && !slugs.has(next.category)) delete next.category;
    if (next.subcategory && slugs.size && !slugs.has(next.subcategory)) delete next.subcategory;
    return next;
  } catch {
    return intent;
  }
}

export async function runAiSearch(query: string, previous?: SearchIntent | null, options: { providerName?: string; userId?: string | null; limit?: number; semantic?: boolean } = {}) {
  const rawQuery = String(query || '').trim();
  const limit = Math.min(options.limit || 8, 24);
  let fallbackSearch = false;
  let intent: SearchIntent;
  try {
    intent = await extractValidatedIntent(rawQuery, previous, options.providerName, options.userId);
  } catch {
    intent = extractHeuristicIntent(rawQuery, previous);
    fallbackSearch = true;
  }
  intent = await assertKnownCategory(intent);
  intent = { ...intent, query: rawQuery.slice(0, 200) };

  // "Did you mean…?" — offered only, never applied silently.
  const correction = suggestCorrection(rawQuery);

  let result = await searchListings(intentToSearchInput(intent, 1, limit));
  let relaxedFilters: string[] = [];

  // Progressive relaxation. The user is always told what we relaxed.
  if (!result.total && intent.attributes) {
    const relaxed = await searchListings(intentToSearchInput({ ...intent, attributes: undefined }, 1, limit));
    if (relaxed.total) { result = relaxed; relaxedFilters.push('attributes'); }
  }
  if (!result.total && (intent.minYear !== undefined || intent.maxYear !== undefined)) {
    const relaxed = await searchListings(intentToSearchInput({ ...intent, minYear: undefined, maxYear: undefined, attributes: undefined }, 1, limit));
    if (relaxed.total) { result = relaxed; relaxedFilters.push('year range'); }
  }
  if (!result.total && intent.keywords) {
    const synonyms = expandSynonyms(`${rawQuery} ${intent.keywords}`);
    for (const synonym of synonyms) {
      const attempt = await searchListings({ q: synonym, category: intent.category, maxPrice: intent.maxPrice, minPrice: intent.minPrice, location: intent.location, sort: 'recommended', page: 1, limit });
      if (attempt.total) { result = attempt; relaxedFilters.push(`synonym “${synonym}”`); fallbackSearch = true; break; }
    }
  }
  if (!result.total && intent.keywords) {
    const keywordOnly = await searchListings({ q: intent.keywords, sort: 'recommended', page: 1, limit });
    if (keywordOnly.total) { result = keywordOnly; relaxedFilters.push('extra filters'); fallbackSearch = true; }
  }

  // Semantic re-ranking over results the database already authorised.
  let semanticApplied = false;
  if (options.semantic !== false && result.total && rawQuery && VectorSearchService.enabled()) {
    try {
      const hits = await VectorSearchService.searchByIntent(intent, rawQuery, { limit });
      if (hits.length) {
        result = { listings: hits.map((hit) => hit.listing), total: result.total };
        semanticApplied = true;
      }
    } catch { /* ranking is best-effort; structured results still stand */ }
  }

  const listings = result.listings.map(presentAiListing).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const empty = listings.length === 0;
  const recovery = empty ? await zeroResultRecovery(intent, rawQuery) : null;

  return {
    query: rawQuery,
    intent,
    interpreted: describeIntent(intent),
    appliedFilters: intentToAppliedFilters(intent),
    searchParams: intentToSearchParams(intent, rawQuery),
    listings,
    total: result.total,
    empty,
    fallbackSearch,
    semanticApplied,
    relaxedFilters,
    // `applied: false` is part of the contract: QAVLIO suggests a correction, it never rewrites the query.
    correction: correction ? { original: correction.original, suggestion: correction.suggestion, changed: correction.changed, applied: false as const } : null,
    explanation: empty
      ? 'No exact matches found.'
      : `Showing ${listings.length} of ${result.total} QAVLIO listing${result.total === 1 ? '' : 's'} matching your search.`,
    source: empty ? undefined : `Based on ${result.total} QAVLIO listing${result.total === 1 ? '' : 's'}.`,
    recovery,
    suggestions: empty
      ? (recovery?.suggestedSearches || ['Try a broader category', 'Remove the price limit', 'Search nearby cities'])
      : filterSuggestions(intent),
  };
}

/**
 * Zero-result recovery. We never fabricate listings: instead we offer broader,
 * genuinely available alternatives computed from real marketplace data.
 */
export async function zeroResultRecovery(intent: SearchIntent, rawQuery: string) {
  const relatedCategories: Array<{ slug: string; name: string; count: number }> = [];
  const broaderPrice: { maxPrice: number; count: number } | null = await (async () => {
    if (intent.maxPrice === undefined) return null;
    const widened = Math.round(intent.maxPrice * 1.5);
    const attempt = await searchListings(intentToSearchInput({ ...intent, maxPrice: widened, attributes: undefined }, 1, 1));
    return attempt.total ? { maxPrice: widened, count: attempt.total } : null;
  })();

  const nearbyLocations: Array<{ location: string; count: number }> = [];
  if (intent.location) {
    for (const city of CITIES) {
      if (city.toLowerCase() === intent.location.toLowerCase()) continue;
      const attempt = await searchListings(intentToSearchInput({ ...intent, location: city, attributes: undefined }, 1, 1));
      if (attempt.total) nearbyLocations.push({ location: city, count: attempt.total });
      if (nearbyLocations.length >= 3) break;
    }
  }

  try {
    const categories = await getActiveCategories();
    for (const category of (categories || []).slice(0, 12)) {
      if (category.slug === intent.category) continue;
      if (relatedCategories.length >= 3) break;
      const attempt = await searchListings({ q: intent.keywords || intent.model || undefined, category: category.slug, sort: 'recommended', page: 1, limit: 1 });
      if (attempt.total) relatedCategories.push({ slug: category.slug, name: category.name, count: attempt.total });
    }
  } catch { /* taxonomy lookup is optional */ }

  const suggestedSearches = [
    intent.maxPrice !== undefined && broaderPrice ? `${intent.keywords || intent.model || rawQuery} under Rs. ${broaderPrice.maxPrice.toLocaleString('en-PK')}` : '',
    nearbyLocations[0] ? `${intent.keywords || intent.model || rawQuery} in ${nearbyLocations[0].location}` : '',
    intent.condition?.length ? `${intent.keywords || intent.model || rawQuery} (any condition)` : '',
    relatedCategories[0] ? `Browse ${relatedCategories[0].name}` : '',
  ].filter(Boolean) as string[];

  return {
    message: 'No exact matches found.',
    note: 'These are broader options from real QAVLIO listings — nothing here is invented.',
    relatedCategories,
    broaderPrice,
    nearbyLocations,
    suggestedSearches: suggestedSearches.length ? suggestedSearches : ['Browse all categories', 'Remove filters and try again'],
  };
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
