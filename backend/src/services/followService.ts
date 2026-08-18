import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Follow } from '../models/Follow.js';
import { AppError } from '../utils/AppError.js';
import { getPublicSeller, getPublicSellerByUserId, getPublicSellerListings } from './publicSellerService.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';

type MemoryFollow = { id: string; userId: string; sellerId: string; createdAt: Date };
const memory = new Map<string, MemoryFollow>();
const key = (userId: string, sellerId: string) => `${userId}:${sellerId}`;
const connected = () => mongoose.connection.readyState === 1;
export function resetFollowMemory() { memory.clear(); }

export async function resolveSellerUserId(value: string) {
  const raw = String(value || '').trim();
  if (!raw) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
  const byId = await getSellerProfileRepository().findByUserId(raw);
  if (byId) return String(byId.userId);
  const bySlug = await getSellerProfileRepository().findByPublicSlug(raw);
  if (bySlug) return String(bySlug.userId);
  try {
    const publicSeller = await getPublicSeller(raw);
    const profile = await getSellerProfileRepository().findByPublicSlug(publicSeller.username);
    if (profile) return String(profile.userId);
  } catch { /* not a slug */ }
  throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
}

export async function followStatus(userId: string, sellerKey: string) {
  const sellerId = await resolveSellerUserId(sellerKey);
  if (connected()) return { following: Boolean(await Follow.exists({ userId, sellerId })), sellerId };
  return { following: memory.has(key(userId, sellerId)), sellerId };
}

export async function followSeller(userId: string, sellerKey: string) {
  const sellerId = await resolveSellerUserId(sellerKey);
  if (sellerId === userId) throw new AppError(409, 'You cannot follow yourself', 'SELF_FOLLOW');
  if (connected()) {
    try { await Follow.create({ userId, sellerId }); } catch (error: any) { if (error?.code !== 11000) throw error; }
  } else if (!memory.has(key(userId, sellerId))) {
    memory.set(key(userId, sellerId), { id: crypto.randomUUID(), userId, sellerId, createdAt: new Date() });
  }
  return { following: true, sellerId };
}

export async function unfollowSeller(userId: string, sellerKey: string) {
  const sellerId = await resolveSellerUserId(sellerKey);
  if (connected()) await Follow.deleteOne({ userId, sellerId });
  else memory.delete(key(userId, sellerId));
  return { following: false, sellerId };
}

export async function listFollowing(userId: string) {
  const sellerIds = connected()
    ? (await Follow.find({ userId }).sort({ createdAt: -1 }).lean()).map((item: any) => String(item.sellerId))
    : [...memory.values()].filter((item) => item.userId === userId).sort((a, b) => +b.createdAt - +a.createdAt).map((item) => item.sellerId);
  const sellers: any[] = [];
  for (const sellerId of sellerIds) {
    const profile = await getPublicSellerByUserId(sellerId);
    if (!profile) continue;
    const listings = await getPublicSellerListings(profile.username, 'newest').catch(() => []);
    sellers.push({ ...profile, recentListings: (listings || []).slice(0, 3) });
  }
  return { sellers, total: sellers.length };
}

export async function followersOfSeller(sellerId: string) {
  if (connected()) return (await Follow.find({ sellerId }).lean()).map((item: any) => String(item.userId));
  return [...memory.values()].filter((item) => item.sellerId === sellerId).map((item) => item.userId);
}
