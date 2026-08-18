import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { getAiService } from '../ai/AIService.js';
import { LOCAL_EMBEDDING_MODEL, cosineSimilarity, localEmbedding } from '../ai/embeddings.js';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { ListingEmbedding } from '../models/ListingEmbedding.js';
import { Listing } from '../models/Listing.js';
import { getPublishedMemoryListings } from './listingService.js';

/**
 * Phase 16 embedding pipeline.
 *
 * Embeddings are derived ONLY from public listing content: title, description,
 * category and curated attributes. Seller identity, contact details, private
 * notes and moderation data are never included, and provider secrets are never
 * stored alongside a vector.
 *
 * Regeneration is content-hash driven: a vector is only recomputed when the
 * meaningful listing content actually changes — never on a page view.
 */

const connected = () => mongoose.connection.readyState === 1;
const memoryIndex = new Map<string, { listingPublicId: string; vector: number[]; model: string; contentHash: string; categorySlug: string; status: string; updatedAt: Date }>();

export function embeddingContent(listing: any) {
  const attributes = listing?.attributes instanceof Map ? Object.fromEntries(listing.attributes) : listing?.attributes || {};
  const attributeText = Object.entries(attributes)
    // Never embed anything that could carry seller identity or contact details.
    .filter(([key]) => !/phone|email|contact|whatsapp|mobileno|mobilenumber|address|cnic|seller|owner/i.test(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  return [
    listing?.title || '',
    listing?.categorySlug || '',
    listing?.subcategorySlug || '',
    listing?.condition || '',
    attributeText,
    String(listing?.description || '').slice(0, 1200),
  ].filter(Boolean).join('\n').trim();
}

export function contentHash(listing: any) {
  return crypto.createHash('sha256').update(embeddingContent(listing)).digest('hex').slice(0, 40);
}

/** True when the stored embedding is stale for meaningful content changes. */
export function needsRegeneration(existing: { contentHash?: string } | null | undefined, listing: any) {
  if (!existing) return true;
  return existing.contentHash !== contentHash(listing);
}

export async function upsertListingEmbedding(listing: any, options: { force?: boolean } = {}) {
  if (!env.ai.embeddingsEnabled || !listing?.publicId) return null;
  const hash = contentHash(listing);
  const existing = await getEmbeddingRecord(listing.publicId);
  if (!options.force && existing && existing.contentHash === hash) return existing;

  const content = embeddingContent(listing);
  if (!content) return null;
  const service = getAiService();
  const { vectors, model } = await service.generateEmbeddings([content], { feature: 'embedding.listing' });
  const vector = vectors[0]?.length ? vectors[0] : localEmbedding(content);

  const record = {
    listingPublicId: String(listing.publicId).toUpperCase(),
    listingId: mongoose.isValidObjectId(listing._id) ? listing._id : null,
    vector,
    model: model || LOCAL_EMBEDDING_MODEL,
    dimensions: vector.length,
    contentHash: hash,
    categorySlug: listing.categorySlug || '',
    status: listing.status || 'published',
    embeddingReference: `qavlio:listing:${String(listing.publicId).toUpperCase()}`,
    updatedAt: new Date(),
  };

  if (connected()) {
    await ListingEmbedding.findOneAndUpdate({ listingPublicId: record.listingPublicId }, { $set: record }, { upsert: true }).catch(() => undefined);
    return record;
  }
  memoryIndex.set(record.listingPublicId, record);
  return record;
}

export async function getEmbeddingRecord(publicId: string) {
  const key = String(publicId || '').toUpperCase();
  if (!key) return null;
  if (connected()) return ListingEmbedding.findOne({ listingPublicId: key }).lean() as any;
  return memoryIndex.get(key) || null;
}

export async function removeListingEmbedding(publicId: string) {
  const key = String(publicId || '').toUpperCase();
  if (connected()) { await ListingEmbedding.deleteOne({ listingPublicId: key }).catch(() => undefined); return; }
  memoryIndex.delete(key);
}

/** Background-safe refresh; failures never block a listing write. */
export function scheduleEmbeddingRefresh(listing: any) {
  if (!env.ai.embeddingsEnabled) return;
  setTimeout(() => { void upsertListingEmbedding(listing).catch(() => undefined); }, 0);
}

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item: any) => item.status === 'published');
}

/** Candidate pool used by the local vector index when no external store is configured. */
export async function embeddingCandidates(options: { categorySlug?: string; limit?: number; excludePublicIds?: string[] } = {}) {
  const limit = Math.min(options.limit || 200, 400);
  const exclude = new Set((options.excludePublicIds || []).map((id) => String(id).toUpperCase()));
  if (connected()) {
    const query: any = { status: 'published', availability: 'available' };
    if (options.categorySlug) query.categorySlug = options.categorySlug;
    const rows = await Listing.find(query).sort({ publishedAt: -1 }).limit(limit).select('-moderation -reportCount').lean();
    return rows.filter((row: any) => !exclude.has(String(row.publicId).toUpperCase()));
  }
  return catalog()
    .filter((row: any) => (!options.categorySlug || row.categorySlug === options.categorySlug) && !exclude.has(String(row.publicId).toUpperCase()))
    .slice(0, limit);
}

/** Score a candidate pool against a query vector, backfilling missing vectors locally. */
export async function scoreAgainstVector(queryVector: number[], listings: any[]) {
  const scored = await Promise.all(listings.map(async (listing) => {
    const stored = await getEmbeddingRecord(listing.publicId);
    const vector = stored?.vector?.length ? stored.vector : localEmbedding(embeddingContent(listing));
    return { listing, score: cosineSimilarity(queryVector, vector) };
  }));
  return scored.sort((a, b) => b.score - a.score);
}

export function __resetEmbeddingMemory() { memoryIndex.clear(); }
