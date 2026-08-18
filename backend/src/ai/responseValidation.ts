import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { findListingByPublicKey } from '../services/listingService.js';
import type { PublicAiListing, SearchIntent } from './types.js';

/**
 * AI response validation (Phase 16 §44–45).
 * Defense in depth: even though listings are assembled server-side from the database, every
 * listing surfaced in an AI reply is re-verified — the ID must exist, and title/price are
 * re-read from the authoritative record so the model can never drift a fact into the UI.
 */

const VALID_CATEGORY_SLUGS = new Set(DEFAULT_CATEGORIES.map((category) => category.slug));

export function isValidCategorySlug(slug: string | undefined | null) {
  return !slug || VALID_CATEGORY_SLUGS.has(slug);
}

async function authoritativeListing(publicId: string): Promise<any | null> {
  return findListingByPublicKey(publicId.toUpperCase()).catch(() => null);
}

/** Filters an array of listings down to those that exist, with facts re-read from storage. */
export async function validateAiListings(listings: PublicAiListing[]): Promise<PublicAiListing[]> {
  if (!listings.length) return [];
  const verified: PublicAiListing[] = [];
  for (const listing of listings.slice(0, 24)) {
    if (!listing?.publicId || typeof listing.publicId !== 'string' || !/^QV-[A-Z0-9]{3,20}$/i.test(listing.publicId)) continue;
    const record = await authoritativeListing(listing.publicId.toUpperCase());
    if (!record) continue; // Listing ID must exist (§44) — hallucinated IDs are dropped.
    const presented = record.publicId && record.title ? record : null;
    if (!presented) continue;
    verified.push({
      publicId: record.publicId,
      slug: record.slug,
      title: record.title,
      price: Number(record.price?.toString?.() ?? record.price ?? 0),
      currency: record.currency || 'PKR',
      condition: record.condition,
      location: record.location ? { city: record.location.city, area: record.location.area, province: record.location.province } : undefined,
      categorySlug: record.categorySlug,
      subcategorySlug: record.subcategorySlug,
      coverImage: record.coverImage || record.media?.[0]?.url || null,
      isPromoted: Boolean(record.isPromoted),
      seller: record.seller ? { name: record.seller.displayName || record.seller.name, username: record.seller.username } : (listing.seller || null),
    });
  }
  return verified;
}

/** Intent fields are constrained to real categories, sane prices, and known cities. */
export function validateIntentFilters(intent: SearchIntent | null | undefined): SearchIntent {
  if (!intent || typeof intent !== 'object') return {};
  const next: SearchIntent = {};
  if (isValidCategorySlug(intent.category)) next.category = intent.category;
  if (isValidCategorySlug(intent.subcategory)) next.subcategory = intent.subcategory;
  if (Number.isFinite(intent.minPrice) && intent.minPrice! >= 0 && intent.minPrice! <= 1_000_000_000_000) next.minPrice = intent.minPrice;
  if (Number.isFinite(intent.maxPrice) && intent.maxPrice! >= 0 && intent.maxPrice! <= 1_000_000_000_000) next.maxPrice = intent.maxPrice;
  if (next.minPrice !== undefined && next.maxPrice !== undefined && next.minPrice! > next.maxPrice!) {
    const swap = next.minPrice;
    next.minPrice = next.maxPrice;
    next.maxPrice = swap;
  }
  if (Number.isFinite(intent.minYear) && intent.minYear! >= 1950 && intent.minYear! <= 2100) next.minYear = intent.minYear;
  if (Number.isFinite(intent.maxYear) && intent.maxYear! >= 1950 && intent.maxYear! <= 2100) next.maxYear = intent.maxYear;
  if (Array.isArray(intent.condition) && intent.condition.every((value) => typeof value === 'string')) next.condition = intent.condition.slice(0, 6);
  if (typeof intent.location === 'string' && intent.location.length <= 80) next.location = intent.location;
  if (typeof intent.keywords === 'string' && intent.keywords.length <= 120) next.keywords = intent.keywords;
  if (typeof intent.brand === 'string' && intent.brand.length <= 60) next.brand = intent.brand;
  if (typeof intent.model === 'string' && intent.model.length <= 80) next.model = intent.model;
  if (intent.attributes && typeof intent.attributes === 'object' && !Array.isArray(intent.attributes)) {
    const attributes: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(intent.attributes).slice(0, 12)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,29}$/.test(key)) continue; // blocks Mongo operator injection via attribute keys
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') attributes[key] = value;
    }
    if (Object.keys(attributes).length) next.attributes = attributes;
  }
  if (['recommended', 'newest', 'price-asc', 'price-desc', 'most-viewed', 'nearest'].includes(String(intent.sort))) next.sort = intent.sort as SearchIntent['sort'];
  return next;
}

/** Copy used whenever the assistant cannot ground an answer in marketplace data (§45). */
export const UNVERIFIABLE_REPLY = 'I couldn\u2019t verify that from the available QAVLIO listings.';
