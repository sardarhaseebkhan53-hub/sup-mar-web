import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ListingPriceHistory } from '../models/ListingPriceHistory.js';

type MemoryPrice = { id: string; listingId: string; price: number; previousPrice: number | null; createdAt: Date };
const memory = new Map<string, MemoryPrice[]>();
const connected = () => mongoose.connection.readyState === 1;
export function resetPriceHistoryMemory() { memory.clear(); }

export async function recordPriceChange(listingId: string, previousPrice: number, nextPrice: number) {
  if (!Number.isFinite(previousPrice) || !Number.isFinite(nextPrice) || previousPrice === nextPrice) return null;
  const publicId = listingId.toUpperCase();
  const createdAt = new Date();
  if (connected()) {
    const created = await ListingPriceHistory.create({ listingId: publicId, price: nextPrice, previousPrice });
    return created.toObject();
  }
  const row: MemoryPrice = { id: crypto.randomUUID(), listingId: publicId, price: nextPrice, previousPrice, createdAt };
  memory.set(publicId, [row, ...(memory.get(publicId) || [])].slice(0, 40));
  return row;
}

export async function listPriceHistory(listingId: string, limit = 12) {
  const publicId = listingId.toUpperCase();
  if (connected()) return ListingPriceHistory.find({ listingId: publicId }).sort({ createdAt: -1 }).limit(limit).lean();
  return (memory.get(publicId) || []).slice(0, limit);
}

export async function latestPriceDrop(listingId: string) {
  const history = await listPriceHistory(listingId, 1);
  const latest: any = history[0];
  if (!latest || latest.previousPrice == null || latest.price >= latest.previousPrice) return null;
  const amount = Number(latest.previousPrice) - Number(latest.price);
  if (amount <= 0) return null;
  return { amount, previousPrice: Number(latest.previousPrice), currentPrice: Number(latest.price), createdAt: latest.createdAt };
}
