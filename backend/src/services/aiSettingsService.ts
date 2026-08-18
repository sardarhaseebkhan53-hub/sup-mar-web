import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AISettings } from '../models/AISettings.js';
import { AppError } from '../utils/AppError.js';

export type FeatureKey =
  | 'assistant'
  | 'search'
  | 'recommendations'
  | 'listingAssistant'
  | 'support'
  | 'moderation'
  | 'priceInsights'
  | 'semanticSearch';

export const FEATURE_KEYS: FeatureKey[] = ['assistant', 'search', 'recommendations', 'listingAssistant', 'support', 'moderation', 'priceInsights', 'semanticSearch'];

/** Models an administrator is allowed to select. Users can never choose a model. */
export const ALLOWED_MODELS: Record<string, string[]> = {
  heuristic: [''],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
};

const defaults = () => ({
  enabled: true,
  provider: env.ai.provider,
  model: env.ai.model,
  requestLimitPerMinute: env.ai.perMinute,
  requestLimitPerDay: env.ai.perDay,
  maxResponseChars: env.ai.maxResponseChars,
  features: { assistant: true, search: true, recommendations: true, listingAssistant: true, support: true, moderation: true, priceInsights: true, semanticSearch: env.ai.embeddingsEnabled },
});

let memory = defaults();

export function publicAiConfig(settings: any = memory) {
  return {
    enabled: Boolean(settings.enabled),
    features: { ...defaults().features, ...settings.features },
    providerConfigured: Boolean(env.ai.apiKey) && settings.provider !== 'heuristic',
  };
}

export async function getAiSettings() {
  if (mongoose.connection.readyState === 1) {
    const record: any = await AISettings.findOne({ key: 'ai' }).lean();
    if (record) {
      return {
        enabled: record.enabled !== false,
        provider: record.provider || env.ai.provider,
        model: record.model || env.ai.model,
        requestLimitPerMinute: record.requestLimitPerMinute || env.ai.perMinute,
        requestLimitPerDay: record.requestLimitPerDay || env.ai.perDay,
        maxResponseChars: record.maxResponseChars || env.ai.maxResponseChars,
        features: { ...defaults().features, ...(record.features || {}) },
        updatedAt: record.updatedAt || null,
      };
    }
  }
  return { ...memory, updatedAt: null };
}

export async function updateAiSettings(adminId: string, patch: any) {
  const current = await getAiSettings();
  const provider = ['heuristic', 'openai', 'gemini'].includes(patch.provider) ? patch.provider : current.provider;
  // Cost control: reject arbitrary/expensive models that are not on the allow-list.
  const requestedModel = typeof patch.model === 'string' ? patch.model.trim().slice(0, 80) : undefined;
  const allowed = ALLOWED_MODELS[provider] || [''];
  const model = requestedModel === undefined
    ? (allowed.includes(current.model) ? current.model : allowed[0])
    : allowed.includes(requestedModel) ? requestedModel : allowed[0];

  const next = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
    provider,
    model,
    requestLimitPerMinute: Number.isFinite(Number(patch.requestLimitPerMinute)) && patch.requestLimitPerMinute !== undefined ? Math.min(120, Math.max(1, Number(patch.requestLimitPerMinute))) : current.requestLimitPerMinute,
    requestLimitPerDay: Number.isFinite(Number(patch.requestLimitPerDay)) && patch.requestLimitPerDay !== undefined ? Math.min(5000, Math.max(1, Number(patch.requestLimitPerDay))) : current.requestLimitPerDay,
    maxResponseChars: Number.isFinite(Number(patch.maxResponseChars)) && patch.maxResponseChars !== undefined ? Math.min(20000, Math.max(200, Number(patch.maxResponseChars))) : current.maxResponseChars,
    features: {
      ...current.features,
      ...(patch.features && typeof patch.features === 'object'
        ? Object.fromEntries(Object.entries(patch.features).filter(([key, value]) => (FEATURE_KEYS as string[]).includes(key) && typeof value === 'boolean'))
        : {}),
    },
    updatedBy: adminId,
  };
  if (mongoose.connection.readyState === 1) {
    await AISettings.findOneAndUpdate({ key: 'ai' }, { $set: { key: 'ai', ...next } }, { upsert: true });
  } else memory = { ...next } as any;
  return getAiSettings();
}

export async function assertAiEnabled(feature?: FeatureKey) {
  const settings = await getAiSettings();
  if (!settings.enabled) throw new AppError(503, 'QAVLIO AI is temporarily unavailable.', 'AI_DISABLED');
  if (feature && (settings.features as any)[feature] === false) throw new AppError(503, 'This QAVLIO AI feature is currently disabled.', 'AI_FEATURE_DISABLED');
  return settings;
}

/** Non-throwing check used where AI is an enhancement, not a requirement. */
export async function isFeatureEnabled(feature: FeatureKey) {
  const settings = await getAiSettings();
  return Boolean(settings.enabled) && (settings.features as any)[feature] !== false;
}

export function __resetAiSettingsMemory() { memory = defaults(); }
