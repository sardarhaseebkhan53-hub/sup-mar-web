import { CATEGORY_ALIASES } from '../constants/aiPolicies.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { SUBCATEGORIES, slugify } from '../constants/discovery.js';
import { compactListingForModel } from '../ai/listings.js';
import { findListingByPublicKey } from './listingService.js';
import { searchListings } from './searchService.js';
import { AppError } from '../utils/AppError.js';

const FACT_KEYS = ['brand', 'model', 'storage', 'condition', 'color', 'ram', 'storageSize', 'year', 'make', 'mileage', 'warranty', 'accessories'];

export function improveTitle(facts: Record<string, string>) {
  const parts = [facts.brand, facts.model || facts.title, facts.storage || facts.storageSize || facts.ram, facts.condition ? titleCase(facts.condition.replace(/-/g, ' ')) : '']
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  const supplied = facts.title?.trim();
  if (!parts.length && supplied) {
    return {
      suggestion: titleCase(supplied),
      note: 'Add brand, model, storage, and condition only if you can confirm them.',
      invented: false,
    };
  }
  if (supplied && supplied.split(/\s+/).length >= 4 && parts.length < 2) {
    return { suggestion: supplied, note: 'Kept your wording. I will not add specifications you did not supply.', invented: false };
  }
  const suggestion = parts.length ? parts.join(' ') : titleCase(supplied || 'Complete this title with confirmed details');
  return { suggestion: suggestion.slice(0, 100), note: 'Only confirmed details were used.', invented: false };
}

export function improveDescription(facts: Record<string, string>) {
  const missing: string[] = [];
  if (!facts.condition) missing.push('condition');
  if (!facts.price) missing.push('price');
  if (!facts.location) missing.push('location');
  const known = Object.entries(facts).filter(([key, value]) => value && key !== 'description').map(([key, value]) => `${label(key)}: ${value}`);
  const body = [
    facts.description?.trim(),
    known.length ? `Confirmed details:\n${known.map((line) => `• ${line}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
  return {
    suggestion: body || 'Share the facts you can confirm and I will turn them into a clearer description.',
    missing,
    questions: missing.map((field) => `What is the ${field}?`),
    invented: false,
    note: 'I did not add warranty, mileage, ownership, or features that were not supplied.',
  };
}

export function suggestCategory(text: string) {
  const hay = text.toLowerCase();
  let category = DEFAULT_CATEGORIES.find((item) => hay.includes(item.slug) || hay.includes(item.name.toLowerCase()));
  if (!category) {
    const alias = Object.entries(CATEGORY_ALIASES).find(([key]) => new RegExp(`\\b${key}\\b`, 'i').test(hay));
    if (alias) category = DEFAULT_CATEGORIES.find((item) => item.slug === alias[1] || item.slug.startsWith(alias[1])) || DEFAULT_CATEGORIES.find((item) => item.slug === 'other');
  }
  if (/\bps5|playstation|xbox|nintendo|console/.test(hay)) category = DEFAULT_CATEGORIES.find((item) => item.slug === 'electronics') || category;
  if (/\biphone|samsung galaxy|pixel\b/.test(hay)) category = DEFAULT_CATEGORIES.find((item) => item.slug === 'mobiles') || category;
  const parent = category?.slug || 'other';
  const children = SUBCATEGORIES[parent] || [];
  let subcategory = children.find((name) => hay.includes(name.toLowerCase()));
  if (!subcategory && /\bps5|console|gaming/.test(hay)) subcategory = children.find((name) => /gaming/i.test(name));
  if (!subcategory && /\biphone|phone/.test(hay)) subcategory = children.find((name) => /mobile/i.test(name));
  return {
    category: { name: category?.name || 'Other', slug: parent },
    subcategory: subcategory ? { name: subcategory, slug: slugify(subcategory) } : null,
    confirmRequired: true,
    note: 'Confirm this category before saving. I will not change it automatically.',
  };
}

export function suggestTags(facts: Record<string, string>) {
  const source = Object.values(facts).join(' ');
  const words = source.split(/[^a-zA-Z0-9+]+/).filter((word) => word.length > 2 && word.length < 18);
  return [...new Set(words.map((word) => word.toLowerCase()))].slice(0, 8);
}

export async function listingAssistant(input: { action: string; title?: string; description?: string; category?: string; facts?: Record<string, string> }) {
  const facts = Object.fromEntries(Object.entries({ title: input.title, description: input.description, category: input.category, ...(input.facts || {}) }).filter(([, value]) => value !== undefined && value !== '')) as Record<string, string>;
  if (input.action === 'title') return { action: 'title', ...improveTitle(facts) };
  if (input.action === 'description') return { action: 'description', ...improveDescription(facts) };
  if (input.action === 'category') return { action: 'category', ...suggestCategory(`${facts.title || ''} ${facts.description || ''} ${facts.category || ''}`) };
  if (input.action === 'tags') return { action: 'tags', tags: suggestTags(facts), invented: false };
  return {
    action: 'improve',
    title: improveTitle(facts),
    description: improveDescription(facts),
    category: suggestCategory(`${facts.title || ''} ${facts.description || ''}`),
    tags: suggestTags(facts),
    missing: FACT_KEYS.filter((key) => !facts[key]),
  };
}

export async function explainListing(listingKey: string) {
  const record: any = await findListingByPublicKey(listingKey);
  if (!record || !['published', 'sold', 'paused', 'expired'].includes(record.status || 'published')) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  const compact = compactListingForModel(record);
  const attributes = compact?.attributes || {};
  const details = [
    compact?.title && `Title: ${compact.title}`,
    compact?.price !== undefined && `Price: Rs. ${Number(compact.price).toLocaleString()}`,
    compact?.condition && `Condition: ${compact.condition}`,
    compact?.city && `Location: ${[compact.area, compact.city].filter(Boolean).join(', ')}`,
    compact?.category && `Category: ${compact.category}`,
    ...Object.entries(attributes).map(([key, value]) => `${label(key)}: ${value}`),
  ].filter((item): item is string => Boolean(item));
  const missing = ['warranty', 'accessories', 'reason for selling', 'purchase date'].filter((field) => !JSON.stringify(record).toLowerCase().includes(field.split(' ')[0]));
  const similar = await searchListings({ category: record.categorySlug, sort: 'recommended', page: 1, limit: 24 });
  const prices = similar.listings.map((item: any) => Number(item.price?.toString?.() ?? item.price ?? 0)).filter((value) => value > 0);
  const insight = prices.length >= 3
    ? { source: `Based on ${prices.length} QAVLIO listings`, min: Math.min(...prices), max: Math.max(...prices), count: prices.length }
    : { source: 'I don\'t have enough comparable QAVLIO listings to estimate this reliably.', count: prices.length };
  return {
    listing: compact,
    summary: {
      keyDetails: details,
      pros: details.slice(0, 4),
      questions: [
        'Is the price negotiable?',
        'What is included with the item?',
        missing.includes('warranty') ? 'Is any warranty still valid?' : 'When can I inspect it?',
      ],
      missing,
      caution: 'This summary uses only information in the listing. I cannot verify product quality.',
    },
    priceInsight: insight,
  };
}

export async function compareListings(ids: string[]) {
  const unique = [...new Set(ids)].slice(0, 3);
  if (unique.length < 2) throw new AppError(422, 'Select 2 or 3 listings to compare', 'COMPARE_INVALID');
  const records = (await Promise.all(unique.map(findListingByPublicKey))).filter(Boolean);
  if (records.length < 2) throw new AppError(404, 'I couldn\'t find enough matching listings to compare.', 'COMPARE_NOT_FOUND');
  const rows = records.map((record: any) => compactListingForModel(record)).filter(Boolean);
  const keys = ['price', 'condition', 'city', 'category'];
  return {
    listings: rows,
    comparison: keys.map((key) => ({
      field: key,
      values: rows.map((row: any) => key === 'city' ? [row.area, row.city].filter(Boolean).join(', ') : row[key] ?? 'Not listed'),
    })),
    completeness: rows.map((row: any) => ({
      publicId: row.publicId,
      listedFields: Object.values(row).filter((value) => value !== undefined && value !== null && value !== '').length,
    })),
    note: 'Missing specifications are shown as “Not listed”. I will not invent them.',
    source: `According to ${rows.length} QAVLIO listings.`,
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
function label(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
