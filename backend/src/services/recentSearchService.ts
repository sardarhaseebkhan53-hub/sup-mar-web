import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { RECENT_SEARCH_LIMIT } from '../constants/buyerExperience.js';
import { RecentSearch } from '../models/RecentSearch.js';

type MemorySearch = { id: string; userId: string; query: string; filters: Record<string, unknown>; searchedAt: Date };
const memory = new Map<string, MemorySearch>();
const connected = () => mongoose.connection.readyState === 1;
export function resetRecentSearchMemory() { memory.clear(); }

function present(item: any) {
  return { id: String(item._id || item.id), query: item.query || '', filters: item.filters || {}, searchedAt: item.searchedAt };
}

export async function recordRecentSearch(userId: string, input: { query?: string; filters?: Record<string, unknown> }) {
  const query = String(input.query || '').trim().slice(0, 100);
  const filters = input.filters && typeof input.filters === 'object' ? input.filters : {};
  if (!query && !Object.keys(filters).length) return null;
  const now = new Date();
  if (connected()) {
    const existing: any = await RecentSearch.findOne({ userId, query }).lean();
    if (existing) {
      await RecentSearch.updateOne({ _id: existing._id }, { $set: { filters, searchedAt: now } });
    } else {
      await RecentSearch.create({ userId, query, filters, searchedAt: now });
    }
    const stale = await RecentSearch.find({ userId }).sort({ searchedAt: -1 }).skip(RECENT_SEARCH_LIMIT).select('_id').lean();
    if (stale.length) await RecentSearch.deleteMany({ _id: { $in: stale.map((item: any) => item._id) } });
    return { query, filters, searchedAt: now };
  }
  const current = [...memory.values()].find((item) => item.userId === userId && item.query === query);
  const record: MemorySearch = current || { id: crypto.randomUUID(), userId, query, filters, searchedAt: now };
  record.filters = filters;
  record.searchedAt = now;
  memory.set(record.id, record);
  const extras = [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.searchedAt - +a.searchedAt).slice(RECENT_SEARCH_LIMIT);
  extras.forEach((item) => memory.delete(item.id));
  return present(record);
}

export async function listRecentSearches(userId: string) {
  if (connected()) return (await RecentSearch.find({ userId }).sort({ searchedAt: -1 }).limit(RECENT_SEARCH_LIMIT).lean()).map(present);
  return [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.searchedAt - +a.searchedAt).slice(0, RECENT_SEARCH_LIMIT).map(present);
}

export async function removeRecentSearch(userId: string, id: string) {
  if (connected() && mongoose.isValidObjectId(id)) await RecentSearch.deleteOne({ _id: id, userId });
  else {
    const item = memory.get(id);
    if (item?.userId === userId) memory.delete(id);
  }
  return { deleted: true };
}

export async function clearRecentSearches(userId: string) {
  if (connected()) await RecentSearch.deleteMany({ userId });
  else for (const [id, item] of memory) if (item.userId === userId) memory.delete(id);
  return { deleted: true };
}
