import mongoose from 'mongoose';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { getMarketplaceSettings, updateMonetizationSettings } from './marketplaceSettingsService.js';
import { AppError } from '../utils/AppError.js';
import { logAdminActivity } from './adminActivityService.js';

const memory = new Map<string, any>();
const definitions: any = {
  marketplaceName: { category: 'general', type: 'string', description: 'Public marketplace name', maxLength: 60 },
  supportEmail: { category: 'general', type: 'string', description: 'Public support email address', maxLength: 160 },
  logoUrl: { category: 'general', type: 'string', description: 'Public logo URL (leave empty for bundled brand)', maxLength: 500 },
  faviconUrl: { category: 'general', type: 'string', description: 'Public favicon URL (leave empty for bundled icon)', maxLength: 500 },
  defaultLanguage: { category: 'general', type: 'string', description: 'Default marketplace language', options: ['en','ur'] },
  currency: { category: 'general', type: 'string', description: 'Marketplace currency', options: ['PKR'] },
  freeListingLimit: { category: 'marketplace', type: 'number', description: 'Number of listings published without a fee', min: 0, max: 100 },
  additionalListingFee: { category: 'payments', type: 'number', description: 'Fee for additional listings in PKR', min: 0, max: 100000 },
  maximumImages: { category: 'listings', type: 'number', description: 'Maximum images per listing', min: 1, max: 30 },
  listingExpirationDays: { category: 'listings', type: 'number', description: 'Default listing expiration in days', min: 1, max: 365 },
  searchResultLimit: { category: 'marketplace', type: 'number', description: 'Default search results per page', min: 12, max: 100 },
  sellerVerificationRequired: { category: 'trust', type: 'boolean', description: 'Require seller verification for protected actions' },
  reviewModeration: { category: 'trust', type: 'boolean', description: 'Review new ratings before publication' },
  dailyRewardLimit: { category: 'advertisements', type: 'number', description: 'Daily pending reward claim limit', min: 0, max: 100 },
  promotionEnabled: { category: 'promotions', type: 'boolean', description: 'Allow paid listing promotions' },
  announcementEnabled: { category: 'notifications', type: 'boolean', description: 'Allow active marketplace announcements' },
  moderationRequired: { category: 'moderation', type: 'boolean', description: 'Send new listings to moderation' },
  messageNotifications: { category: 'notifications', type: 'boolean', description: 'Enable message notifications' },
  sessionSecurityEnabled: { category: 'security', type: 'boolean', description: 'Enforce active session validation' },
  seoTitleTemplate: { category: 'seo', type: 'string', description: 'Default SEO title template', maxLength: 100 },
  seoDefaultDescription: { category: 'seo', type: 'string', description: 'Default marketplace meta description', maxLength: 170 },
};
const defaults: any = { marketplaceName: 'QAVLIO', supportEmail: 'hello@qavlio.pk', logoUrl: '', faviconUrl: '', defaultLanguage: 'en', currency: 'PKR', maximumImages: 12, listingExpirationDays: 30, searchResultLimit: 24, sellerVerificationRequired: false, reviewModeration: false, dailyRewardLimit: 3, announcementEnabled: true, moderationRequired: false, messageNotifications: true, sessionSecurityEnabled: true, seoTitleTemplate: '%s | QAVLIO', seoDefaultDescription: 'Buy, sell and discover trusted local listings on QAVLIO.' };

export async function adminSettings() {
  const marketplace: any = await getMarketplaceSettings(); const stored: any[] = mongoose.connection.readyState === 1 ? await PlatformSetting.find({ key: { $in: Object.keys(definitions) } }).lean() : [...memory.values()];
  const values: any = { ...defaults, freeListingLimit: marketplace.freeListingLimit, additionalListingFee: marketplace.additionalListingFee, promotionEnabled: marketplace.promotionEnabled, currency: marketplace.currency };
  for (const item of stored) values[item.key] = item.value;
  return Object.entries(definitions).map(([key, definition]: any) => ({ key, value: values[key], ...definition, updatedAt: stored.find((item) => item.key === key)?.updatedAt || null }));
}

export async function publicPlatformSettings() {
  const keys = ['marketplaceName','supportEmail','logoUrl','faviconUrl','defaultLanguage','currency','seoTitleTemplate','seoDefaultDescription'];
  const rows: any[] = mongoose.connection.readyState === 1 ? await PlatformSetting.find({ key: { $in: keys } }).select('key value').lean() : [...memory.values()].filter((item) => keys.includes(item.key));
  return Object.fromEntries(keys.map((key) => [key, rows.find((item) => item.key === key)?.value ?? defaults[key]]));
}

export async function updateAdminSetting(adminId: string, key: string, value: any, req: any) {
  const definition = definitions[key]; if (!definition) throw new AppError(404, 'Setting not found', 'SETTING_NOT_FOUND');
  if (['payments','security'].includes(definition.category) && !req.auth?.roles?.includes('super_admin')) throw new AppError(403, 'Only a super administrator can change this setting', 'SUPER_ADMIN_REQUIRED');
  if (definition.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value < definition.min || value > definition.max)) throw new AppError(422, `Value must be between ${definition.min} and ${definition.max}`, 'SETTING_VALUE_INVALID');
  if (definition.type === 'boolean' && typeof value !== 'boolean') throw new AppError(422, 'Value must be true or false', 'SETTING_VALUE_INVALID');
  if (definition.type === 'string' && (typeof value !== 'string' || value.length > (definition.maxLength || 200) || (definition.options && !definition.options.includes(value)))) throw new AppError(422, 'Choose a valid setting value', 'SETTING_VALUE_INVALID');
  if (key === 'supportEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AppError(422, 'Enter a valid support email', 'SETTING_VALUE_INVALID');
  if (['logoUrl','faviconUrl'].includes(key) && value && !/^https:\/\//i.test(value)) throw new AppError(422, 'Brand asset URLs must use HTTPS', 'SETTING_VALUE_INVALID');
  if (['freeListingLimit','additionalListingFee','promotionEnabled','currency'].includes(key)) await updateMonetizationSettings({ [key]: value });
  const record = { key, value, type: definition.type, category: definition.category, description: definition.description, updatedBy: adminId, updatedAt: new Date() };
  if (mongoose.connection.readyState === 1) await PlatformSetting.findOneAndUpdate({ key }, { $set: record, $inc: { version: 1 } }, { upsert: true }); else memory.set(key, record);
  await logAdminActivity(adminId, 'ADMIN_UPDATED_SETTING', 'setting', key, { value }, req); return record;
}
