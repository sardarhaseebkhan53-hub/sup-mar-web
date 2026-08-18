import { getAIService } from '../ai/AIService.js';
import { buildEmbeddingInput, ensureEmbeddingsFor } from './embeddingService.js';
import { findCityByName, haversineKm } from '../constants/locations.js';
import { searchListings } from './searchService.js';
import { presentAiListing } from '../ai/listings.js';
import type { SearchIntent } from '../ai/types.js';

/**
 * VectorSearchService (Phase 16 §30) — semantic similarity over REAL QAVLIO listings.
 * The index implementation is intentionally replaceable: today it scores an in-process
 * cosine-similarity index (hash embeddings, no external service required); swapping in
 * MongoDB Atlas Vector Search or an external vector store only requires replacing the
 * candidate scoring below. The database always supplies the candidate set — the model
 * never queries MongoDB directly and can never invent a listing.
 */
export type SimilarListing = {
  listing: NonNullable<ReturnType<typeof presentAiListing>>;
  score: number;
  reasons: string[];
};

export type VectorSearchLike = { searchSimilar(listing: any, limit?: number, location?: string): Promise<SimilarListing[]>; searchByIntent(intent: SearchIntent, limit?: number): Promise<SimilarListing[]> };

function cosineSimilarity(a: number[], b: number[]) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function priceProximity(a: number, b: number) {
  if (!a || !b) return 0.5;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return Number.isFinite(ratio) ? Math.max(0, ratio) : 0;
}

export class VectorSearchService implements VectorSearchLike {
  /** Similar items (§26): same category candidates, then semantic + price + location ranking. */
  async searchSimilar(listing: any, limit = 8, location?: string): Promise<SimilarListing[]> {
    const anchorCity = location || listing?.location?.city;
    const candidates = await searchListings({ category: listing?.categorySlug, sort: 'recommended', page: 1, limit: 40, excludeListingIds: listing?.publicId ? [listing.publicId] : undefined });
    let pool = candidates.listings;
    if (pool.length < limit) {
      const broader = await searchListings({ q: String(listing?.title || '').split(/\s+/).slice(0, 4).join(' '), sort: 'recommended', page: 1, limit: 40, excludeListingIds: [listing?.publicId, ...pool.map((item: any) => item.publicId)].filter(Boolean) });
      pool = [...pool, ...broader.listings];
    }
    if (!pool.length) return [];

    const anchorPrice = Number(listing?.price?.toString?.() ?? listing?.price ?? 0);
    const [anchorEmbedding] = await ensureEmbeddingsFor([listing]);
    const embeddings = await ensureEmbeddingsFor(pool);

    const scored = pool.map((candidate: any, index: number) => {
      const reasons: string[] = [];
      let score = 0;

      const semantic = anchorEmbedding && embeddings[index] ? cosineSimilarity(anchorEmbedding.vector, embeddings[index].vector) : 0;
      score += semantic * 0.55;
      if (semantic >= 0.25) reasons.push('similar content');

      const price = priceProximity(anchorPrice, Number(candidate.price?.toString?.() ?? candidate.price ?? 0));
      score += price * 0.25;
      if (price >= 0.75) reasons.push('similar price');

      const distance = cityDistance(anchorCity, candidate?.location?.city);
      if (distance !== null) {
        const proximity = Math.max(0, 1 - distance / 300);
        score += proximity * 0.2;
        if (distance <= 60) reasons.push('nearby location');
      }

      if (candidate.isPromoted) score += 0.05; // promoted stays relevant-ranked, never injected
      return { candidate, score, reasons };
    });

    return scored
      .sort((a, b) => b.score - a.score || (b.candidate.viewCount || 0) - (a.candidate.viewCount || 0))
      .slice(0, limit)
      .map((entry) => {
        const presented = presentAiListing(entry.candidate);
        return presented ? { listing: presented, score: Math.round(entry.score * 100) / 100, reasons: entry.reasons.length ? entry.reasons : ['same category'] } : null;
      })
      .filter((item): item is SimilarListing => Boolean(item));
  }

  /** Rank an intent's keyword text semantically against live listings (used to enrich search). */
  async searchByIntent(intent: SearchIntent, limit = 8): Promise<SimilarListing[]> {
    const text = [intent.model, intent.keywords, intent.category, Object.entries(intent.attributes || {}).map(([key, value]) => `${key} ${value}`).join(' ')].filter(Boolean).join(' ');
    if (!text.trim()) return [];
    const pool = await searchListings({ q: intent.keywords || intent.model || undefined, category: intent.category, location: intent.location, minPrice: intent.minPrice, maxPrice: intent.maxPrice, condition: intent.condition, sort: 'recommended', page: 1, limit: 40 });
    if (!pool.listings.length) return [];
    const [queryEmbedding] = await getAIService().generateEmbeddings([text]);
    const embeddings = await ensureEmbeddingsFor(pool.listings);
    return pool.listings
      .map((candidate: any, index: number) => ({ candidate, score: queryEmbedding && embeddings[index] ? cosineSimilarity(queryEmbedding, embeddings[index].vector) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => {
        const presented = presentAiListing(entry.candidate);
        return presented ? { listing: presented, score: Math.round(entry.score * 100) / 100, reasons: ['matches your description'] } : null;
      })
      .filter((item): item is SimilarListing => Boolean(item));
  }
}

function cityDistance(from: string | undefined, to: string | undefined): number | null {
  if (!from || !to) return null;
  const origin = findCityByName(from);
  const target = findCityByName(to);
  if (!origin || !target) return from.toLowerCase() === to.toLowerCase() ? 0 : null;
  return haversineKm(origin, target);
}

let singleton: VectorSearchService | null = null;
export function getVectorSearch(): VectorSearchService {
  if (!singleton) singleton = new VectorSearchService();
  return singleton;
}

export { buildEmbeddingInput };
