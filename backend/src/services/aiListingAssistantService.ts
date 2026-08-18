import { CATEGORY_ALIASES } from '../constants/aiPolicies.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';
import { SUBCATEGORIES, slugify } from '../constants/discovery.js';
import { ATTRIBUTE_VALUE_HINTS, CATEGORY_ATTRIBUTE_KEYS, CATEGORY_KEYWORDS } from '../constants/marketplaceLexicon.js';
import { compactListingForModel } from '../ai/listings.js';
import { getAiService } from '../ai/AIService.js';
import { allowedAttributeKeys } from '../ai/intent.js';
import { sanitizeUserText } from '../ai/promptSecurity.js';
import { findListingByPublicKey } from './listingService.js';
import { searchListings } from './searchService.js';
import { AppError } from '../utils/AppError.js';

/**
 * Phase 16 AI Listing Assistant.
 *
 * Hard rule enforced throughout this module: the assistant may only reorganise or
 * clarify facts the seller supplied. It never invents warranty, accessories,
 * specifications, ownership history, or price claims — and every suggestion must
 * be explicitly applied by the seller.
 */

const FACT_KEYS = ['brand', 'model', 'storage', 'condition', 'color', 'ram', 'storageSize', 'year', 'make', 'mileage', 'warranty', 'accessories'];

/** Words the assistant must never introduce on its own. */
const FORBIDDEN_CLAIMS = [/\bwarrant/i, /\bguarantee/i, /\bbrand ?new\b/i, /\bsealed\b/i, /\bfirst owner\b/i, /\boriginal box\b/i, /\bno fault/i, /\bmint\b/i];

/** Strip any claim the model produced that is not present in the seller's own facts. */
export function stripUnsupportedClaims(candidate: string, sourceText: string) {
  const source = sourceText.toLowerCase();
  return candidate
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const offending = FORBIDDEN_CLAIMS.find((pattern) => pattern.test(sentence));
      if (!offending) return true;
      const match = sentence.match(offending);
      return Boolean(match && source.includes(match[0].toLowerCase()));
    })
    .join(' ')
    .trim();
}

/* ---------------------------------------------------------------- AI title */

export function improveTitle(facts: Record<string, string>) {
  const candidates = [
    facts.brand || facts.make,
    facts.model || facts.title,
    facts.storage || facts.storageSize || facts.ram,
    facts.year,
    facts.transmission,
    facts.color,
    facts.condition ? titleCase(facts.condition.replace(/-/g, ' ')) : '',
  ].map((part) => String(part || '').trim()).filter(Boolean);

  // De-duplicate: a fact already contained in an earlier part must not repeat
  // (e.g. brand "iPhone" + model "iPhone 13" should read "iPhone 13", not "iPhone iPhone 13").
  const parts: string[] = [];
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const covered = parts.some((part) => part.toLowerCase().includes(lower));
    if (covered) continue;
    // If this candidate subsumes an earlier, shorter part, replace it instead of appending.
    const subsumedIndex = parts.findIndex((part) => lower.includes(part.toLowerCase()));
    if (subsumedIndex >= 0) parts[subsumedIndex] = candidate;
    else parts.push(candidate);
  }
  const supplied = facts.title?.trim();
  if (!parts.length && supplied) {
    // Nothing structured to work with: recover a longer phrase from the seller's own
    // description rather than echoing a one-word stub back at them.
    const fromDescription = (facts.description || '')
      .split(/[.!?\n]/)[0]
      .trim()
      .split(/\s+/)
      .slice(0, 12)
      .join(' ')
      .replace(/[,;:]+$/, '');
    const better = fromDescription.split(/\s+/).length > supplied.split(/\s+/).length ? fromDescription : supplied;
    return {
      suggestion: titleCase(better).slice(0, 100),
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

/** AI-assisted title generation with a deterministic guard rail and safe fallback. */
export async function generateTitle(input: { title?: string; description?: string; category?: string; attributes?: Record<string, unknown>; userId?: string | null }) {
  // Facts the seller stated in prose (e.g. "iPhone 13 128GB blue") count as supplied
  // facts, so pull grounded attributes out of their own text before composing.
  const grounded = await extractListingAttributes({ title: input.title, description: input.description, category: input.category, existing: input.attributes, userId: input.userId })
    .then((result) => Object.fromEntries(result.attributes.map((item) => [item.key, item.value])))
    .catch(() => ({} as Record<string, unknown>));
  const facts = factsFrom({ ...input, attributes: { ...grounded, ...(input.attributes || {}) } });
  const baseline = improveTitle(facts);
  const sourceText = Object.values(facts).join(' ');
  const options = new Set<string>([baseline.suggestion]);

  try {
    const service = getAiService();
    const { text } = await service.generateText(
      `Seller facts (do not add anything else):\n${Object.entries(facts).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\nWrite ONE marketplace listing title under 80 characters using ONLY these facts.`,
      { feature: 'listing.title', userId: input.userId, maxResponseChars: 160 },
      'You write concise marketplace titles for QAVLIO. Use only the supplied facts. Never add condition, warranty, storage, accessories, or specifications that were not given. Reply with the title only.',
    );
    const cleaned = stripUnsupportedClaims(sanitizeUserText(text, 120).replace(/^["'`]+|["'`]+$/g, '').split('\n')[0] || '', sourceText).slice(0, 100);
    if (cleaned && cleaned.length >= 8) options.add(cleaned);
  } catch { /* deterministic suggestion still stands */ }

  const suggestions = [...options].filter(Boolean).slice(0, 3);
  return {
    action: 'title',
    suggestion: suggestions[0] || baseline.suggestion,
    suggestions,
    original: input.title || '',
    label: 'AI suggestion',
    note: 'AI suggestion — review and apply it yourself. No specifications were added.',
    invented: false,
    requiresApproval: true,
  };
}

/* ---------------------------------------------------------- AI description */

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

export async function generateDescription(input: { title?: string; description?: string; category?: string; attributes?: Record<string, unknown>; condition?: string; location?: string; price?: string | number; userId?: string | null }) {
  const facts = factsFrom(input);
  const baseline = improveDescription(facts);
  const sourceText = Object.values(facts).join(' ');
  let suggestion = baseline.suggestion;
  let aiDrafted = false;

  try {
    const service = getAiService();
    const { text } = await service.generateText(
      `Seller facts (the ONLY information you may use):\n${Object.entries(facts).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\nWrite a structured listing description with short sections for Condition, Features, Included items, Usage and Location — but ONLY include a section when the seller supplied that information. Omit any section you have no facts for.`,
      { feature: 'listing.description', userId: input.userId, maxResponseChars: 1600 },
      'You write honest QAVLIO marketplace descriptions. Use ONLY the supplied facts. Never invent warranty, accessories, specifications, ownership history, or condition. Do not add marketing superlatives. Plain text only.',
    );
    const cleaned = stripUnsupportedClaims(sanitizeUserText(text, 1600), sourceText);
    if (cleaned && cleaned.length > 40) { suggestion = cleaned; aiDrafted = true; }
  } catch { /* deterministic draft still stands */ }

  return {
    action: 'description',
    suggestion,
    original: input.description || '',
    missing: baseline.missing,
    questions: baseline.questions,
    label: aiDrafted ? 'AI-generated draft' : 'AI suggestion',
    note: 'AI-generated draft built only from what you entered. Warranty, accessories and specifications were not invented.',
    invented: false,
    requiresApproval: true,
  };
}

/* ------------------------------------------------------------- AI category */

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

/** Category suggestion with a readable breadcrumb path and confidence. */
export async function suggestCategoryPath(input: { title?: string; description?: string; attributes?: Record<string, unknown>; userId?: string | null }) {
  const text = `${input.title || ''} ${input.description || ''} ${Object.values(input.attributes || {}).join(' ')}`.toLowerCase();
  const keywordMatch = CATEGORY_KEYWORDS.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  const base = suggestCategory(text);

  let categorySlug = keywordMatch?.category || base.category.slug;
  let subcategorySlug = keywordMatch?.subcategory || base.subcategory?.slug || null;
  let confidence = keywordMatch ? 0.85 : base.category.slug === 'other' ? 0.3 : 0.6;

  // Optional model classification, constrained to real QAVLIO category slugs.
  if (!keywordMatch && text.trim().length > 6) {
    try {
      const service = getAiService();
      const slugs = DEFAULT_CATEGORIES.map((item) => item.slug);
      const { classification } = await service.classify(text, slugs, { feature: 'listing.category', userId: input.userId });
      if (classification.label && slugs.includes(classification.label) && classification.confidence >= 0.4) {
        categorySlug = classification.label;
        subcategorySlug = null;
        confidence = Math.min(0.8, classification.confidence);
      }
    } catch { /* deterministic suggestion still stands */ }
  }

  const category = DEFAULT_CATEGORIES.find((item) => item.slug === categorySlug) || DEFAULT_CATEGORIES.find((item) => item.slug === 'other')!;
  const subcategoryName = subcategorySlug ? (SUBCATEGORIES[categorySlug] || []).find((name) => slugify(name) === subcategorySlug) : undefined;

  return {
    action: 'category',
    category: { name: category.name, slug: category.slug },
    subcategory: subcategoryName ? { name: subcategoryName, slug: slugify(subcategoryName) } : null,
    path: ['Marketplace', category.name, subcategoryName].filter(Boolean),
    confidence: Number(confidence.toFixed(2)),
    alternatives: DEFAULT_CATEGORIES.filter((item) => item.slug !== category.slug).slice(0, 4).map((item) => ({ name: item.name, slug: item.slug })),
    confirmRequired: true,
    label: 'AI suggestion',
    note: 'AI suggestion — you can change this. The category is never saved without your confirmation.',
    requiresApproval: true,
  };
}

/* ----------------------------------------------------------- AI attributes */

/**
 * Attribute extraction, restricted to QAVLIO's own attribute vocabulary.
 * Anything the model proposes outside the allow-list for the chosen category is discarded.
 */
export async function extractListingAttributes(input: { title?: string; description?: string; category?: string; existing?: Record<string, unknown>; userId?: string | null }) {
  const text = sanitizeUserText(`${input.title || ''}\n${input.description || ''}`, 2000);
  const allowed = [...allowedAttributeKeys(input.category)].filter((key) => key !== 'listingType');
  const service = getAiService();

  let extracted: Record<string, string | number | boolean> = {};
  try {
    const result = await service.extractAttributes(text, allowed, { feature: 'listing.attributes', userId: input.userId });
    extracted = result.attributes;
  } catch { extracted = {}; }

  const allowedSet = new Set(allowed);
  const lowerText = text.toLowerCase();
  const suggestions = Object.entries(extracted)
    .filter(([key]) => allowedSet.has(key))
    .map(([key, value]) => {
      const stringValue = String(value);
      // Grounding check: the value must be traceable to the seller's own words.
      const grounded = lowerText.includes(stringValue.toLowerCase())
        || lowerText.replace(/\s+/g, '').includes(stringValue.toLowerCase().replace(/\s+/g, ''))
        || (ATTRIBUTE_VALUE_HINTS[key] || []).some((hint) => hint.toLowerCase() === stringValue.toLowerCase() && lowerText.includes(hint.toLowerCase()));
      return {
        key,
        label: label(key),
        value,
        grounded,
        alreadySet: input.existing?.[key] !== undefined && input.existing?.[key] !== '',
        source: 'Read from your title and description',
      };
    })
    .filter((item) => item.grounded)
    .slice(0, 12);

  const expectedKeys = CATEGORY_ATTRIBUTE_KEYS[input.category || ''] || [];
  const missing = expectedKeys.filter((key) => !suggestions.some((item) => item.key === key) && !(input.existing?.[key]));

  return {
    action: 'attributes',
    attributes: suggestions,
    missing,
    label: 'AI suggestion',
    note: suggestions.length
      ? 'AI suggestion — confirm each attribute before it is saved. Only values found in your own text are shown.'
      : 'I could not read any attributes from your text. Add more detail, or enter attributes manually.',
    invented: false,
    requiresApproval: true,
  };
}

export function suggestTags(facts: Record<string, string>) {
  const source = Object.values(facts).join(' ');
  const words = source.split(/[^a-zA-Z0-9+]+/).filter((word) => word.length > 2 && word.length < 18);
  return [...new Set(words.map((word) => word.toLowerCase()))].slice(0, 8);
}

/* ---------------------------------------------------------- Price insights */

/**
 * Price insight from REAL QAVLIO listings only. When there is not enough
 * comparable inventory we say so instead of estimating a market value.
 */
export async function priceInsight(input: { category?: string; subcategory?: string; brand?: string; model?: string; condition?: string; location?: string; price?: number; title?: string }) {
  const MIN_COMPARABLES = 3;
  const query = [input.brand, input.model].filter(Boolean).join(' ') || undefined;
  const result = await searchListings({
    q: query,
    category: input.category,
    subcategory: input.subcategory,
    condition: input.condition ? [input.condition] : undefined,
    sort: 'recommended',
    page: 1,
    limit: 60,
  });

  let rows = result.listings;
  if (rows.length < MIN_COMPARABLES && input.category) {
    const wider = await searchListings({ category: input.category, sort: 'recommended', page: 1, limit: 60 });
    rows = wider.listings;
  }

  const prices = rows
    .map((item: any) => Number(item.price?.toString?.() ?? item.price ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (prices.length < MIN_COMPARABLES) {
    return {
      action: 'price-insight',
      available: false,
      sampleSize: prices.length,
      label: 'Based on QAVLIO listings',
      message: 'I don\'t have enough comparable QAVLIO listings to give a reliable price range yet.',
      note: 'QAVLIO does not estimate market value without real comparable listings.',
    };
  }

  const percentile = (fraction: number) => prices[Math.min(prices.length - 1, Math.max(0, Math.floor(prices.length * fraction)))];
  const low = percentile(0.25);
  const high = percentile(0.75);
  const median = percentile(0.5);
  const position = input.price ? (input.price < low ? 'below' : input.price > high ? 'above' : 'within') : null;

  return {
    action: 'price-insight',
    available: true,
    sampleSize: prices.length,
    currency: 'PKR',
    min: prices[0],
    max: prices[prices.length - 1],
    low,
    high,
    median,
    yourPrice: input.price ?? null,
    position,
    label: 'Based on QAVLIO listings',
    message: `Similar listings are commonly listed between Rs. ${low.toLocaleString('en-PK')} and Rs. ${high.toLocaleString('en-PK')}.`,
    positionMessage: position === 'below'
      ? 'Your price is below the common range for similar QAVLIO listings.'
      : position === 'above'
        ? 'Your price is above the common range for similar QAVLIO listings.'
        : position === 'within'
          ? 'Your price sits within the common range for similar QAVLIO listings.'
          : null,
    note: `Based on ${prices.length} comparable QAVLIO listings. This is not a valuation and does not guarantee a selling price.`,
  };
}

/* -------------------------------------------------------- Quality scoring */

/**
 * Seller-facing listing quality score. This measures listing *completeness*
 * only — it is explicitly NOT a trust, safety, or seller reputation score.
 */
export function listingQuality(input: { title?: string; description?: string; category?: string; subcategory?: string; images?: number; attributes?: Record<string, unknown>; price?: number; condition?: string; location?: { city?: string; area?: string } }) {
  const checks: Array<{ id: string; label: string; weight: number; earned: number; hint?: string }> = [];

  const title = String(input.title || '').trim();
  const titleWords = title.split(/\s+/).filter(Boolean).length;
  const titleScore = !title ? 0 : titleWords >= 6 && title.length >= 25 ? 20 : titleWords >= 4 ? 14 : 8;
  checks.push({ id: 'title', label: 'Title quality', weight: 20, earned: titleScore, hint: titleScore < 20 ? 'Improve the title — include brand, model and key specification.' : undefined });

  const description = String(input.description || '').trim();
  const descriptionScore = description.length >= 400 ? 25 : description.length >= 200 ? 20 : description.length >= 80 ? 12 : description.length ? 6 : 0;
  checks.push({ id: 'description', label: 'Description completeness', weight: 25, earned: descriptionScore, hint: descriptionScore < 20 ? 'Add more detail about condition, usage and what is included.' : undefined });

  const images = Number(input.images || 0);
  const imageScore = images >= 5 ? 25 : images >= 3 ? 20 : images >= 1 ? 10 : 0;
  checks.push({ id: 'images', label: 'Image availability', weight: 25, earned: imageScore, hint: images < 3 ? 'Add more photos — listings with 3 or more photos are easier to trust.' : undefined });

  const expected = CATEGORY_ATTRIBUTE_KEYS[input.category || ''] || [];
  const filled = expected.filter((key) => input.attributes?.[key] !== undefined && input.attributes?.[key] !== '');
  const attributeScore = !expected.length ? 15 : Math.round((filled.length / expected.length) * 20);
  const missingAttributes = expected.filter((key) => !filled.includes(key));
  checks.push({ id: 'attributes', label: 'Attribute completeness', weight: 20, earned: attributeScore, hint: missingAttributes.length ? `Add missing attributes: ${missingAttributes.slice(0, 4).map(label).join(', ')}.` : undefined });

  const categoryScore = input.category ? (input.subcategory ? 10 : 7) : 0;
  checks.push({ id: 'category', label: 'Category accuracy', weight: 10, earned: categoryScore, hint: !input.category ? 'Choose a category.' : !input.subcategory ? 'Choose a subcategory so buyers can filter to your listing.' : undefined });

  const total = checks.reduce((sum, check) => sum + check.earned, 0);
  const max = checks.reduce((sum, check) => sum + check.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round((total / max) * 100)));

  const improvements = [
    ...checks.filter((check) => check.hint).map((check) => check.hint as string),
    !input.condition ? 'Specify the condition.' : '',
    input.price === undefined || input.price === null ? 'Add a price in PKR.' : '',
    !input.location?.city ? 'Add a city so nearby buyers can find it.' : '',
  ].filter(Boolean);

  return {
    action: 'quality',
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Incomplete',
    breakdown: checks.map((check) => ({ id: check.id, label: check.label, earned: check.earned, weight: check.weight })),
    improvements,
    disclaimer: 'This measures listing completeness only. It is not a trust score and does not verify the seller or the item.',
  };
}

/* ------------------------------------------------------------ orchestrator */

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
  const insight = await priceInsight({
    category: record.categorySlug,
    subcategory: record.subcategorySlug,
    condition: record.condition,
    price: Number(record.price?.toString?.() ?? record.price ?? 0),
  });
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
    priceInsight: insight.available
      ? { source: `Based on ${insight.sampleSize} QAVLIO listings`, min: insight.low, max: insight.high, count: insight.sampleSize, message: insight.message }
      : { source: insight.message, count: insight.sampleSize },
  };
}

/**
 * Side-by-side comparison of REAL listings. Attributes that a listing does not
 * declare are shown as "Not listed" — never filled in by the model.
 */
export async function compareListings(ids: string[], options: { maxItems?: number } = {}) {
  const maxItems = Math.max(2, Math.min(options.maxItems || 4, 4));
  const unique = [...new Set(ids)].slice(0, maxItems);
  if (unique.length < 2) throw new AppError(422, `Select 2 to ${maxItems} listings to compare`, 'COMPARE_INVALID');
  const records = (await Promise.all(unique.map((id) => findListingByPublicKey(id).catch(() => null)))).filter(Boolean);
  if (records.length < 2) throw new AppError(404, 'I couldn\'t find enough matching listings to compare.', 'COMPARE_NOT_FOUND');

  const rows = records.map((record: any) => compactListingForModel(record)).filter(Boolean) as any[];

  // Only compare attributes that at least one real listing actually declares.
  const attributeKeys = [...new Set(rows.flatMap((row) => Object.keys(row.attributes || {})))].slice(0, 10);
  const fields = [
    { field: 'price', label: 'Price' },
    { field: 'condition', label: 'Condition' },
    { field: 'city', label: 'Location' },
    { field: 'category', label: 'Category' },
    ...attributeKeys.map((key) => ({ field: `attributes.${key}`, label: label(key) })),
  ];

  const valueFor = (row: any, field: string) => {
    if (field === 'city') return [row.area, row.city].filter(Boolean).join(', ') || 'Not listed';
    if (field.startsWith('attributes.')) {
      const value = row.attributes?.[field.slice('attributes.'.length)];
      return value === undefined || value === null || value === '' ? 'Not listed' : String(value);
    }
    const value = row[field];
    return value === undefined || value === null || value === '' ? 'Not listed' : String(value);
  };

  const comparison = fields.map((entry) => ({ field: entry.field, label: entry.label, values: rows.map((row) => valueFor(row, entry.field)) }));

  // Evidence-backed observations only — computed from the data, not generated prose.
  const prices = rows.map((row) => Number(row.price || 0));
  const observations: string[] = [];
  if (prices.every((price) => price > 0) && new Set(prices).size > 1) {
    const cheapestIndex = prices.indexOf(Math.min(...prices));
    observations.push(`${rows[cheapestIndex].title} is the lowest priced at Rs. ${prices[cheapestIndex].toLocaleString('en-PK')}.`);
  }
  for (const key of ['ram', 'storage']) {
    const values = rows.map((row) => parseNumericSpec(row.attributes?.[key]));
    if (values.every((value) => value !== null) && new Set(values).size > 1) {
      const bestIndex = values.indexOf(Math.max(...(values as number[])));
      observations.push(`${rows[bestIndex].title} lists the most ${label(key)} (${rows[bestIndex].attributes[key]}).`);
    }
  }
  const cities = rows.map((row) => row.city).filter(Boolean);
  if (new Set(cities).size > 1) observations.push(`These listings are in different cities: ${[...new Set(cities)].join(', ')}.`);

  return {
    listings: rows,
    comparison,
    observations,
    completeness: rows.map((row: any) => ({
      publicId: row.publicId,
      listedFields: Object.values(row).filter((value) => value !== undefined && value !== null && value !== '').length,
    })),
    maxItems,
    note: 'Missing specifications are shown as “Not listed”. I will not invent them.',
    source: `According to ${rows.length} QAVLIO listings.`,
  };
}

function parseNumericSpec(value: unknown) {
  if (value === undefined || value === null) return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || '').toLowerCase();
  if (!Number.isFinite(amount)) return null;
  return unit === 'tb' ? amount * 1024 : unit === 'mb' ? amount / 1024 : amount;
}

function factsFrom(input: { title?: string; description?: string; category?: string; condition?: string; location?: string; price?: string | number; attributes?: Record<string, unknown> }) {
  const facts: Record<string, string> = {};
  const put = (key: string, value: unknown) => { if (value !== undefined && value !== null && String(value).trim()) facts[key] = sanitizeUserText(String(value), 600); };
  put('title', input.title);
  put('description', input.description);
  put('category', input.category);
  put('condition', input.condition);
  put('location', input.location);
  put('price', input.price);
  Object.entries(input.attributes || {}).forEach(([key, value]) => put(key, value));
  return facts;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
function label(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
