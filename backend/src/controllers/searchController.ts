import { z } from 'zod';
import { CATEGORY_FILTERS } from '../constants/discovery.js';
import { getFilterConfiguration, searchListings } from '../services/searchService.js';
import { AppError } from '../utils/AppError.js';

const safeText = z.string().trim().max(100).regex(/^[^$\0]*$/).optional();
const schema = z.object({
  q: safeText,
  category: z.string().trim().max(80).regex(/^[a-z0-9-]+$/).optional(),
  subcategory: z.string().trim().max(80).regex(/^[a-z0-9-]+$/).optional(),
  location: safeText,
  minPrice: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
  condition: z.string().max(100).optional().transform((v) => v?.split(',').filter((item) => ['new', 'like-new', 'used', 'refurbished'].includes(item))),
  listingType: z.enum(['individual', 'business']).optional(),
  date: z.enum(['today', '3days', '7days', '30days']).optional(),
  sort: z.enum(['recommended', 'newest', 'price-asc', 'price-desc', 'most-viewed', 'nearest']).default('recommended'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  radius: z.coerce.number().int().min(1).max(250).optional(),
}).refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, { message: 'Minimum price must not exceed maximum price', path: ['minPrice'] });

export async function search(req, res) {
  const validation = schema.safeParse(req.query);
  if (!validation.success) throw new AppError(422, 'Invalid search parameters', 'VALIDATION_ERROR', validation.error.flatten());
  const parsed = validation.data;
  const allowedAttributes = new Set((parsed.category && CATEGORY_FILTERS[parsed.category] || []).map((filter) => filter.key));
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith('attr.') && allowedAttributes.has(key.slice(5)) && typeof value === 'string' && value.length <= 80 && !value.includes('$')) attributes[key.slice(5)] = value;
  }
  let exclusions:any={};if(req.auth?.userId){const{blockedIdsFor,blockedListingIdsFor}=await import('../services/blockService.js');const[excludeSellerIds,excludeListingIds]=await Promise.all([blockedIdsFor(req.auth.userId),blockedListingIdsFor(req.auth.userId)]);exclusions={excludeSellerIds,excludeListingIds}}
  const result = await searchListings({ ...parsed, attributes, ...exclusions });
  const { recordSearchAnalytics } = await import('../services/searchAnalyticsService.js');
  void recordSearchAnalytics({ query: parsed.q, category: parsed.category, filters: { ...attributes, ...(parsed.location && { location: parsed.location }), ...(parsed.condition?.length && { condition: parsed.condition.join(',') }), ...(parsed.minPrice !== undefined && { minPrice: parsed.minPrice }), ...(parsed.maxPrice !== undefined && { maxPrice: parsed.maxPrice }) }, resultCount: result.total });
  res.json({ success: true, data: { listings: result.listings, pagination: { page: parsed.page, limit: parsed.limit, total: result.total, totalPages: Math.ceil(result.total / parsed.limit) }, filters: getFilterConfiguration(parsed.category), ranking: { organicSort: parsed.sort, promotedPlacement: 'clearly-labelled' } } });
}
