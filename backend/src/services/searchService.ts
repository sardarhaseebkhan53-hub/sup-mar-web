import mongoose from 'mongoose';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { filtersForCategory } from '../constants/discovery.js';
import { Category } from '../models/Category.js';
import { Listing } from '../models/Listing.js';
import { getPublishedMemoryListings } from './listingService.js';

export type SearchInput = {
  q?: string; category?: string; subcategory?: string; location?: string;
  minPrice?: number; maxPrice?: number; condition?: string[]; listingType?: string;
  date?: string; sort: string; page: number; limit: number;
  attributes?: Record<string, string | number | boolean>;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dateThreshold = (date?: string) => {
  const days = date === 'today' ? 1 : date === '3days' ? 3 : date === '7days' ? 7 : date === '30days' ? 30 : 0;
  return days ? new Date(Date.now() - days * 86400000) : undefined;
};

function searchDemo(input: SearchInput) {
  const words = input.q?.toLowerCase().split(/\s+/).filter(Boolean) || [];
  let rows = [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return (!words.length || words.every((word) => text.includes(word)))
      && (!input.category || item.categorySlug === input.category)
      && (!input.subcategory || item.subcategorySlug === input.subcategory)
      && (!input.location || `${item.location.city} ${item.location.area}`.toLowerCase().includes(input.location.toLowerCase()))
      && (input.minPrice === undefined || item.price >= input.minPrice)
      && (input.maxPrice === undefined || item.price <= input.maxPrice)
      && (!input.condition?.length || input.condition.includes(item.condition))
      && (!input.listingType || item.attributes.listingType === input.listingType)
      && Object.entries(input.attributes || {}).every(([key, value]) => String(item.attributes[key]) === String(value));
  });
  if (input.sort === 'price-asc') rows.sort((a, b) => a.price - b.price);
  else if (input.sort === 'price-desc') rows.sort((a, b) => b.price - a.price);
  else if (input.sort === 'most-viewed') rows.sort((a, b) => b.viewCount - a.viewCount);
  else rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const total = rows.length;
  rows = rows.slice((input.page - 1) * input.limit, input.page * input.limit);
  return { listings: rows, total };
}

export async function searchListings(input: SearchInput) {
  if (mongoose.connection.readyState !== 1) return searchDemo(input);
  const query: Record<string, unknown> = { status: 'published', availability: 'available' };
  if (input.q) query.$text = { $search: input.q };
  if (input.category) {
    const category = await Category.findOne({ slug: input.category, isActive: true }).select('_id').lean() as any;
    if (!category) return { listings: [], total: 0 };
    query.categoryId = category._id;
  }
  if (input.subcategory) {
    const subcategory = await Category.findOne({ slug: input.subcategory, isActive: true }).select('_id').lean() as any;
    if (!subcategory) return { listings: [], total: 0 };
    query.subcategoryId = subcategory._id;
  }
  if (input.location) {
    const safe = new RegExp(`^${escapeRegex(input.location)}$`, 'i');
    query.$or = [{ 'location.city': safe }, { 'location.area': safe }, { 'location.province': safe }];
  }
  if (input.minPrice !== undefined || input.maxPrice !== undefined) query.price = { ...(input.minPrice !== undefined && { $gte: input.minPrice }), ...(input.maxPrice !== undefined && { $lte: input.maxPrice }) };
  if (input.condition?.length) query.condition = { $in: input.condition };
  if (input.listingType) query['attributes.listingType'] = input.listingType;
  const threshold = dateThreshold(input.date);
  if (threshold) query.publishedAt = { $gte: threshold };
  Object.entries(input.attributes || {}).forEach(([key, value]) => { query[`attributes.${key}`] = value; });
  const sort = input.sort === 'price-asc' ? { price: 1 } : input.sort === 'price-desc' ? { price: -1 } : input.sort === 'most-viewed' ? { viewCount: -1 } : { publishedAt: -1 };
  const [listings, total] = await Promise.all([
    Listing.find(query).sort(sort as any).skip((input.page - 1) * input.limit).limit(input.limit).select('-moderation -reportCount').lean(),
    Listing.countDocuments(query),
  ]);
  return { listings, total };
}

export function getFilterConfiguration(category?: string) { return filtersForCategory(category); }
