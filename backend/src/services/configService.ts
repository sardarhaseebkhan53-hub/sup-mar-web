import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { publicCommerceConfig } from './marketplaceSettingsService.js';

const defaultPublicConfig = Object.freeze({
  brand: { name: 'QAVLIO', tagline: 'Buy. Sell. Discover.' },
  locale: { defaultLanguage: 'en', supportedLanguages: ['en', 'ur'], defaultCurrency: 'PKR', country: 'PK' },
  listingPolicy: {
    freeListingLimit: env.commerce.freeListingLimit,
    additionalListingFee: { amount: env.commerce.additionalListingFee, currency: env.commerce.currency },
    defaultDurationDays: null,
    categoryPricingEnabled: true,
  },
  features: { chat: true, phoneOtp: true, payments: true, aiAssistant: true, promotions: true },
});

export async function getPublicConfig() {
  const listingPolicy=await publicCommerceConfig();
  const { getAiSettings, publicAiConfig } = await import('./aiSettingsService.js');
  const ai = publicAiConfig(await getAiSettings());
  const base = { ...defaultPublicConfig, listingPolicy, ai, features: { ...defaultPublicConfig.features, aiAssistant: ai.enabled && ai.features.assistant } };
  if (mongoose.connection.readyState !== 1) return base;
  const records = await PlatformSetting.find({ scope: 'public' }).select('key value -_id').lean();
  return records.reduce((config, record) => ({ ...config, [record.key]: record.value }), base);
}
