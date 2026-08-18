import mongoose from 'mongoose';
import { AIEvent } from '../models/AIEvent.js';

const memory: any[] = [];

export type AiEventInput = {
  userId?: string | null;
  feature?: string;
  durationMs?: number;
  success?: boolean;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  cached?: boolean;
  meta?: Record<string, unknown>;
};

/** Usage tracking (§49): metrics only — never the prompt text. */
export async function recordAiEvent(type: string, input: AiEventInput = {}) {
  const event = {
    type,
    feature: input.feature || 'other',
    userId: input.userId || null,
    durationMs: input.durationMs || 0,
    success: input.success !== false,
    provider: input.provider,
    model: input.model,
    tokensIn: Number.isFinite(input.tokensIn) ? input.tokensIn : undefined,
    tokensOut: Number.isFinite(input.tokensOut) ? input.tokensOut : undefined,
    costUsd: Number.isFinite(input.costUsd) ? input.costUsd : undefined,
    cached: Boolean(input.cached),
    meta: input.meta || {},
    createdAt: new Date(),
  };
  if (mongoose.connection.readyState === 1) {
    await AIEvent.create(event).catch(() => undefined);
    return;
  }
  memory.push(event);
  if (memory.length > 2000) memory.splice(0, memory.length - 2000);
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[index]);
}

export async function aiAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const rows: any[] = mongoose.connection.readyState === 1
    ? await AIEvent.find({ createdAt: { $gte: since } }).select('type feature success durationMs provider model tokensIn tokensOut costUsd cached createdAt').lean()
    : memory.filter((item) => item.createdAt >= since);
  const of = (type: string) => rows.filter((item) => item.type === type);
  const durations = rows.map((item) => item.durationMs || 0).filter((value) => value > 0).sort((a, b) => a - b);

  const featureCounts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.feature || 'other';
    featureCounts[key] = (featureCounts[key] || 0) + 1;
  }
  const providerCounts: Record<string, number> = {};
  for (const row of rows) {
    if (row.provider) providerCounts[row.provider] = (providerCounts[row.provider] || 0) + 1;
  }
  const tokensIn = rows.reduce((sum, row) => sum + (row.tokensIn || 0), 0);
  const tokensOut = rows.reduce((sum, row) => sum + (row.tokensOut || 0), 0);
  const costUsd = Math.round(rows.reduce((sum, row) => sum + (row.costUsd || 0), 0) * 10000) / 10000;

  const searchTotal = of('search').length + of('search_hit').length + of('search_empty').length;
  return {
    windowDays: days,
    requests: rows.length,
    chat: of('chat').length,
    search: searchTotal,
    successfulSearches: of('search_hit').length,
    noResultSearches: of('search_empty').length,
    supportEscalations: of('support').length,
    listingAssistantRequests: of('listing_assistant').length,
    recommendationRequests: of('recommend').length,
    compareRequests: of('compare').length,
    embeddingJobs: of('embedding').length,
    errors: rows.filter((item) => item.type === 'error' || item.success === false).length,
    averageResponseTimeMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    p95ResponseTimeMs: percentile(durations, 95),
    cachedRequests: rows.filter((item) => item.cached).length,
    popularFeatures: Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([feature, count]) => ({ feature, count })),
    providers: Object.entries(providerCounts).map(([provider, count]) => ({ provider, count })),
    usage: { tokensIn, tokensOut, tokensTotal: tokensIn + tokensOut, estimatedCostUsd: costUsd },
  };
}

export function __resetAiAnalyticsMemory() {
  memory.length = 0;
}
