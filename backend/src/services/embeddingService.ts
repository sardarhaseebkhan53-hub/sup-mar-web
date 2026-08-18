import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { getAIService } from '../ai/AIService.js';
import { HEURISTIC_EMBEDDING_DIMENSIONS } from '../ai/providers/HeuristicProvider.js';
import { ListingEmbedding } from '../models/ListingEmbedding.js';

/**
 * Embedding service (Phase 16 §28–29).
 * - Embedding input is built from public listing content only (title, description, category,
 *   key attributes) — never private seller information.
 * - Vectors regenerate only when the content hash changes, not on every view.
 */

export type EmbeddingRecord = {
  listingPublicId: string;
  model: string;
  dimensions: number;
  contentHash: string;
  vector: number[];
  updatedAt: Date;
};

const memoryStore = new Map<string, EmbeddingRecord>();

/** Public listing content only. Seller identity, contact, and moderation data are excluded. */
export function buildEmbeddingInput(listing: any): string {
  const attributes = listing.attributes instanceof Map ? Object.fromEntries(listing.attributes) : listing.attributes || {};
  const allowedAttributes = ['brand', 'model', 'storage', 'ram', 'color', 'year', 'make', 'transmission', 'size', 'gpu', 'processor'];
  const attributeText = allowedAttributes.map((key) => (attributes[key] !== undefined ? `${key} ${attributes[key]}` : '')).filter(Boolean).join(' ');
  return [
    String(listing.title || ''),
    String(listing.description || '').slice(0, 500),
    String(listing.categorySlug || ''),
    String(listing.subcategorySlug || ''),
    String(listing.condition || ''),
    attributeText,
  ].filter(Boolean).join('\n').slice(0, 1800);
}

export function contentHashOf(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function getEmbedding(listing: any): Promise<EmbeddingRecord | null> {
  const publicId = String(listing?.publicId || '');
  if (!publicId) return null;
  if (mongoose.connection.readyState === 1) {
    const record: any = await ListingEmbedding.findOne({ listingPublicId: publicId }).lean();
    if (record) return memoryVector(publicId) || null;
    return null;
  }
  return memoryStore.get(publicId) || null;
}

/** Returns the stored embedding, generating it only when content changed (§29). */
export async function ensureEmbedding(listing: any): Promise<EmbeddingRecord | null> {
  const publicId = String(listing?.publicId || '');
  if (!publicId) return null;
  const input = buildEmbeddingInput(listing);
  const hash = contentHashOf(input);

  const existing = await findRecord(publicId);
  if (existing && existing.contentHash === hash) return existing;

  const [vector] = await getAIService().generateEmbeddings([input]);
  if (!vector?.length) return existing;

  const model = getAIService().name === 'heuristic' ? `local-hash-${HEURISTIC_EMBEDDING_DIMENSIONS}` : `ai-${getAIService().name}`;
  const record: EmbeddingRecord = { listingPublicId: publicId, model, dimensions: vector.length, contentHash: hash, vector, updatedAt: new Date() };
  memoryStore.set(publicId, record);

  if (mongoose.connection.readyState === 1) {
    await ListingEmbedding.findOneAndUpdate(
      { listingPublicId: publicId },
      { $set: { listingPublicId: publicId, embeddingReference: `memvec:${publicId}`, model, dimensions: vector.length, contentHash: hash, updatedAt: new Date(), listingId: listing._id || null } },
      { upsert: true },
    ).catch(() => undefined);
  }
  return record;
}

export async function ensureEmbeddingsFor(listings: any[]): Promise<EmbeddingRecord[]> {
  const records: EmbeddingRecord[] = [];
  for (const listing of listings.slice(0, 200)) {
    const record = await ensureEmbedding(listing);
    if (record) records.push(record);
  }
  return records;
}

export async function invalidateEmbedding(publicId: string) {
  memoryStore.delete(publicId);
  if (mongoose.connection.readyState === 1) {
    await ListingEmbedding.deleteOne({ listingPublicId: publicId }).catch(() => undefined);
  }
}

async function findRecord(publicId: string): Promise<EmbeddingRecord | null> {
  if (mongoose.connection.readyState === 1) {
    const record: any = await ListingEmbedding.findOne({ listingPublicId: publicId }).lean().catch(() => null);
    if (record) {
      const restored = memoryVector(publicId);
      if (restored) return restored;
    }
    return memoryStore.get(publicId) || null;
  }
  return memoryStore.get(publicId) || null;
}

/**
 * The in-process vector payload lives in `memoryStore`; the document only holds the reference.
 * When the process restarts the reference no longer resolves, so the embedding regenerates on demand.
 */
function memoryVector(publicId: string): EmbeddingRecord | null {
  const cached = memoryStore.get(publicId);
  if (cached) return cached;
  return null;
}

export function __embeddingStats() {
  return { stored: memoryStore.size };
}
