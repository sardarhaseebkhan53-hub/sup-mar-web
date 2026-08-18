import { BRAND_ALIASES, CATEGORY_ALIASES, CITIES } from '../constants/aiPolicies.js';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { getPublishedMemoryListings } from '../services/listingService.js';

/**
 * Search correction (Phase 16 §10). Vocabulary comes from real QAVLIO listing titles plus the
 * controlled brand/category/city lists — so suggestions reflect the actual marketplace.
 * A correction is only ever SUGGESTED ("Did you mean…?"); the query is never silently changed.
 */

let vocabularyCache: { terms: string[]; at: number } | null = null;
const VOCAB_TTL_MS = 60_000;

const STOP = new Set(['the', 'for', 'and', 'with', 'near', 'under', 'over', 'in', 'a', 'an', 'of', 'to', 'rs', 'pkr', 'used', 'new', 'good', 'best', 'cheap', 'buy', 'sale', 'sell']);

export function buildSearchVocabulary(): string[] {
  const terms = new Set<string>();
  for (const city of CITIES) city.toLowerCase().split(/\s+/).forEach((word) => terms.add(word));
  for (const alias of Object.keys(CATEGORY_ALIASES)) terms.add(alias.toLowerCase());
  for (const alias of Object.keys(BRAND_ALIASES)) terms.add(alias.toLowerCase());
  for (const listing of [...DEMO_LISTINGS, ...getPublishedMemoryListings()]) {
    String(listing.title || '').toLowerCase().split(/[^a-z0-9+]+/).forEach((word) => {
      if (word.length >= 3 && !STOP.has(word)) terms.add(word);
    });
  }
  return [...terms];
}

function vocabulary() {
  const now = Date.now();
  if (!vocabularyCache || now - vocabularyCache.at > VOCAB_TTL_MS) {
    vocabularyCache = { terms: buildSearchVocabulary(), at: now };
  }
  return vocabularyCache.terms;
}

export function editDistance(a: string, b: string) {
  if (a === b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let carry = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, carry + (a[i - 1] === b[j - 1] ? 0 : 1));
      carry = temp;
    }
  }
  return previous[b.length];
}

function knownWord(word: string) {
  return vocabulary().some((term) => term === word);
}

function closestMatch(word: string) {
  let best: { term: string; distance: number } | null = null;
  for (const term of vocabulary()) {
    if (Math.abs(term.length - word.length) > 2) continue;
    const distance = editDistance(word, term);
    if (distance === 0) return { term, distance };
    if (!best || distance < best.distance || (distance === best.distance && term.length > best.term.length)) best = { term, distance };
  }
  return best;
}

/** Returns a "Did you mean…?" suggestion when a token looks like a misspelling of a known term. */
export function suggestCorrection(query: string): { original: string; suggestion: string } | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 120) return null;
  const tokens = trimmed.split(/\s+/);
  let changed = false;
  const repaired = tokens.map((token) => {
    const clean = token.toLowerCase().replace(/[^a-z0-9+]/g, '');
    if (!clean || clean.length < 3 || clean.length > 20 || STOP.has(clean) || /^\d/.test(clean) || knownWord(clean)) return token;
    const match = closestMatch(clean);
    if (match && match.distance === 1) {
      changed = true;
      return token.replace(clean, match.term);
    }
    return token;
  });
  if (!changed) return null;
  const suggestion = titleCaseTokens(repaired).join(' ');
  return suggestion.toLowerCase() === trimmed.toLowerCase() ? null : { original: trimmed, suggestion };
}

function titleCaseTokens(tokens: string[]) {
  return tokens.map((token) => {
    const lower = token.toLowerCase();
    if (lower === 'iphone' || lower === 'ipad' || lower === 'macbook' || lower === 'imac') return lower[0] + lower.slice(1);
    if (/^\d/.test(lower) || lower.length <= 2) return lower;
    // Keep brand-style casing where the canonical vocabulary uses it.
    const brandEntry = Object.keys(BRAND_ALIASES).find((alias) => alias.toLowerCase() === lower);
    if (brandEntry) return brandEntry;
    return lower[0].toUpperCase() + lower.slice(1);
  });
}

export function __resetCorrectionCache() {
  vocabularyCache = null;
}
