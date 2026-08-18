import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SellerProfile } from '../models/SellerProfile.js';

const copy = <T>(value: T): T => structuredClone(value);

class MemorySellerProfileRepository {
  profiles = new Map<string, any>();
  reset() { this.profiles.clear(); }
  async findByUserId(userId: string) {
    const profile = [...this.profiles.values()].find((item) => String(item.userId) === String(userId));
    return profile ? copy(profile) : null;
  }
  async findByPublicSlug(slug: string) { const profile = [...this.profiles.values()].find((item) => item.publicSlug === slug); return profile ? copy(profile) : null; }
  async create(data: Record<string, unknown>) {
    if (await this.findByUserId(String(data.userId))) throw new Error('SELLER_PROFILE_EXISTS');
    const now = new Date();
    const profile = { _id: crypto.randomUUID(), ...copy(data), createdAt: now, updatedAt: now };
    this.profiles.set(profile._id, profile);
    return copy(profile);
  }
  async update(userId: string, updates: Record<string, unknown>) {
    const profile = [...this.profiles.values()].find((item) => String(item.userId) === String(userId));
    if (!profile) return null;
    Object.assign(profile, copy(updates), { updatedAt: new Date() });
    return copy(profile);
  }
  async upsert(userId: string, data: Record<string, unknown>) {
    const existing = await this.findByUserId(userId);
    return existing ? this.update(userId, data) : this.create({ userId, ...data });
  }
}

class MongoSellerProfileRepository {
  findByUserId(userId: string) { return SellerProfile.findOne({ userId }).lean(); }
  findByPublicSlug(slug: string) { return SellerProfile.findOne({ publicSlug: slug, isActive: true }).lean(); }
  create(data: Record<string, unknown>) { return SellerProfile.create(data).then((value) => value.toObject()); }
  update(userId: string, updates: Record<string, unknown>) { return SellerProfile.findOneAndUpdate({ userId }, { $set: updates }, { new: true, runValidators: true }).lean(); }
  upsert(userId: string, data: Record<string, unknown>) { return SellerProfile.findOneAndUpdate({ userId }, { $set: data, $setOnInsert: { userId } }, { new: true, upsert: true, runValidators: true }).lean(); }
}

const memoryRepository = new MemorySellerProfileRepository();
const mongoRepository = new MongoSellerProfileRepository();
export const getSellerProfileRepository = () => mongoose.connection.readyState === 1 ? mongoRepository : memoryRepository;
export const resetSellerProfileRepository = () => memoryRepository.reset();
