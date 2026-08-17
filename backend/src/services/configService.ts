import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { PlatformSetting } from '../models/PlatformSetting.js';

const defaultPublicConfig = Object.freeze({
  brand: { name: 'QAVLIO', tagline: 'Buy. Sell. Discover.' },
  locale: { defaultLanguage: 'en', supportedLanguages: ['en', 'ur'], defaultCurrency: 'PKR', country: 'PK' },
  listingPolicy: {
    freeListingLimit: env.commerce.freeListingLimit,
    additionalListingFee: { amount: env.commerce.additionalListingFee, currency: env.commerce.currency },
    defaultDurationDays: null,
    categoryPricingEnabled: true,
  },
  features: { chat: false, phoneOtp: false, payments: false, aiAssistant: false, promotions: false },
});

export async function getPublicConfig() {
  if (mongoose.connection.readyState !== 1) return defaultPublicConfig;
  const records = await PlatformSetting.find({ scope: 'public' }).select('key value -_id').lean();
  return records.reduce((config, record) => ({ ...config, [record.key]: record.value }), { ...defaultPublicConfig });
}
