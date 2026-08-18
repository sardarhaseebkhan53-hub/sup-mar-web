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
  features: { chat: true, phoneOtp: true, payments: true, aiAssistant: false, promotions: true },
});

export async function getPublicConfig() {
  const listingPolicy=await publicCommerceConfig();
  if (mongoose.connection.readyState !== 1) return { ...defaultPublicConfig, listingPolicy };
  const records = await PlatformSetting.find({ scope: 'public' }).select('key value -_id').lean();
  return records.reduce((config, record) => ({ ...config, [record.key]: record.value }), { ...defaultPublicConfig, listingPolicy });
}
