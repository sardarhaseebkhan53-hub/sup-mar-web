import mongoose from 'mongoose';
import { AIUsageEvent } from '../models/AIUsageEvent.js';

/**
 * Phase 16 AI usage tracking.
 *
 * Records feature, provider/model, success, latency and token/cost estimates.
 * It never persists prompts, marketplace content, or personal data.
 */

export type AiUsageInput = {
  feature: string;
  provider: string;
  model?: string;
  success: boolean;
  durationMs: number;
  inputChars?: number;
  outputChars?: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  errorCode?: string;
  userId?: string | null;
};

/** Coarse public price sheet (USD per 1K tokens). Only used to give admins a signal. */
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  heuristic: { input: 0, output: 0 },
  openai: { input: 0.00015, output: 0.0006 },
  gemini: { input: 0.0001, output: 0.0004 },
};

const memory: any[] = [];
const MEMORY_LIMIT = 3000;

function estimateCost(input: AiUsageInput) {
  if (input.estimatedCostUsd !== undefined) return input.estimatedCostUsd;
  const rate = COST_PER_1K_TOKENS[input.provider] || COST_PER_1K_TOKENS.heuristic;
  const prompt = (input.promptTokens || 0) / 1000 * rate.input;
  const completion = (input.completionTokens || 0) / 1000 * rate.output;
  return Number((prompt + completion).toFixed(6));
}

export async function recordAiUsage(input: AiUsageInput) {
  const totalTokens = (input.promptTokens || 0) + (input.completionTokens || 0);
  const event = {
    feature: String(input.feature || 'unknown').slice(0, 60),
    provider: String(input.provider || 'heuristic').slice(0, 40),
    model: String(input.model || '').slice(0, 80),
    success: input.success !== false,
    durationMs: Math.max(0, Math.round(input.durationMs || 0)),
    inputChars: input.inputChars || 0,
    outputChars: input.outputChars || 0,
    promptTokens: input.promptTokens || 0,
    completionTokens: input.completionTokens || 0,
    totalTokens,
    estimatedCostUsd: estimateCost(input),
    errorCode: String(input.errorCode || '').slice(0, 120),
    userId: input.userId || null,
    createdAt: new Date(),
  };
  if (mongoose.connection.readyState === 1) {
    await AIUsageEvent.create(event).catch(() => undefined);
    return event;
  }
  memory.push(event);
  if (memory.length > MEMORY_LIMIT) memory.splice(0, memory.length - MEMORY_LIMIT);
  return event;
}

export async function aiUsageAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows: any[] = mongoose.connection.readyState === 1
    ? await AIUsageEvent.find({ createdAt: { $gte: since } }).select('feature provider model success durationMs totalTokens estimatedCostUsd errorCode createdAt').lean()
    : memory.filter((item) => item.createdAt >= since);

  const byFeature = new Map<string, { feature: string; requests: number; errors: number; totalMs: number; tokens: number; costUsd: number }>();
  const byProvider = new Map<string, { provider: string; requests: number; errors: number; tokens: number; costUsd: number }>();
  let totalMs = 0;
  const durations: number[] = [];

  for (const row of rows) {
    const feature = byFeature.get(row.feature) || { feature: row.feature, requests: 0, errors: 0, totalMs: 0, tokens: 0, costUsd: 0 };
    feature.requests += 1;
    if (!row.success) feature.errors += 1;
    feature.totalMs += row.durationMs || 0;
    feature.tokens += row.totalTokens || 0;
    feature.costUsd += row.estimatedCostUsd || 0;
    byFeature.set(row.feature, feature);

    const provider = byProvider.get(row.provider) || { provider: row.provider, requests: 0, errors: 0, tokens: 0, costUsd: 0 };
    provider.requests += 1;
    if (!row.success) provider.errors += 1;
    provider.tokens += row.totalTokens || 0;
    provider.costUsd += row.estimatedCostUsd || 0;
    byProvider.set(row.provider, provider);

    totalMs += row.durationMs || 0;
    if (row.durationMs) durations.push(row.durationMs);
  }

  durations.sort((a, b) => a - b);
  const errors = rows.filter((row) => !row.success);

  return {
    windowDays: days,
    requests: rows.length,
    errors: errors.length,
    errorRate: rows.length ? Number((errors.length / rows.length).toFixed(4)) : 0,
    averageLatencyMs: rows.length ? Math.round(totalMs / rows.length) : 0,
    p95LatencyMs: durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : 0,
    totalTokens: rows.reduce((sum, row) => sum + (row.totalTokens || 0), 0),
    estimatedCostUsd: Number(rows.reduce((sum, row) => sum + (row.estimatedCostUsd || 0), 0).toFixed(6)),
    features: [...byFeature.values()]
      .map((item) => ({ ...item, averageLatencyMs: item.requests ? Math.round(item.totalMs / item.requests) : 0, costUsd: Number(item.costUsd.toFixed(6)) }))
      .sort((a, b) => b.requests - a.requests),
    providers: [...byProvider.values()].map((item) => ({ ...item, costUsd: Number(item.costUsd.toFixed(6)) })).sort((a, b) => b.requests - a.requests),
    recentErrors: errors.slice(-10).reverse().map((row) => ({ feature: row.feature, provider: row.provider, errorCode: row.errorCode, at: row.createdAt })),
  };
}

export function __resetAiUsageMemory() { memory.length = 0; }
