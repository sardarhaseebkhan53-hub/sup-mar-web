import { getAiService } from '../ai/AIService.js';
import { localEmbedding, tokenOverlap } from '../ai/embeddings.js';
import { intentToSearchInput } from '../ai/intent.js';
import type { SearchIntent } from '../ai/types.js';
import { env } from '../config/env.js';
import { embeddingCandidates, embeddingContent, scoreAgainstVector } from './listingEmbeddingService.js';
import { searchListings } from './searchService.js';

/**
 * Phase 16 VectorSearchService.
 *
 * A replaceable abstraction over similarity search. The default implementation is
 * a local, dependency-free index over QAVLIO's own listings; swapping in Atlas
 * Vector Search or an external vector database only requires reimplementing
 * `searchSimilar` and `searchByIntent` — no caller changes.
 *
 * Results are ALWAYS real listing records fetched from QAVLIO's database. The
 * vector layer only ranks; it never produces listing content.
 */

export type VectorHit = { listing: any; score: number };

const MIN_SIMILARITY = 0.12;

export const VectorSearchService = {
  enabled() { return env.ai.embeddingsEnabled; },

  /** Find listings semantically close to a reference listing. */
  async searchSimilar(reference: any, options: { limit?: number; sameCategoryOnly?: boolean; excludePublicIds?: string[] } = {}): Promise<VectorHit[]> {
    if (!reference) return [];
    const limit = Math.min(options.limit || 8, 24);
    const content = embeddingContent(reference);
    if (!content) return [];

    const service = getAiService();
    const { vectors } = await service.generateEmbeddings([content], { feature: 'vector.similar' });
    const queryVector = vectors[0]?.length ? vectors[0] : localEmbedding(content);

    const pool = await embeddingCandidates({
      categorySlug: options.sameCategoryOnly === false ? undefined : reference.categorySlug,
      limit: 200,
      excludePublicIds: [reference.publicId, ...(options.excludePublicIds || [])],
    });
    let candidates = pool;
    if (candidates.length < limit && options.sameCategoryOnly !== true) {
      const wider = await embeddingCandidates({ limit: 200, excludePublicIds: [reference.publicId, ...(options.excludePublicIds || [])] });
      const seen = new Set(candidates.map((item: any) => item.publicId));
      candidates = [...candidates, ...wider.filter((item: any) => !seen.has(item.publicId))];
    }

    const scored = await scoreAgainstVector(queryVector, candidates);
    return scored.filter((hit) => hit.score >= MIN_SIMILARITY).slice(0, limit);
  },

  /**
   * Retrieve by natural-language intent. Structured filters run first against the
   * authoritative database, and the vector layer only re-ranks what the database
   * already allowed the user to see.
   */
  async searchByIntent(intent: SearchIntent, rawQuery: string, options: { limit?: number } = {}): Promise<VectorHit[]> {
    const limit = Math.min(options.limit || 12, 24);
    const structured = await searchListings(intentToSearchInput(intent, 1, Math.max(limit * 3, 24)));
    const candidates = structured.listings;
    if (!candidates.length) return [];

    const queryText = [rawQuery, intent.keywords, intent.brand, intent.model, intent.category].filter(Boolean).join(' ');
    if (!queryText.trim()) return candidates.slice(0, limit).map((listing: any) => ({ listing, score: 0 }));

    const service = getAiService();
    const { vectors } = await service.generateEmbeddings([queryText], { feature: 'vector.intent' });
    const queryVector = vectors[0]?.length ? vectors[0] : localEmbedding(queryText);
    const scored = await scoreAgainstVector(queryVector, candidates);

    // Keep every structurally valid result, but surface semantically closest first.
    return scored.slice(0, limit);
  },

  /** Lexical sanity check so a weak semantic neighbour is never presented as a match. */
  confidentMatch(queryText: string, listing: any) {
    return tokenOverlap(queryText, `${listing?.title || ''} ${listing?.categorySlug || ''}`) > 0;
  },
};

export type VectorSearchServiceType = typeof VectorSearchService;
