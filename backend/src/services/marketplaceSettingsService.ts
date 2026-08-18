import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { MarketplaceSettings } from '../models/MarketplaceSettings.js';
import { AppError } from '../utils/AppError.js';

export const DEFAULT_PROMOTION_PRODUCTS = [
  { key: 'basic-boost-7d', name: 'Basic Boost', description: 'Extra visibility in relevant browsing.', type: 'BOOST', placement: 'boost', durationHours: 168, price: 299, currency: 'PKR', priority: 10, creditCost: 1, allowsStacking: false, isActive: true, order: 1 },
  { key: 'featured-7d', name: 'Featured', description: 'Featured placement with a clear label.', type: 'FEATURED', placement: 'featured', durationHours: 168, price: 499, currency: 'PKR', priority: 25, creditCost: 1, allowsStacking: false, isActive: true, order: 2 },
  { key: 'top-search-7d', name: 'Top of Search', description: 'A measured boost within relevant search results.', type: 'TOP_SEARCH', placement: 'search', durationHours: 168, price: 599, currency: 'PKR', priority: 35, creditCost: 2, allowsStacking: false, isActive: true, order: 3 },
  { key: 'homepage-7d', name: 'Homepage', description: 'Sponsored homepage placement.', type: 'HOMEPAGE', placement: 'homepage', durationHours: 168, price: 799, currency: 'PKR', priority: 50, creditCost: 2, allowsStacking: false, isActive: true, order: 4 },
  { key: 'category-7d', name: 'Category Spotlight', description: 'Featured inside the listing category.', type: 'CATEGORY', placement: 'category', durationHours: 168, price: 449, currency: 'PKR', priority: 30, creditCost: 1, allowsStacking: false, isActive: true, order: 5 },
  { key: 'urgent-7d', name: 'Urgent', description: 'Professional urgent badge for seven days.', type: 'URGENT', placement: 'urgent', durationHours: 168, price: 349, currency: 'PKR', priority: 5, creditCost: 1, allowsStacking: false, isActive: true, order: 6 },
];

const defaults = {
  freeListingLimit: env.commerce.freeListingLimit,
  additionalListingFee: Number(env.commerce.additionalListingFee),
  currency: env.commerce.currency,
  taxRate: 0,
  discountAmount: 0,
  platformFee: 0,
  paymentProcessingFee: 0,
  promotionEnabled: true,
  minPromotionDurationHours: 24,
  maxPromotionDurationHours: 720,
  promotionProducts: DEFAULT_PROMOTION_PRODUCTS.map((item) => ({ ...item, currency: env.commerce.currency })),
};
let memorySettings: any = structuredClone(defaults);
const number = (value: any) => Number(value?.toString?.() ?? value ?? 0);

function present(record: any) {
  return {
    freeListingLimit: record.freeListingLimit,
    additionalListingFee: number(record.additionalListingFee),
    currency: record.currency,
    taxRate: record.taxRate || 0,
    discountAmount: number(record.discountAmount),
    platformFee: number(record.platformFee),
    paymentProcessingFee: number(record.paymentProcessingFee),
    promotionEnabled: Boolean(record.promotionEnabled),
    minPromotionDurationHours: record.minPromotionDurationHours || 24,
    maxPromotionDurationHours: record.maxPromotionDurationHours || 720,
    promotionProducts: (record.promotionProducts || []).map((item: any) => ({
      key: item.key, name: item.name, description: item.description || '', type: item.type, placement: item.placement,
      durationHours: item.durationHours, price: number(item.price), currency: item.currency || record.currency,
      priority: item.priority || 0, creditCost: item.creditCost || 1, allowsStacking: Boolean(item.allowsStacking),
      isActive: item.isActive !== false, order: item.order || 0,
    })).sort((a: any, b: any) => a.order - b.order),
  };
}

export async function getMarketplaceSettings(includeInactive = false) {
  let result: any;
  if (mongoose.connection.readyState !== 1) result = structuredClone(memorySettings);
  else {
    const record: any = await MarketplaceSettings.findOne({ key: 'marketplace' }).lean();
    result = record ? present(record) : structuredClone(defaults);
  }
  if (!includeInactive) result.promotionProducts = result.promotionProducts.filter((item: any) => item.isActive);
  return result;
}

export function __setMemoryMarketplaceSetting(key: string, value: any) { memorySettings = { ...memorySettings, [key]: value }; }
export function __resetMemoryMarketplaceSettings() { memorySettings = structuredClone(defaults); }

export async function updateMonetizationSettings(input: any) {
  const current = await getMarketplaceSettings(true);
  const next = { ...current, ...input };
  if (!['PKR'].includes(next.currency)) throw new AppError(422, 'Only configured marketplace currencies are allowed', 'CURRENCY_INVALID');
  if (next.minPromotionDurationHours > next.maxPromotionDurationHours) throw new AppError(422, 'Minimum duration cannot exceed maximum duration', 'PROMOTION_DURATION_INVALID');
  for (const product of next.promotionProducts || []) {
    if (product.currency !== next.currency || product.durationHours < next.minPromotionDurationHours || product.durationHours > next.maxPromotionDurationHours) throw new AppError(422, 'Promotion price, currency, or duration is invalid', 'PROMOTION_PRODUCT_INVALID');
  }
  if (mongoose.connection.readyState !== 1) { memorySettings = structuredClone(next); return getMarketplaceSettings(true); }
  await MarketplaceSettings.findOneAndUpdate({ key: 'marketplace' }, { $set: next, $setOnInsert: { key: 'marketplace' } }, { upsert: true, runValidators: true });
  return getMarketplaceSettings(true);
}

export async function publicCommerceConfig() {
  const settings = await getMarketplaceSettings();
  return {
    freeListingLimit: settings.freeListingLimit,
    additionalListingFee: { amount: String(settings.additionalListingFee), currency: settings.currency },
    currency: settings.currency,
    promotionEnabled: settings.promotionEnabled,
    promotionProducts: settings.promotionProducts.map(({ key, name, description, type, placement, durationHours, price, currency, priority, creditCost }: any) => ({ key, name, description, type, placement, durationHours, price, currency, priority, creditCost })),
  };
}
