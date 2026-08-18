import mongoose from 'mongoose';
import { SearchAnalyticsEvent } from '../models/SearchAnalyticsEvent.js';

const memory: any[] = [];
const clean = (value: unknown, max: number) => String(value || '').trim().toLowerCase().slice(0, max);

export async function recordSearchAnalytics(input: { query?: string; category?: string; filters?: Record<string, unknown>; resultCount: number; userId?: string | null }) {
  const event = { query: clean(input.query, 100), category: clean(input.category, 80), filterKeys: Object.keys(input.filters || {}).filter((key) => /^[a-zA-Z0-9_.-]{1,80}$/.test(key)).slice(0, 30), resultCount: Math.max(0, Math.floor(input.resultCount)), userId: input.userId || null, createdAt: new Date() };
  if (!event.query && !event.category && !event.filterKeys.length) return;
  if (mongoose.connection.readyState === 1) { await SearchAnalyticsEvent.create(event).catch(() => undefined); return; }
  memory.push(event); if (memory.length > 5000) memory.splice(0, memory.length - 5000);
}

export async function adminSearchAnalytics(days = 30) {
  const since = new Date(Date.now() - Math.max(1, days) * 86400000);
  const rows: any[] = mongoose.connection.readyState === 1 ? await SearchAnalyticsEvent.find({ createdAt: { $gte: since } }).select('query category filterKeys resultCount createdAt').lean() : memory.filter((item) => item.createdAt >= since);
  const countBy = (values: string[]) => [...values.reduce((map, value) => { if (value) map.set(value, (map.get(value) || 0) + 1); return map; }, new Map<string, number>())].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  return {
    searches: rows.length,
    noResultSearches: rows.filter((item) => item.resultCount === 0).length,
    topSearches: countBy(rows.map((item) => item.query)),
    noResultQueries: countBy(rows.filter((item) => item.resultCount === 0).map((item) => item.query)),
    popularCategories: countBy(rows.map((item) => item.category)),
    popularFilters: countBy(rows.flatMap((item) => item.filterKeys || [])),
  };
}

export function resetSearchAnalyticsMemory() { memory.length = 0; }
