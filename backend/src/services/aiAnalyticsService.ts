import mongoose from 'mongoose';
import { AIEvent } from '../models/AIEvent.js';

const memory: any[] = [];

export async function recordAiEvent(type: string, input: { userId?: string | null; durationMs?: number; success?: boolean; meta?: Record<string, unknown> } = {}) {
  const event = { type, userId: input.userId || null, durationMs: input.durationMs || 0, success: input.success !== false, meta: input.meta || {}, createdAt: new Date() };
  if (mongoose.connection.readyState === 1) {
    await AIEvent.create(event).catch(() => undefined);
    return;
  }
  memory.push(event);
  if (memory.length > 2000) memory.splice(0, memory.length - 2000);
}

export async function aiAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const rows: any[] = mongoose.connection.readyState === 1
    ? await AIEvent.find({ createdAt: { $gte: since } }).select('type success durationMs createdAt').lean()
    : memory.filter((item) => item.createdAt >= since);
  const of = (type: string) => rows.filter((item) => item.type === type);
  const durations = rows.filter((item) => item.durationMs).map((item) => item.durationMs);
  return {
    windowDays: days,
    requests: rows.length,
    chat: of('chat').length,
    search: of('search').length + of('search_hit').length + of('search_empty').length,
    successfulSearches: of('search_hit').length,
    noResultSearches: of('search_empty').length,
    supportEscalations: of('support').length,
    errors: rows.filter((item) => item.type === 'error' || item.success === false).length,
    averageResponseTimeMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
  };
}

export function __resetAiAnalyticsMemory() { memory.length = 0; }
