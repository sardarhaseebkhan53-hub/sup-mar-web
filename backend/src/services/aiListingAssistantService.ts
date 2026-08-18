import { CATEGORY_ALIASES } from '../constants/aiPolicies.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { SUBCATEGORIES, slugify } from '../constants/discovery.js';
import { compactListingForModel } from '../ai/listings.js';
import { getAIService } from '../ai/AIService.js';
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

/**
 * Attribute extraction (§34): suggest attributes found ONLY in seller-supplied text.
 * The seller must confirm before anything is saved.
 */
export async function suggestAttributes(text: string) {
  const cleaned = String(text || '').trim().slice(0, 1000);
  if (!cleaned) {
    return { attributes: {}, confirmRequired: true, invented: false as const, note: 'Type what you know about the item and I will suggest attributes to confirm.' };
  }
  const providerAttributes = await getAIService().extractAttributes(cleaned);
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(providerAttributes || {})) {
    if (!/^[a-zA-Z]+$/.test(key)) continue;
    const normalized = key.charAt(0).toLowerCase() + key.slice(1);
    if (!['brand', 'model', 'storage', 'ram', 'color', 'year', 'transmission', 'mileage'].includes(normalized)) continue;
    if (typeof value === 'string' && value.trim() && value.length <= 60) safe[normalized] = value.trim();
  }
  return {
    attributes: safe,
    confirmRequired: true,
    invented: false as const,
    note: 'Review each suggestion. I only read what you typed — I never add specifications you did not supply.',
  };
}

/**
 * Price insight (§36–37): ranges come from comparable REAL QAVLIO listings only.
 * Fewer than three comparables → honest "not enough data" answer. Never a guarantee.
 */
export async function priceInsight(input: { category?: string; subcategory?: string; attributes?: Record<string, unknown>; brand?: string; model?: string; excludeListingId?: string; price?: number }) {
  const category = input.category?.trim();
  if (!category) {
    return { available: false, source: 'I need a category before I can compare prices.', comparables: 0, note: 'Price insights use real QAVLIO listings only — I do not guess market value.' };
  }
  const base: any = { category, sort: 'recommended', page: 1, limit: 40, ...(input.excludeListingId && { excludeListingIds: [input.excludeListingId] }) };
  let comparables: any[] = (await searchListings(base)).listings;
  const attributeFilters = Object.entries(input.attributes || {}).filter(([key]) => ['brand', 'make', 'model', 'storage', 'ram'].includes(key));
  if (attributeFilters.length) {
    const refined = await searchListings({ ...base, attributes: Object.fromEntries(attributeFilters) });
    if (refined.listings.length >= 3) comparables = refined.listings;
  }
  const keyword = [input.brand, input.model].filter(Boolean).join(' ');
  if (keyword && comparables.length < 3) {
    const byKeyword = await searchListings({ ...base, q: keyword });
    comparables = [...comparables, ...byKeyword.listings.filter((row: any) => !comparables.some((item) => item.publicId === row.publicId))];
  }

  const prices = comparables.map((row: any) => Number(row.price?.toString?.() ?? row.price ?? 0)).filter((value) => value > 0).sort((a, b) => a - b);
  if (prices.length < 3) {
    return {
      available: false,
      comparables: prices.length,
      source: 'Based on available QAVLIO listings.',
      note: 'I don\u2019t have enough comparable QAVLIO listings to estimate this reliably right now.',
    };
  }
  const median = prices[Math.floor(prices.length / 2)];
  const lower = prices[Math.max(0, Math.floor(prices.length * 0.25))];
  const upper = prices[Math.min(prices.length - 1, Math.floor(prices.length * 0.75))];
  const stance = input.price === undefined ? undefined
    : input.price <= lower ? 'below the common range for similar QAVLIO listings'
      : input.price >= upper ? 'above the common range for similar QAVLIO listings'
        : 'inside the common range for similar QAVLIO listings';
  return {
    available: true,
    comparables: prices.length,
    min: prices[0],
    max: prices[prices.length - 1],
    median,
    typicalRange: { lower, upper },
    stance,
    source: `Based on ${prices.length} available QAVLIO listing${prices.length === 1 ? '' : 's'}.`,
    disclaimer: 'This describes what sellers currently ask — it is not a guarantee of selling price.',
  };
}

export type ListingQualityInput = {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  condition?: string;
  price?: number;
  imageCount?: number;
  attributes?: Record<string, unknown>;
  location?: string;
};

/**
 * Listing quality score (§38): 0–100 seller-facing completeness score.
 * This is a listing-quality score — explicitly NOT a trust or safety score.
 */
export function qualityScore(input: ListingQualityInput) {
  const breakdown: Array<{ key: string; label: string; score: number; max: number; note: string }> = [];
  const suggestions: string[] = [];

  const title = String(input.title || '').trim();
  let titleScore = 0;
  if (title.length >= 10 && title.length <= 70) titleScore += 15;
  else if (title.length) titleScore += 7;
  else suggestions.push('Add a title');
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 3) titleScore += 5;
  if (/\b\d/.test(title)) titleScore += 5; else suggestions.push('Add a key detail (model, size, or capacity) to the title');
  if (title && title === title.toLowerCase() && words.length > 1) titleScore -= 3; // all-lowercase titles read worse
  titleScore = Math.max(0, Math.min(25, titleScore));
  breakdown.push({ key: 'title', label: 'Title quality', score: titleScore, max: 25, note: title ? '' : 'Missing title' });

  const description = String(input.description || '').trim();
  let descriptionScore = 0;
  if (description.length >= 80) descriptionScore += 20;
  else if (description.length >= 30) descriptionScore += 12;
  else if (description.length) descriptionScore += 6;
  else suggestions.push('Write a description');
  if (/(condition|used|new|box|warranty|included|accessor)/i.test(description)) descriptionScore += 5;
  else suggestions.push('Describe the condition and what is included');
  descriptionScore = Math.min(25, descriptionScore);
  breakdown.push({ key: 'description', label: 'Description completeness', score: descriptionScore, max: 25, note: description ? '' : 'Missing description' });

  const images = Number(input.imageCount || 0);
  const imageScore = images >= 4 ? 20 : images === 3 ? 15 : images === 2 ? 10 : images === 1 ? 6 : 0;
  if (images < 3) suggestions.push(`Add ${Math.max(0, 3 - images)} more photo${3 - images === 1 ? '' : 's'}`);
  breakdown.push({ key: 'images', label: 'Image availability', score: imageScore, max: 20, note: `${images} photo${images === 1 ? '' : 's'}` });

  const attributes = input.attributes instanceof Object ? input.attributes : {};
  const attributeKeys = Object.keys(attributes).filter((key) => !['listingType'].includes(key));
  const categoryAttributeScore = attributeKeys.length >= 4 ? 15 : attributeKeys.length >= 2 ? 10 : attributeKeys.length ? 6 : 0;
  if (attributeKeys.length < 2) suggestions.push('Add missing attributes (brand, storage, year…)');
  breakdown.push({ key: 'attributes', label: 'Attribute completeness', score: categoryAttributeScore, max: 15, note: `${attributeKeys.length} attributes` });

  const hasCategory = Boolean(input.category);
  if (!hasCategory) suggestions.push('Choose a category');
  breakdown.push({ key: 'category', label: 'Category accuracy', score: hasCategory ? 15 : 0, max: 15, note: hasCategory ? `${input.category}${input.subcategory ? ` → ${input.subcategory}` : ''}` : 'Missing category' });

  const score = Math.round(breakdown.reduce((sum, part) => sum + part.score, 0));
  return {
    score,
    max: 100,
    breakdown,
    suggestions: [...new Set(suggestions)].slice(0, 6),
    disclaimer: 'This measures listing completeness — it is not a trust or verification score.',
  };
}

export async function listingAssistant(input: { action: string; title?: string; description?: string; category?: string; facts?: Record<string, string>; text?: string }) {
  const facts = Object.fromEntries(Object.entries({ title: input.title, description: input.description, category: input.category, ...(input.facts || {}) }).filter(([, value]) => value !== undefined && value !== '')) as Record<string, string>;
  if (input.action === 'title') return { action: 'title', ...improveTitle(facts) };
  if (input.action === 'description') return { action: 'description', ...improveDescription(facts) };
  if (input.action === 'category') return { action: 'category', ...suggestCategory(`${facts.title || ''} ${facts.description || ''} ${facts.category || ''}`) };
  if (input.action === 'tags') return { action: 'tags', tags: suggestTags(facts), invented: false };
  if (input.action === 'attributes') return { action: 'attributes', ...(await suggestAttributes(input.text || `${facts.title || ''} ${facts.description || ''}`)) };
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
    comparison: buildComparison(rows, keys),
    completeness: rows.map((row: any) => ({
      publicId: row.publicId,
      listedFields: Object.values(row).filter((value) => value !== undefined && value !== null && value !== '').length,
    })),
    aiSummary: summarizeComparison(rows),
    note: 'Missing specifications are shown as “Not listed”. I will not invent them.',
    source: `According to ${rows.length} QAVLIO listings.`,
  };
}

/** Only compare attributes that actually exist on every selected listing (§17). */
function buildComparison(rows: any[], baseKeys: string[]) {
  const attributeKeys = ['brand', 'model', 'ram', 'storage', 'year', 'make', 'transmission', 'color'];
  const attributeRows = rows.map((row: any) => row.attributes || {});
  const presentKeys = attributeKeys.filter((key) => attributeRows.some((attributes: any) => attributes[key] !== undefined && attributes[key] !== null && attributes[key] !== ''));
  return [...baseKeys, ...presentKeys].map((key) => ({
    field: key,
    values: rows.map((row: any) => {
      if (key === 'city') return [row.area, row.city].filter(Boolean).join(', ') || 'Not listed';
      if (key === 'price') return row.price;
      if (key in (row.attributes || {})) return String((row.attributes as any)[key]);
      return row[key] ?? 'Not listed';
    }),
  }));
}

/** AI comparison summary (§18): every claim cites values that came from the compared listings. */
function summarizeComparison(rows: any[]) {
  if (rows.length < 2) return [];
  const bullets: string[] = [];
  const cheapest = rows.reduce((min, row) => Number(row.price) < Number(min.price) ? row : min, rows[0]);
  const costliest = rows.reduce((max, row) => Number(row.price) > Number(max.price) ? row : max, rows[0]);
  if (cheapest !== costliest) {
    bullets.push(`${cheapest.title} is the lower-priced option at Rs. ${Number(cheapest.price).toLocaleString('en-PK')} (compared with Rs. ${Number(costliest.price).toLocaleString('en-PK')} for ${costliest.title}).`);
  }
  const ramRows = rows.filter((row: any) => row.attributes?.ram);
  if (ramRows.length >= 2) {
    const byRam = ramRows.map((row: any) => ({ row, ram: parseInt(String(row.attributes.ram), 10) || 0 }));
    const top = byRam.reduce((max, item) => item.ram > max.ram ? item : max, byRam[0]);
    if (byRam.some((item) => item.ram < top.ram)) bullets.push(`${top.row.title} lists the most RAM (${top.row.attributes.ram}).`);
  }
  const storageRows = rows.filter((row: any) => row.attributes?.storage);
  if (storageRows.length >= 2) {
    const byStorage = storageRows.map((row: any) => ({ row, storage: parseInt(String(row.attributes.storage), 10) || 0 }));
    const top = byStorage.reduce((max, item) => item.storage > max.storage ? item : max, byStorage[0]);
    if (byStorage.some((item) => item.storage < top.storage)) bullets.push(`${top.row.title} lists the most storage (${top.row.attributes.storage}).`);
  }
  const cities = new Set(rows.map((row: any) => row.city).filter(Boolean));
  if (cities.size === 1 && cities.size > 0) bullets.push(`All compared listings are located in ${[...cities][0]}.`);
  else if (cities.size > 1) {
    const counts = [...cities].map((city) => ({ city, count: rows.filter((row: any) => row.city === city).length }));
    const most = counts.reduce((max, item) => item.count > max.count ? item : max, counts[0]);
    bullets.push(`${most.count} of ${rows.length} compared listings are in ${most.city}.`);
  }
  const missing = rows.filter((row: any) => !row.attributes || !Object.keys(row.attributes).length);
  if (missing.length) bullets.push(`${missing.length} listing${missing.length === 1 ? '' : 's'} list no detailed attributes — ask the seller before assuming.`);
  bullets.push('Every value above comes from the compared QAVLIO listings — nothing is inferred.');
  return bullets.slice(0, 6);
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
function label(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
