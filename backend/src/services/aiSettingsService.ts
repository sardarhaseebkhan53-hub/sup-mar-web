import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AISettings } from '../models/AISettings.js';
import { AppError } from '../utils/AppError.js';

type FeatureKey = 'assistant' | 'search' | 'recommendations' | 'listingAssistant' | 'support';

const defaults = () => ({
  enabled: true,
  provider: env.ai.provider,
  model: env.ai.model,
  requestLimitPerMinute: env.ai.perMinute,
  requestLimitPerDay: env.ai.perDay,
  features: { assistant: true, search: true, recommendations: true, listingAssistant: true, support: true },
});

let memory = defaults();

export function publicAiConfig(settings = memory) {
  return {
    enabled: Boolean(settings.enabled),
    features: { ...settings.features },
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
        features: { ...defaults().features, ...(record.features || {}) },
        updatedAt: record.updatedAt || null,
      };
    }
  }
  return { ...memory, updatedAt: null };
}

export async function updateAiSettings(adminId: string, patch: any) {
  const current = await getAiSettings();
  const next = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
    provider: ['heuristic', 'openai', 'gemini'].includes(patch.provider) ? patch.provider : current.provider,
    model: typeof patch.model === 'string' ? patch.model.slice(0, 80) : current.model,
    requestLimitPerMinute: Number.isFinite(patch.requestLimitPerMinute) ? Math.min(120, Math.max(1, Number(patch.requestLimitPerMinute))) : current.requestLimitPerMinute,
    requestLimitPerDay: Number.isFinite(patch.requestLimitPerDay) ? Math.min(5000, Math.max(1, Number(patch.requestLimitPerDay))) : current.requestLimitPerDay,
    features: { ...current.features, ...(patch.features && typeof patch.features === 'object' ? Object.fromEntries(Object.entries(patch.features).filter(([key, value]) => ['assistant', 'search', 'recommendations', 'listingAssistant', 'support'].includes(key) && typeof value === 'boolean')) : {}) },
    updatedBy: adminId,
  };
  if (mongoose.connection.readyState === 1) {
    await AISettings.findOneAndUpdate({ key: 'ai' }, { $set: { key: 'ai', ...next } }, { upsert: true });
  } else memory = { ...next };
  return getAiSettings();
}

export async function assertAiEnabled(feature?: FeatureKey) {
  const settings = await getAiSettings();
  if (!settings.enabled) throw new AppError(503, 'QAVLIO AI is temporarily unavailable.', 'AI_DISABLED');
  if (feature && settings.features[feature] === false) throw new AppError(503, 'This QAVLIO AI feature is currently disabled.', 'AI_FEATURE_DISABLED');
  return settings;
}

export function __resetAiSettingsMemory() { memory = defaults(); }
