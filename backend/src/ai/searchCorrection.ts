import { MARKETPLACE_VOCABULARY, SEARCH_SYNONYMS, SPELLING_CORRECTIONS } from '../constants/marketplaceLexicon.js';

/**
 * Phase 16 — "Did you mean…?" support.
 *
 * QAVLIO never silently rewrites what a buyer typed. We only *offer* a corrected
 * query built from the curated marketplace vocabulary; the original query is always
 * the one that actually runs unless the user accepts the suggestion.
 */

export type SearchCorrection = { original: string; suggestion: string; changed: string[] } | null;

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

function closestVocabularyMatch(word: string) {
  if (word.length < 4) return null;
  const lower = word.toLowerCase();
  let best: { term: string; distance: number } | null = null;
  for (const term of MARKETPLACE_VOCABULARY) {
    const candidate = term.toLowerCase();
    if (candidate.includes(' ')) continue;
    if (candidate === lower) return null; // already correct
    const distance = levenshtein(lower, candidate);
    const tolerance = candidate.length > 7 ? 2 : 1;
    if (distance <= tolerance && (!best || distance < best.distance)) best = { term, distance };
  }
  return best?.term || null;
}

export function suggestCorrection(query: string): SearchCorrection {
  const original = String(query || '').trim();
  if (!original || original.length > 200) return null;
  const changed: string[] = [];
  const corrected = original.split(/(\s+)/).map((token) => {
    if (!token.trim()) return token;
    const bare = token.replace(/[^a-zA-Z0-9]/g, '');
    if (!bare || /\d/.test(bare)) return token;
    const mapped = SPELLING_CORRECTIONS[bare.toLowerCase()] || closestVocabularyMatch(bare);
    if (!mapped || mapped.toLowerCase() === bare.toLowerCase()) return token;
    changed.push(`${bare} → ${mapped}`);
    return token.replace(bare, mapped);
  }).join('');
  if (!changed.length || corrected.trim().toLowerCase() === original.toLowerCase()) return null;
  return { original, suggestion: corrected.trim(), changed };
}

/** Controlled synonym expansion for retrieval only — the displayed query never changes. */
export function expandSynonyms(query: string) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const expansions = new Set<string>();
  for (const word of words) {
    const bare = word.replace(/[^a-z0-9]/g, '');
    (SEARCH_SYNONYMS[bare] || []).forEach((synonym) => expansions.add(synonym));
  }
  words.forEach((word) => expansions.delete(word));
  return [...expansions].slice(0, 6);
}
