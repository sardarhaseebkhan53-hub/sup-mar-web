import { z } from 'zod';

const locationSchema = z.object({
  country: z.string().trim().length(2).default('PK'),
  province: z.string().trim().max(80).optional().default(''),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().min(2).max(100),
}).strict();

const mediaSchema = z.object({
  url: z.string().url().max(1000), thumbnailUrl: z.string().url().max(1000).optional(), key: z.string().trim().min(3).max(300),
  alt: z.string().trim().max(180).optional().default(''), order: z.number().int().min(0).max(11), type: z.literal('image').default('image'),
  width: z.number().int().min(1).max(10000).optional(), height: z.number().int().min(1).max(10000).optional(), isCover: z.boolean().optional(),
}).strict();

const attributeValue = z.union([z.string().trim().max(120), z.number().finite(), z.boolean()]);
export const listingInputSchema = z.object({
  categorySlug: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  subcategorySlug: z.string().trim().regex(/^[a-z0-9-]+$/).nullable().optional(),
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(10000).optional(),
  price: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
  currency: z.enum(['PKR']).default('PKR'), negotiable: z.boolean().default(false),
  condition: z.enum(['new', 'like-new', 'used', 'refurbished', 'for-parts']).optional(),
  attributes: z.record(attributeValue).default({}), media: z.array(mediaSchema).max(12).default([]),
  location: locationSchema.optional(),
  sku: z.string().trim().max(40).optional(),
  stock: z.object({
    tracked: z.boolean().optional(),
    quantity: z.number().int().min(0).max(1_000_000).optional(),
    lowStockThreshold: z.number().int().min(0).max(100_000).optional(),
    stayVisibleWhenOutOfStock: z.boolean().optional(),
  }).strict().optional(),
}).strict();

export const sellerListingQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), status: z.enum(['draft', 'pending', 'published', 'rejected', 'paused', 'sold', 'expired', 'removed']).optional(),
  category: z.string().trim().max(80).optional(), date: z.enum(['today', '7days', '30days']).optional(), minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(), sort: z.enum(['newest', 'oldest', 'most-viewed', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListingInput = z.infer<typeof listingInputSchema>;
