import { z } from 'zod';
import { BRAND_ALIASES, CATEGORY_ALIASES, CITIES } from '../constants/aiPolicies.js';
import type { SearchIntent } from './types.js';

const CONDITIONS = ['new', 'like-new', 'used', 'refurbished', 'open-box', 'for-parts'] as const;
const SORTS = ['recommended', 'newest', 'price-asc', 'price-desc', 'most-viewed', 'nearest'] as const;

export const searchIntentSchema = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional(),
  subcategory: z.string().trim().max(80).regex(/^[a-z0-9-]*$/).optional(),
  keywords: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(80).optional(),
  minPrice: z.number().min(0).max(1_000_000_000_000).optional(),
  maxPrice: z.number().min(0).max(1_000_000_000_000).optional(),
  minYear: z.number().int().min(1950).max(2100).optional(),
  maxYear: z.number().int().min(1950).max(2100).optional(),
  condition: z.array(z.enum(CONDITIONS)).max(6).optional(),
  location: z.string().trim().max(80).optional(),
  sort: z.enum(SORTS).optional(),
  attributes: z.record(z.union([z.string().max(80), z.number(), z.boolean()])).optional(),
}).strict().refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
  message: 'Minimum price must not exceed maximum price',
  path: ['minPrice'],
}).refine((data) => data.minYear === undefined || data.maxYear === undefined || data.minYear <= data.maxYear, {
  message: 'Minimum year must not exceed maximum year',
  path: ['minYear'],
});

export function validateSearchIntent(input: unknown): SearchIntent {
  const parsed = searchIntentSchema.safeParse(sanitizeIntent(input));
  if (!parsed.success) return {};
  return stripEmpty(parsed.data);
}

function sanitizeIntent(input: unknown) {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    next[key] = value;
  }
  return next;
}

function stripEmpty(intent: SearchIntent): SearchIntent {
  const next: SearchIntent = {};
  for (const [key, value] of Object.entries(intent)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    if (key === 'attributes' && value && typeof value === 'object' && !Object.keys(value as object).length) continue;
    (next as any)[key] = value;
  }
  return next;
}

export function mergeIntent(previous: SearchIntent | null | undefined, next: SearchIntent): SearchIntent {
  return stripEmpty({
    ...(previous || {}),
    ...next,
    attributes: { ...(previous?.attributes || {}), ...(next.attributes || {}) },
    condition: next.condition?.length ? next.condition : previous?.condition,
  });
}

export function parsePriceToken(raw: string): number | undefined {
  const cleaned = raw.toLowerCase().replace(/[,₹rs.]+/g, '').trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(k|m|million|lakh|lac)?$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'k') return Math.round(amount * 1000);
  if (suffix === 'm' || suffix === 'million') return Math.round(amount * 1_000_000);
  if (suffix === 'lakh' || suffix === 'lac') return Math.round(amount * 100_000);
  return Math.round(amount);
}

export function extractHeuristicIntent(query: string, previous?: SearchIntent | null): SearchIntent {
  const text = query.toLowerCase();
  const intent: SearchIntent = {};

  const under = text.match(/(?:under|below|less than|upto|up to|max(?:imum)?)\s*(?:rs\.?|pkr)?\s*([\d.,]+\s*(?:k|m|million|lakh|lac)?)/i);
  if (under) intent.maxPrice = parsePriceToken(under[1]);
  const over = text.match(/(?:over|above|more than|min(?:imum)?|at least)\s*(?:rs\.?|pkr)?\s*([\d.,]+\s*(?:k|m|million|lakh|lac)?)/i);
  if (over) intent.minPrice = parsePriceToken(over[1]);
  const between = text.match(/between\s*(?:rs\.?|pkr)?\s*([\d.,]+\s*(?:k|m|million|lakh|lac)?)\s*(?:and|-|to)\s*(?:rs\.?|pkr)?\s*([\d.,]+\s*(?:k|m|million|lakh|lac)?)/i);
  if (between) {
    intent.minPrice = parsePriceToken(between[1]);
    intent.maxPrice = parsePriceToken(between[2]);
  }
  if (intent.maxPrice === undefined) {
    const bare = text.match(/(?:rs\.?|pkr)\s*([\d.,]+\s*(?:k|m|million|lakh|lac)?)/i);
    if (bare && /under|below|less|upto|max/.test(text)) intent.maxPrice = parsePriceToken(bare[1]);
  }

  const conditions: string[] = [];
  if (/\bbrand new\b|\bnew\b/.test(text) && !/renew|news/.test(text)) conditions.push('new');
  if (/\blike[-\s]?new\b/.test(text)) conditions.push('like-new');
  if (/\bused\b|\bsecond[-\s]?hand\b/.test(text)) conditions.push('used');
  if (/\brefurb/.test(text)) conditions.push('refurbished');
  if (conditions.length) intent.condition = [...new Set(conditions)] as SearchIntent['condition'];

  const yearRange = text.match(/\b(19[89]\d|20[0-3]\d)\s*(?:to|-|–|until)\s*(19[89]\d|20[0-3]\d)\b/);
  if (yearRange) {
    intent.minYear = Number(yearRange[1]);
    intent.maxYear = Number(yearRange[2]);
  } else {
    const fromYear = text.match(/(?:from|after)\s*(19[89]\d|20[0-3]\d)/);
    const toYear = text.match(/(?:to|before|upto|up to)\s*(19[89]\d|20[0-3]\d)/);
    if (fromYear) intent.minYear = Number(fromYear[1]);
    if (toYear) intent.maxYear = Number(toYear[1]);
  }

  for (const city of CITIES) {
    if (text.includes(city.toLowerCase())) { intent.location = city; break; }
  }

  for (const [alias, mapped] of Object.entries(BRAND_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(text)) {
      intent.brand = mapped.brand;
      if (mapped.category && !intent.category) intent.category = mapped.category;
    }
  }

  const iphone = text.match(/\biphone\s*(\d{1,2}\s*(?:pro(?:\s*max)?|plus|mini)?)\b/i);
  if (iphone) {
    intent.model = `iPhone ${iphone[1].replace(/\s+/g, ' ').trim()}`;
    intent.brand = 'Apple';
    intent.category = 'mobiles';
  }

  for (const [alias, slug] of Object.entries(CATEGORY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(text) && !intent.category) intent.category = slug;
  }
  if (/\bgaming laptop\b|\blaptop\b/.test(text)) intent.category = 'computers-laptops';
  if (/\bfurniture\b|\bsofa\b/.test(text)) intent.category = 'furniture';
  if (/\bcars?\b/.test(text)) intent.category = 'cars';

  const attributes: Record<string, string | number | boolean> = {};
  if (/\bautomatic\b/.test(text)) attributes.transmission = 'Automatic';
  if (/\bmanual\b/.test(text)) attributes.transmission = 'Manual';
  if (/\brtx\b/.test(text)) attributes.gpu = 'RTX';
  if (/\b16\s*gb\b/.test(text)) attributes.ram = '16GB';
  if (/\bssd\b/.test(text)) attributes.storageType = 'SSD';
  if (/\bgaming\b/.test(text)) attributes.useCase = 'Gaming';
  if (intent.brand && (intent.category === 'mobiles' || intent.category === 'electronics' || intent.category === 'computers-laptops')) {
    attributes.brand = intent.brand;
  }
  if (intent.brand && intent.category === 'cars') attributes.make = intent.brand;
  if (Object.keys(attributes).length) intent.attributes = attributes;

  if (/\bcheapest|lowest price|price low\b/.test(text)) intent.sort = 'price-asc';
  else if (/\bmost expensive|highest price\b/.test(text)) intent.sort = 'price-desc';
  else if (/\bnewest|latest|recent\b/.test(text)) intent.sort = 'newest';

  const stop = new Set(['find', 'me', 'a', 'an', 'the', 'show', 'under', 'over', 'with', 'in', 'near', 'my', 'please', 'looking', 'for', 'used', 'new', 'rs', 'pkr', 'million', 'only', 'want', 'need', 'get', 'and', 'to', 'these', 'this', 'those', 'some', 'any', 'good', 'best', 'cheap']);
  if (intent.location) intent.location.toLowerCase().split(/\s+/).forEach((word) => stop.add(word));
  CITIES.forEach((city) => city.toLowerCase().split(/\s+/).forEach((word) => stop.add(word)));
  Object.keys(CATEGORY_ALIASES).forEach((alias) => stop.add(alias));
  Object.keys(BRAND_ALIASES).forEach((alias) => stop.add(alias));
  if (intent.model) intent.model.toLowerCase().split(/\s+/).forEach((word) => stop.add(word));
  const words = query.replace(/[^a-zA-Z0-9+\s]/g, ' ').split(/\s+/).filter((word) => word && !stop.has(word.toLowerCase()) && !/^\d/.test(word));
  if (words.length) intent.keywords = words.slice(0, 8).join(' ');

  return validateSearchIntent(mergeIntent(previous, intent));
}

export function intentToSearchInput(intent: SearchIntent, page = 1, limit = 8) {
  const qParts = [intent.model, intent.keywords].filter(Boolean);
  return {
    q: qParts.join(' ').trim() || undefined,
    category: intent.category,
    subcategory: intent.subcategory,
    location: intent.location,
    minPrice: intent.minPrice,
    maxPrice: intent.maxPrice,
    minYear: intent.minYear,
    maxYear: intent.maxYear,
    condition: intent.condition,
    sort: intent.sort || 'recommended',
    page,
    limit,
    attributes: intent.attributes,
  };
}

export function describeIntent(intent: SearchIntent) {
  const parts: string[] = [];
  if (intent.category) parts.push(`Category: ${intent.category}`);
  if (intent.subcategory) parts.push(`Subcategory: ${intent.subcategory}`);
  if (intent.brand) parts.push(`Brand: ${intent.brand}`);
  if (intent.model) parts.push(`Model: ${intent.model}`);
  if (intent.condition?.length) parts.push(`Condition: ${intent.condition.join(', ')}`);
  if (intent.maxPrice !== undefined) parts.push(`Maximum price: ${intent.maxPrice}`);
  if (intent.minPrice !== undefined) parts.push(`Minimum price: ${intent.minPrice}`);
  if (intent.minYear !== undefined) parts.push(`From year: ${intent.minYear}`);
  if (intent.maxYear !== undefined) parts.push(`To year: ${intent.maxYear}`);
  if (intent.location) parts.push(`Location: ${intent.location}`);
  Object.entries(intent.attributes || {}).forEach(([key, value]) => parts.push(`${key}: ${value}`));
  return parts;
}

/** Human-readable chips used by the transparent "Showing N listings matching…" explanation (§54). */
export function intentExplanationChips(intent: SearchIntent): string[] {
  const chips: string[] = [];
  if (intent.keywords || intent.model) chips.push([intent.model, intent.keywords].filter(Boolean).join(' ').trim());
  if (intent.brand && !intent.model) chips.push(intent.brand);
  if (intent.minPrice !== undefined || intent.maxPrice !== undefined) {
    if (intent.minPrice !== undefined && intent.maxPrice !== undefined) chips.push(`Rs. ${intent.minPrice.toLocaleString('en-PK')} – ${intent.maxPrice.toLocaleString('en-PK')}`);
    else if (intent.maxPrice !== undefined) chips.push(`Under Rs. ${intent.maxPrice.toLocaleString('en-PK')}`);
    else chips.push(`Over Rs. ${intent.minPrice!.toLocaleString('en-PK')}`);
  }
  if (intent.condition?.length) chips.push(intent.condition.map((value) => value.replace('-', ' ')).join(' / '));
  if (intent.location) chips.push(intent.location);
  if (intent.category) chips.push(intent.category.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '));
  if (intent.minYear !== undefined || intent.maxYear !== undefined) {
    if (intent.minYear !== undefined && intent.maxYear !== undefined) chips.push(`${intent.minYear}–${intent.maxYear}`);
    else if (intent.maxYear !== undefined) chips.push(`Up to ${intent.maxYear}`);
    else chips.push(`From ${intent.minYear}`);
  }
  Object.entries(intent.attributes || {}).forEach(([key, value]) => chips.push(`${key}: ${value}`));
  return chips.filter(Boolean).slice(0, 8);
}
