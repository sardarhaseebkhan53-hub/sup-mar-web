import type { PublicAiListing } from './types.js';

export function presentAiListing(record: any): PublicAiListing | null {
  if (!record) return null;
  const status = record.status || 'published';
  if (!['published', 'sold', 'paused'].includes(status) && record.availability && record.availability !== 'available') return null;
  const price = Number(record.price?.toString?.() ?? record.price ?? 0);
  return {
    publicId: record.publicId,
    slug: record.slug,
    title: record.title,
    price,
    currency: record.currency || 'PKR',
    condition: record.condition,
    location: record.location ? { city: record.location.city, area: record.location.area, province: record.location.province } : undefined,
    categorySlug: record.categorySlug,
    subcategorySlug: record.subcategorySlug,
    coverImage: record.coverImage || record.media?.[0]?.url || record.media?.[0]?.thumbnailUrl || null,
    isPromoted: Boolean(record.isPromoted || record.promotion?.status === 'active'),
    seller: record.seller ? { name: record.seller.displayName || record.seller.name, username: record.seller.username } : null,
  };
}

export function compactListingForModel(record: any) {
  const listing = presentAiListing(record);
  if (!listing) return null;
  return {
    publicId: listing.publicId,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    condition: listing.condition,
    city: listing.location?.city,
    area: listing.location?.area,
    category: listing.categorySlug,
    attributes: record.attributes instanceof Map ? Object.fromEntries(record.attributes) : record.attributes || {},
    description: String(record.description || '').slice(0, 280),
  };
}
