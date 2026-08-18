import { z } from 'zod';
import { BRAND_ALIASES, CATEGORY_ALIASES, CITIES } from '../constants/aiPolicies.js';
import { CATEGORY_ATTRIBUTE_KEYS } from '../constants/marketplaceLexicon.js';
import { CATEGORY_FILTERS, SUBCATEGORIES, slugify } from '../constants/discovery.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
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
  minYear: z.number().int().min(1900).max(2100).optional(),
  maxYear: z.number().int().min(1900).max(2100).optional(),
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

/**
 * Every category/subcategory slug QAVLIO actually uses. AI-proposed taxonomy
 * values are checked against this set so a hallucinated category can never
 * reach a database query.
 */
const KNOWN_CATEGORY_SLUGS = new Set<string>([
  ...DEFAULT_CATEGORIES.map((item) => item.slug),
  ...Object.keys(SUBCATEGORIES),
  ...Object.values(SUBCATEGORIES).flat().map((name) => slugify(name)),
  ...Object.values(CATEGORY_ALIASES),
]);

/**
 * Phase 16 search safety — every AI-produced filter is re-validated here before it
 * can reach MongoDB. Unknown keys, operator injection (`$`, dotted paths), unknown
 * attribute names, and out-of-range values are dropped rather than trusted.
 */
export function validateSearchIntent(input: unknown): SearchIntent {
  const parsed = searchIntentSchema.safeParse(sanitizeIntent(input));
  if (!parsed.success) return {};
  const intent = stripEmpty(parsed.data);

  // A category the AI proposed must exist in QAVLIO's own taxonomy, otherwise it is dropped.
  if (intent.category && !KNOWN_CATEGORY_SLUGS.has(intent.category)) delete intent.category;
  if (intent.subcategory && !KNOWN_CATEGORY_SLUGS.has(intent.subcategory)) delete intent.subcategory;

  if (intent.attributes) {
    const allowed = allowedAttributeKeys(intent.category);
    const safe: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(intent.attributes)) {
      if (!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key)) continue;
      if (allowed.size && !allowed.has(key)) continue;
      if (typeof value === 'string' && (!value.trim() || value.includes('$'))) continue;
      safe[key] = value;
    }
    if (Object.keys(safe).length) intent.attributes = safe;
    else delete intent.attributes;
  }
  return intent;
}

/** Attribute names an AI filter may reference, taken only from QAVLIO's own taxonomy. */
export function allowedAttributeKeys(category?: string) {
  const keys = new Set<string>();
  const add = (list: string[]) => list.forEach((key) => keys.add(key));
  if (category) {
    add((CATEGORY_FILTERS[category] || []).map((filter) => filter.key));
    add(CATEGORY_ATTRIBUTE_KEYS[category] || []);
    if (keys.size) { keys.add('listingType'); return keys; }
  }
  Object.values(CATEGORY_FILTERS).forEach((filters) => add(filters.map((filter) => filter.key)));
  Object.values(CATEGORY_ATTRIBUTE_KEYS).forEach(add);
  keys.add('listingType');
  return keys;
}

function sanitizeIntent(input: unknown) {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') continue;
    if (key === 'sortPreference' && typeof value === 'string') { next.sort = value; continue; }
    if (key === 'attributes' && value && typeof value === 'object' && !Array.isArray(value)) {
      next.attributes = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([attributeKey]) => !attributeKey.startsWith('$') && !attributeKey.includes('.')));
      continue;
    }
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

  const carModel = text.match(/\b(corolla|civic|city|yaris|alto|cultus|swift|sportage|tucson|picanto|mehran|vitz|prius)\b/i);
  if (carModel) {
    intent.model = carModel[1].replace(/^./, (char) => char.toUpperCase());
    intent.category = intent.category === 'motorcycles' ? intent.category : 'cars';
  }

  for (const [alias, slug] of Object.entries(CATEGORY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(text) && !intent.category) intent.category = slug;
  }
  if (/\bgaming laptop\b|\blaptop\b/.test(text)) intent.category = 'computers-laptops';
  if (/\bfurniture\b|\bsofa\b/.test(text)) intent.category = 'furniture';
  if (/\bcars?\b/.test(text)) intent.category = 'cars';

  // Model-year ranges: "2020 to 2023", "between 2018 and 2022", "2019 or newer".
  const yearRange = text.match(/\b(19|20)(\d{2})\s*(?:to|-|–|and|through|until)\s*(19|20)(\d{2})\b/);
  if (yearRange) {
    const from = Number(`${yearRange[1]}${yearRange[2]}`);
    const to = Number(`${yearRange[3]}${yearRange[4]}`);
    if (from <= to) { intent.minYear = from; intent.maxYear = to; }
  } else {
    const newerThan = text.match(/\b(19|20)(\d{2})\s*(?:or newer|onwards|and above|\+)\b/);
    if (newerThan) intent.minYear = Number(`${newerThan[1]}${newerThan[2]}`);
    const olderThan = text.match(/\b(?:before|older than|up to)\s*(19|20)(\d{2})\b/);
    if (olderThan) intent.maxYear = Number(`${olderThan[1]}${olderThan[2]}`);
  }

  const attributes: Record<string, string | number | boolean> = {};
  if (/\bautomatic\b/.test(text)) attributes.transmission = 'Automatic';
  if (/\bmanual\b/.test(text)) attributes.transmission = 'Manual';
  if (/\bhybrid\b/.test(text)) attributes.fuel = 'Hybrid';
  else if (/\bdiesel\b/.test(text)) attributes.fuel = 'Diesel';
  else if (/\belectric\b/.test(text)) attributes.fuel = 'Electric';
  if (/\brtx\b/.test(text)) attributes.gpu = 'RTX';
  const ram = text.match(/\b(4|6|8|12|16|24|32|64)\s*gb\s*(?:of\s*)?ram\b/);
  if (ram) attributes.ram = `${ram[1]}GB`;
  else if (/\b16\s*gb\b/.test(text)) attributes.ram = '16GB';
  const storage = text.match(/\b(32|64|128|256|512)\s*gb\b(?!\s*(?:of\s*)?ram)/);
  if (storage && (intent.category === 'mobiles' || /\bstorage\b/.test(text))) attributes.storage = `${storage[1]}GB`;
  const terabyte = text.match(/\b(1|2)\s*tb\b/);
  if (terabyte) attributes.storage = `${terabyte[1]}TB`;
  if (/\bssd\b/.test(text)) attributes.storageType = 'SSD';
  if (/\bgaming\b/.test(text)) attributes.useCase = 'Gaming';
  if (/\bprogramming|coding|development|software\b/.test(text) && intent.category === 'computers-laptops') attributes.useCase = 'Business';
  const bedrooms = text.match(/\b(\d{1,2})\s*(?:bed|bedroom|bhk)\b/);
  if (bedrooms && intent.category === 'property') attributes.bedrooms = Number(bedrooms[1]);
  for (const colour of ['black', 'white', 'silver', 'grey', 'gray', 'blue', 'red', 'green', 'gold', 'titanium']) {
    if (new RegExp(`\\b${colour}\\b`).test(text)) { attributes.color = colour === 'gray' ? 'Grey' : colour.replace(/^./, (char) => char.toUpperCase()); break; }
  }
  if (/\bleather\b/.test(text)) attributes.material = 'Leather';
  else if (/\bwooden|wood\b/.test(text)) attributes.material = 'Wood';
  if (intent.brand && (intent.category === 'mobiles' || intent.category === 'electronics' || intent.category === 'computers-laptops')) {
    attributes.brand = intent.brand;
  }
  if (intent.brand && intent.category === 'cars') attributes.make = intent.brand;
  if (Object.keys(attributes).length) intent.attributes = attributes;

  if (/\bcheapest|lowest price|price low\b/.test(text)) intent.sort = 'price-asc';
  else if (/\bmost expensive|highest price\b/.test(text)) intent.sort = 'price-desc';
  else if (/\bnewest|latest|recent\b/.test(text)) intent.sort = 'newest';

  const stop = new Set(['find', 'me', 'a', 'an', 'the', 'show', 'under', 'over', 'with', 'in', 'near', 'my', 'please', 'looking', 'for', 'used', 'new', 'rs', 'pkr', 'million', 'only', 'want', 'need', 'get', 'and', 'these', 'this', 'those', 'some', 'any', 'good', 'best', 'cheap']);
  Object.keys(CATEGORY_ALIASES).forEach((alias) => stop.add(alias));
  Object.keys(BRAND_ALIASES).forEach((alias) => stop.add(alias));
  if (intent.model) intent.model.toLowerCase().split(/\s+/).forEach((word) => stop.add(word));
  // Anything already captured as a structured filter must not also survive as a
  // free-text keyword, otherwise the text query fights its own filters.
  if (intent.location) intent.location.toLowerCase().split(/\s+/).forEach((word) => stop.add(word));
  if (intent.brand) intent.brand.toLowerCase().split(/\s+/).forEach((word) => stop.add(word));
  CITIES.forEach((city) => city.toLowerCase().split(/\s+/).forEach((word) => stop.add(word)));
  intent.condition?.forEach((value) => value.toLowerCase().split(/[-\s]+/).forEach((word) => stop.add(word)));
  Object.values(intent.attributes || {}).forEach((value) => String(value).toLowerCase().split(/[-\s]+/).forEach((word) => stop.add(word)));
  // Range/comparison phrasing describes a filter, it is not something to match on.
  ['or', 'newer', 'older', 'above', 'below', 'between', 'from', 'upto', 'up', 'to', 'than', 'less', 'more', 'around', 'about', 'near', 'nearby', 'model', 'year', 'condition', 'listing', 'listings', 'sale', 'buy', 'sell', 'available', 'searching', 'search'].forEach((word) => stop.add(word));
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

/**
 * Structured, user-editable representation of an interpreted query.
 * Powers the "Showing N listings matching …" transparency panel and the
 * removable filter chips in the AI search UI.
 */
export function intentToAppliedFilters(intent: SearchIntent) {
  const chips: Array<{ key: string; label: string; value: string; removable: boolean }> = [];
  const push = (key: string, label: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return;
    chips.push({ key, label, value: String(value), removable: true });
  };
  push('category', 'Category', intent.category);
  push('subcategory', 'Subcategory', intent.subcategory);
  push('brand', 'Brand', intent.brand);
  push('model', 'Model', intent.model);
  if (intent.minPrice !== undefined) push('minPrice', 'Min price', `Rs. ${intent.minPrice.toLocaleString('en-PK')}`);
  if (intent.maxPrice !== undefined) push('maxPrice', 'Max price', `Rs. ${intent.maxPrice.toLocaleString('en-PK')}`);
  push('minYear', 'From year', intent.minYear);
  push('maxYear', 'To year', intent.maxYear);
  if (intent.condition?.length) push('condition', 'Condition', intent.condition.join(', '));
  push('location', 'Location', intent.location);
  Object.entries(intent.attributes || {}).forEach(([key, value]) => {
    chips.push({ key: `attributes.${key}`, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()), value: String(value), removable: true });
  });
  if (intent.sort && intent.sort !== 'recommended') chips.push({ key: 'sort', label: 'Sort', value: intent.sort, removable: true });
  return chips;
}

/** Build the equivalent classic /search query string so users can always leave AI mode. */
export function intentToSearchParams(intent: SearchIntent, rawQuery?: string) {
  const params = new URLSearchParams();
  const q = [intent.model, intent.keywords].filter(Boolean).join(' ').trim() || rawQuery?.trim();
  if (q) params.set('q', q);
  if (intent.category) params.set('category', intent.category);
  if (intent.subcategory) params.set('subcategory', intent.subcategory);
  if (intent.location) params.set('location', intent.location);
  if (intent.minPrice !== undefined) params.set('minPrice', String(intent.minPrice));
  if (intent.maxPrice !== undefined) params.set('maxPrice', String(intent.maxPrice));
  if (intent.condition?.length) params.set('condition', intent.condition.join(','));
  if (intent.sort) params.set('sort', intent.sort);
  Object.entries(intent.attributes || {}).forEach(([key, value]) => params.set(`attr.${key}`, String(value)));
  return params.toString();
}
