import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ALERT_FREQUENCIES, type AlertFrequency } from '../constants/buyerExperience.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { AppError } from '../utils/AppError.js';
import { searchListings } from './searchService.js';

type SavedSearchRecord = {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  categoryId: string;
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string;
  sort: string;
  alertEnabled: boolean;
  alertFrequency: AlertFrequency;
  lastMatchedAt: Date | null;
  lastNotifiedAt: Date | null;
  pendingMatchCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const memory = new Map<string, SavedSearchRecord>();
const connected = () => mongoose.connection.readyState === 1;
export function resetSavedSearchMemory() { memory.clear(); }

function present(record: any) {
  return {
    id: String(record._id || record.id),
    name: record.name,
    query: record.query || '',
    filters: record.filters || {},
    categoryId: record.categoryId || '',
    location: record.location || '',
    minPrice: record.minPrice ?? null,
    maxPrice: record.maxPrice ?? null,
    condition: record.condition || '',
    sort: record.sort || 'newest',
    alertEnabled: Boolean(record.alertEnabled),
    alertFrequency: record.alertFrequency || 'daily',
    lastMatchedAt: record.lastMatchedAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function sanitizeInput(userId: string, input: any, existing?: SavedSearchRecord) {
  const name = String(input.name || existing?.name || '').trim().slice(0, 80);
  if (!name) throw new AppError(422, 'Give this search a name', 'SAVED_SEARCH_NAME');
  const frequency = ALERT_FREQUENCIES.includes(input.alertFrequency) ? input.alertFrequency : existing?.alertFrequency || 'daily';
  return {
    userId,
    name,
    query: String(input.query ?? existing?.query ?? '').trim().slice(0, 100),
    filters: typeof (input.filters ?? existing?.filters) === 'object' && (input.filters ?? existing?.filters) ? (input.filters ?? existing?.filters) : {},
    categoryId: String(input.categoryId ?? input.category ?? existing?.categoryId ?? '').trim().slice(0, 80),
    location: String(input.location ?? existing?.location ?? '').trim().slice(0, 80),
    minPrice: input.minPrice === undefined ? existing?.minPrice ?? null : Number(input.minPrice),
    maxPrice: input.maxPrice === undefined ? existing?.maxPrice ?? null : Number(input.maxPrice),
    condition: String(input.condition ?? existing?.condition ?? '').trim().slice(0, 80),
    sort: String(input.sort ?? existing?.sort ?? 'newest').slice(0, 40),
    alertEnabled: input.alertEnabled === undefined ? Boolean(existing?.alertEnabled) : Boolean(input.alertEnabled),
    alertFrequency: frequency as AlertFrequency,
  };
}

export async function listSavedSearches(userId: string) {
  if (connected()) {
    const rows = await SavedSearch.find({ userId }).sort({ createdAt: -1 }).lean();
    return rows.map(present);
  }
  return [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.createdAt - +a.createdAt).map(present);
}

export async function createSavedSearch(userId: string, input: any) {
  const payload = sanitizeInput(userId, input);
  const now = new Date();
  if (connected()) {
    const created = await SavedSearch.create({ ...payload, lastMatchedAt: null, lastNotifiedAt: null, pendingMatchCount: 0 });
    return present(created.toObject());
  }
  const record: SavedSearchRecord = { id: crypto.randomUUID(), ...payload, lastMatchedAt: null, lastNotifiedAt: null, pendingMatchCount: 0, createdAt: now, updatedAt: now };
  memory.set(record.id, record);
  return present(record);
}

async function owned(userId: string, id: string) {
  const record: any = connected()
    ? (mongoose.isValidObjectId(id) ? await SavedSearch.findById(id).lean() : null)
    : memory.get(id);
  if (!record || String(record.userId) !== userId) throw new AppError(404, 'Saved search not found', 'SAVED_SEARCH_NOT_FOUND');
  return record;
}

export async function updateSavedSearch(userId: string, id: string, input: any) {
  const current = await owned(userId, id);
  const payload = sanitizeInput(userId, input, connected() ? { ...current, id: String(current._id) } : current);
  if (connected()) return present(await SavedSearch.findOneAndUpdate({ _id: id, userId }, { $set: payload }, { new: true }).lean());
  const next = { ...current, ...payload, updatedAt: new Date() };
  memory.set(id, next);
  return present(next);
}

export async function deleteSavedSearch(userId: string, id: string) {
  await owned(userId, id);
  if (connected()) await SavedSearch.deleteOne({ _id: id, userId });
  else memory.delete(id);
  return { deleted: true };
}

export function listingMatchesSearch(listing: any, search: { query?: string; categoryId?: string; location?: string; minPrice?: number | null; maxPrice?: number | null; condition?: string }) {
  const text = `${listing.title || ''} ${listing.description || ''}`.toLowerCase();
  const words = String(search.query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length && !words.every((word) => text.includes(word))) return false;
  if (search.categoryId && listing.categorySlug !== search.categoryId && listing.subcategorySlug !== search.categoryId) return false;
  if (search.location) {
    const loc = `${listing.location?.city || ''} ${listing.location?.area || ''} ${listing.location?.province || ''}`.toLowerCase();
    if (!loc.includes(search.location.toLowerCase())) return false;
  }
  const price = Number(listing.price?.toString?.() ?? listing.price ?? 0);
  if (search.minPrice != null && Number.isFinite(search.minPrice) && price < Number(search.minPrice)) return false;
  if (search.maxPrice != null && Number.isFinite(search.maxPrice) && price > Number(search.maxPrice)) return false;
  if (search.condition) {
    const allowed = search.condition.split(',').map((item) => item.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(listing.condition)) return false;
  }
  return true;
}

export async function testSavedSearch(userId: string, id: string) {
  const search = present(await owned(userId, id));
  const result = await searchListings({
    q: search.query || undefined,
    category: search.categoryId || undefined,
    location: search.location || undefined,
    minPrice: search.minPrice ?? undefined,
    maxPrice: search.maxPrice ?? undefined,
    condition: search.condition ? search.condition.split(',') : undefined,
    sort: search.sort || 'newest',
    page: 1,
    limit: 8,
  });
  return { matches: result.total, listings: result.listings };
}

export async function listAlertEnabledSearches() {
  if (connected()) return (await SavedSearch.find({ alertEnabled: true }).lean()).map((item: any) => ({ ...item, id: String(item._id) }));
  return [...memory.values()].filter((item) => item.alertEnabled);
}

export async function markSearchMatch(id: string, notified: boolean, increment = 1) {
  if (connected() && mongoose.isValidObjectId(id)) {
    await SavedSearch.updateOne({ _id: id }, {
      $set: { lastMatchedAt: new Date(), ...(notified ? { lastNotifiedAt: new Date(), pendingMatchCount: 0 } : {}) },
      ...(!notified ? { $inc: { pendingMatchCount: increment } } : {}),
    });
    return;
  }
  const item = memory.get(id);
  if (!item) return;
  item.lastMatchedAt = new Date();
  if (notified) { item.lastNotifiedAt = new Date(); item.pendingMatchCount = 0; }
  else item.pendingMatchCount += increment;
  memory.set(id, item);
}
