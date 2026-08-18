import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { filtersForCategory } from '../constants/discovery.js';
import { Category } from '../models/Category.js';
import { Listing } from '../models/Listing.js';
import { AppError } from '../utils/AppError.js';
import type { ListingInput } from '../validators/listingValidator.js';
import { getCategoryBySlug, getSubcategories } from './categoryService.js';
import { verifyListingMedia } from './imageService.js';

const memoryListings = new Map<string, any>();
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'listing';
const publicId = () => `QV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
const connected = () => mongoose.connection.readyState === 1;
const present = (record: any) => ({ ...record, id: String(record._id || record.id || record.publicId), price: record.price?.toString?.() || record.price });

async function resolveTaxonomy(input: ListingInput) {
  if (!input.categorySlug) return { category: null, subcategory: null };
  const category = await getCategoryBySlug(input.categorySlug);
  if (!category) throw new AppError(422, 'Choose an active marketplace category', 'CATEGORY_INVALID');
  let subcategory: any = null;
  if (input.subcategorySlug) {
    const options = await getSubcategories(input.categorySlug);
    subcategory = options?.find((item: any) => item.slug === input.subcategorySlug);
    if (!subcategory) throw new AppError(422, 'Choose a valid subcategory', 'SUBCATEGORY_INVALID');
  }
  const allowed = new Set(filtersForCategory(input.categorySlug).map((field) => field.key));
  for (const key of Object.keys(input.attributes || {})) if (!allowed.has(key)) throw new AppError(422, `Attribute “${key}” is not allowed for this category`, 'ATTRIBUTE_INVALID');
  return { category, subcategory };
}

async function idsFor(input: ListingInput) {
  if (!connected() || !input.categorySlug) return { categoryId: null, subcategoryId: null };
  const [category, subcategory] = await Promise.all([Category.findOne({ slug: input.categorySlug, isActive: true }).select('_id').lean() as any, input.subcategorySlug ? Category.findOne({ slug: input.subcategorySlug, isActive: true }).select('_id').lean() as any : null]);
  return { categoryId: category?._id || null, subcategoryId: subcategory?._id || null };
}

function assertPublishable(record: any) {
  const errors: string[] = [];
  if (!record.categorySlug && !record.categoryId) errors.push('category');
  if (!record.title || record.title.length < 5) errors.push('title');
  if (!record.description || record.description.length < 20) errors.push('description');
  if (record.price === undefined || record.price === null || Number(record.price) < 0) errors.push('price');
  if (!record.condition) errors.push('condition');
  if (!record.location?.city || !record.location?.area) errors.push('location');
  if (!record.media?.length) errors.push('at least one photo');
  if (errors.length) throw new AppError(422, `Complete these fields before publishing: ${errors.join(', ')}`, 'LISTING_INCOMPLETE', { fields: errors });
}

export async function createListing(userId: string, input: ListingInput) {
  await resolveTaxonomy(input); verifyListingMedia(userId, input.media || []); const ids = await idsFor(input);
  const now = new Date(); const id = publicId();
  const payload: any = { ...input, ...ids, coverImage: input.media?.[0]?.url || null, publicId: id, sellerId: userId, slug: slugify(input.title || 'draft'), status: 'draft', availability: 'available', viewCount: 0, favoriteCount: 0, messagesCount: 0, createdAt: now, updatedAt: now };
  if (!connected()) { memoryListings.set(id, payload); return present(payload); }
  return present((await Listing.create(payload)).toObject());
}

export async function getOwnedListing(userId: string, id: string) {
  const record = connected() ? await Listing.findOne({ $or: [{ publicId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])], sellerId: userId }).lean() : memoryListings.get(id);
  if (!record || String((record as any).sellerId) !== userId) throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND');
  return present(record);
}

export async function updateListing(userId: string, id: string, input: ListingInput) {
  const current = await getOwnedListing(userId, id);
  if (current.status === 'removed') throw new AppError(409, 'Removed listings cannot be edited', 'LISTING_REMOVED');
  await resolveTaxonomy({ ...current, ...input }); verifyListingMedia(userId, input.media || current.media || []); const ids = await idsFor({ ...current, ...input });
  const patch: any = { ...input, ...ids, ...(input.media && { coverImage: input.media[0]?.url || null }), ...(input.title && { slug: slugify(input.title) }), updatedAt: new Date() };
  if (!connected()) { const next = { ...current, ...patch }; memoryListings.set(current.publicId, next); return present(next); }
  return present(await Listing.findOneAndUpdate({ publicId: current.publicId, sellerId: userId }, { $set: patch }, { new: true, runValidators: true }).lean());
}

export async function transitionListing(userId: string, id: string, action: 'publish' | 'pause' | 'resume' | 'sold' | 'remove') {
  const current = await getOwnedListing(userId, id); const allowed: Record<string, string[]> = { publish: ['draft', 'pending', 'paused'], pause: ['published'], resume: ['paused'], sold: ['published', 'paused'], remove: ['draft', 'pending', 'published', 'paused', 'sold'] };
  if (!allowed[action].includes(current.status)) throw new AppError(409, `A ${current.status} listing cannot be ${action}d`, 'LISTING_STATUS_INVALID');
  if (action === 'publish') assertPublishable(current);
  const status = action === 'publish' || action === 'resume' ? 'published' : action === 'remove' ? 'removed' : action === 'sold' ? 'sold' : 'paused';
  const patch = { status, availability: status === 'sold' ? 'unavailable' : 'available', ...(status === 'published' && !current.publishedAt ? { publishedAt: new Date() } : {}), updatedAt: new Date() };
  if (!connected()) { const next = { ...current, ...patch }; memoryListings.set(current.publicId, next); return present(next); }
  return present(await Listing.findOneAndUpdate({ publicId: current.publicId, sellerId: userId }, { $set: patch }, { new: true }).lean());
}

export async function listSellerListings(userId: string, input: any) {
  let rows: any[]; if (!connected()) rows = [...memoryListings.values()].filter((item) => item.sellerId === userId);
  else { const category = input.category ? await Category.findOne({ slug: input.category, isActive: true }).select('_id').lean() as any : null; const since = input.date ? new Date(Date.now() - (input.date === 'today' ? 1 : input.date === '7days' ? 7 : 30) * 86400000) : null; rows = await Listing.find({ sellerId: userId, ...(input.status && { status: input.status }), ...(category && { categoryId: category._id }), ...(since && { createdAt: { $gte: since } }), ...((input.minPrice !== undefined || input.maxPrice !== undefined) && { price: { ...(input.minPrice !== undefined && { $gte: input.minPrice }), ...(input.maxPrice !== undefined && { $lte: input.maxPrice }) } }) }).sort({ createdAt: input.sort === 'oldest' ? 1 : -1 }).lean(); }
  if (input.q) rows = rows.filter((item) => `${item.title} ${item.publicId}`.toLowerCase().includes(input.q.toLowerCase()));
  if (input.status) rows = rows.filter((item) => item.status === input.status);
  if (input.category && !connected()) rows = rows.filter((item) => item.categorySlug === input.category);
  if (input.date && !connected()) { const days = input.date === 'today' ? 1 : input.date === '7days' ? 7 : 30; rows = rows.filter((item) => +new Date(item.createdAt) >= Date.now() - days * 86400000); }
  if (input.minPrice !== undefined) rows = rows.filter((item) => Number(item.price) >= input.minPrice); if (input.maxPrice !== undefined) rows = rows.filter((item) => Number(item.price) <= input.maxPrice);
  if (input.sort === 'most-viewed') rows.sort((a, b) => b.viewCount - a.viewCount); if (input.sort === 'price-asc') rows.sort((a, b) => Number(a.price) - Number(b.price)); if (input.sort === 'price-desc') rows.sort((a, b) => Number(b.price) - Number(a.price));
  const total = rows.length; const start = (input.page - 1) * input.limit; rows = rows.slice(start, start + input.limit);
  const all = connected() ? await Listing.find({ sellerId: userId, status: { $ne: 'removed' } }).select('status viewCount favoriteCount messagesCount').lean() : [...memoryListings.values()].filter((item) => item.sellerId === userId && item.status !== 'removed');
  const summary = { active: all.filter((i: any) => i.status === 'published').length, pending: all.filter((i: any) => i.status === 'pending').length, drafts: all.filter((i: any) => i.status === 'draft').length, sold: all.filter((i: any) => i.status === 'sold').length, views: all.reduce((sum: number, i: any) => sum + (i.viewCount || 0), 0), favorites: all.reduce((sum: number, i: any) => sum + (i.favoriteCount || 0), 0), messages: all.reduce((sum: number, i: any) => sum + (i.messagesCount || 0), 0) };
  return { listings: rows.map(present), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) }, summary };
}

export async function getPublicListing(id: string) { const record = connected() ? await Listing.findOne({ publicId: id, status: 'published' }).lean() : memoryListings.get(id); if (!record || record.status !== 'published') throw new AppError(404, 'Listing not found', 'LISTING_NOT_FOUND'); return present(record); }
export function getPublishedMemoryListings() { return [...memoryListings.values()].filter((item) => item.status === 'published'); }
export function incrementMemoryListingView(id: string) { const item = memoryListings.get(id); if (item) { item.viewCount = (item.viewCount || 0) + 1; memoryListings.set(id, item); } }
