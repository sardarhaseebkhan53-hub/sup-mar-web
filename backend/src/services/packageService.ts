import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SellerPackage } from '../models/SellerPackage.js';
import { AppError } from '../utils/AppError.js';

const DEFAULT_PACKAGES = [
  { id: 'starter', name: 'Starter', description: 'A simple credit pack for occasional sellers.', price: 450, currency: 'PKR', listingCredits: 5, promotionCredits: 0, promotionDays: 0, validityDays: 365, features: ['5 additional listings', 'Credits never become cash'], active: true, sortOrder: 1 },
  { id: 'growth', name: 'Growth', description: 'More listings plus promotion flexibility.', price: 999, currency: 'PKR', listingCredits: 10, promotionCredits: 2, promotionDays: 0, validityDays: 365, features: ['10 additional listings', '2 promotion credits', 'Transaction invoices'], active: true, sortOrder: 2 },
  { id: 'professional', name: 'Professional', description: 'A larger package for active marketplace sellers.', price: 1_899, currency: 'PKR', listingCredits: 20, promotionCredits: 5, promotionDays: 14, validityDays: 365, features: ['20 additional listings', '5 promotion credits', '14 featured days entitlement'], active: true, sortOrder: 3 },
];
const memory = new Map<string, any>(DEFAULT_PACKAGES.map((item) => [item.id, { ...item, createdAt: new Date(), updatedAt: new Date() }]));
const money = (value: any) => Number(value?.toString?.() ?? value ?? 0);
const present = (item: any) => ({ id: String(item._id || item.id), name: item.name, description: item.description, price: money(item.price), currency: item.currency, listingCredits: item.listingCredits || 0, promotionCredits: item.promotionCredits || 0, promotionDays: item.promotionDays || 0, validityDays: item.validityDays || 365, features: item.features || [], active: item.active !== false, sortOrder: item.sortOrder || 0, createdAt: item.createdAt, updatedAt: item.updatedAt });

async function ensureDefaults() {
  if (mongoose.connection.readyState !== 1 || await SellerPackage.exists({})) return;
  await SellerPackage.insertMany(DEFAULT_PACKAGES.map(({ id: _id, ...item }) => item));
}

export async function listSellerPackages(includeInactive = false) {
  if (mongoose.connection.readyState !== 1) return [...memory.values()].filter((item) => includeInactive || item.active).sort((a, b) => a.sortOrder - b.sortOrder).map(present);
  await ensureDefaults();
  return (await SellerPackage.find(includeInactive ? {} : { active: true }).sort({ sortOrder: 1, price: 1 }).lean()).map(present);
}

export async function getSellerPackage(id: string, requireActive = true) {
  const item: any = mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id) ? await SellerPackage.findById(id).lean() : memory.get(id);
  if (!item || (requireActive && item.active === false)) throw new AppError(404, 'Seller package not found', 'PACKAGE_NOT_FOUND');
  return present(item);
}

export async function createSellerPackage(input: any) {
  if (mongoose.connection.readyState === 1) return present((await SellerPackage.create(input)).toObject());
  const id = crypto.randomUUID(); const item = { id, ...input, createdAt: new Date(), updatedAt: new Date() }; memory.set(id, item); return present(item);
}

export async function updateSellerPackage(id: string, input: any) {
  if (mongoose.connection.readyState === 1) {
    if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Seller package not found', 'PACKAGE_NOT_FOUND');
    const item = await SellerPackage.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean();
    if (!item) throw new AppError(404, 'Seller package not found', 'PACKAGE_NOT_FOUND'); return present(item);
  }
  const item = memory.get(id); if (!item) throw new AppError(404, 'Seller package not found', 'PACKAGE_NOT_FOUND');
  Object.assign(item, input, { updatedAt: new Date() }); memory.set(id, item); return present(item);
}
