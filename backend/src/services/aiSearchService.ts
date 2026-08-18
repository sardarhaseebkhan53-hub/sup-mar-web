import { presentAiListing } from '../ai/listings.js';
import { describeIntent, extractHeuristicIntent, intentToSearchInput, mergeIntent, validateSearchIntent } from '../ai/intent.js';
import { getAiProvider, getHeuristicProvider } from '../ai/providerFactory.js';
import type { SearchIntent } from '../ai/types.js';
import { searchListings } from './searchService.js';

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

export async function runAiSearch(query: string, previous?: SearchIntent | null, providerName?: string) {
  let fallbackSearch = false;
  let intent: SearchIntent;
  try {
    intent = await extractValidatedIntent(query, previous, providerName);
  } catch {
    intent = extractHeuristicIntent(query, previous);
    fallbackSearch = true;
  }

  const primary = await searchListings(intentToSearchInput(intent, 1, 8));
  let result = primary;
  if (!result.total && (intent.category || intent.attributes)) {
    const relaxed = await searchListings(intentToSearchInput({ ...intent, attributes: undefined }, 1, 8));
    if (relaxed.total) result = relaxed;
  }
  if (!result.total && intent.keywords) {
    const keywordOnly = await searchListings({ q: intent.keywords, sort: 'recommended', page: 1, limit: 8 });
    if (keywordOnly.total) {
      result = keywordOnly;
      fallbackSearch = true;
    }
  }

  const listings = result.listings.map(presentAiListing).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const empty = listings.length === 0;
  return {
    intent,
    interpreted: describeIntent(intent),
    listings,
    total: result.total,
    empty,
    fallbackSearch,
    source: empty ? undefined : `Based on ${result.total} QAVLIO listing${result.total === 1 ? '' : 's'}.`,
    suggestions: empty
      ? ['Try a broader category', 'Remove the price limit', 'Search nearby cities']
      : filterSuggestions(intent),
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
