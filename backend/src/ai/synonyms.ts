/**
 * Controlled marketplace synonym mappings (Phase 16 §11).
 * Expansions widen keyword recall; they never remove or rewrite the user's own words.
 */
export const SYNONYM_GROUPS: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: 'smartphone', aliases: ['mobile', 'mobile phone', 'cellphone', 'handset'] },
  { canonical: 'motorcycle', aliases: ['bike', 'motorbike'] },
  { canonical: 'notebook', aliases: ['laptop'] },
  { canonical: 'sofa', aliases: ['couch'] },
  { canonical: 'television', aliases: ['tv'] },
  { canonical: 'playstation', aliases: ['ps5', 'ps4'] },
  { canonical: 'desktop', aliases: ['pc', 'computer'] },
  { canonical: 'sedan', aliases: ['car'] },
  { canonical: 'flat', aliases: ['apartment'] },
  { canonical: 'tablet', aliases: ['ipad'] },
  { canonical: 'sneakers', aliases: ['trainers', 'joggers'] },
  { canonical: 'air conditioner', aliases: ['ac'] },
];

const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  ALIAS_TO_CANONICAL.set(group.canonical, group.canonical);
  for (const alias of group.aliases) ALIAS_TO_CANONICAL.set(alias, group.canonical);
}

export function canonicalTerm(term: string) {
  return ALIAS_TO_CANONICAL.get(term.toLowerCase().trim()) || null;
}

/** Add canonical synonyms for aliases found in the query, without duplicating existing words. */
export function expandWithSynonyms(query: string): { query: string; expansions: Array<{ alias: string; canonical: string }> } {
  const text = query.toLowerCase();
  const words = new Set(text.split(/[^a-z0-9+]+/).filter(Boolean));
  const added: string[] = [];
  const expansions: Array<{ alias: string; canonical: string }> = [];
  for (const [alias, canonical] of ALIAS_TO_CANONICAL) {
    if (alias.includes(' ')) {
      if (!text.includes(alias)) continue;
    } else if (!words.has(alias)) {
      continue;
    }
    const canonicalWords = canonical.split(/\s+/);
    if (canonicalWords.every((word) => words.has(word))) continue;
    added.push(canonical);
    expansions.push({ alias, canonical });
  }
  return { query: added.length ? `${query} ${[...new Set(added)].join(' ')}` : query, expansions };
}
