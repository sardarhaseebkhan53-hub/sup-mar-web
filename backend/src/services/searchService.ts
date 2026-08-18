import mongoose from 'mongoose';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { filtersForCategory } from '../constants/discovery.js';
import { citiesWithin, findCityByName, haversineKm } from '../constants/locations.js';
import { Category } from '../models/Category.js';
import { Listing } from '../models/Listing.js';
import { getPublishedMemoryListings } from './listingService.js';
import { expirePromotions } from './paymentService.js';

export type SearchInput = {
  q?: string; category?: string; subcategory?: string; location?: string;
  minPrice?: number; maxPrice?: number; minYear?: number; maxYear?: number; condition?: string[]; listingType?: string;
  date?: string; sort: string; page: number; limit: number; radius?: number;
  attributes?: Record<string, string | number | boolean>;
  excludeSellerIds?: string[]; excludeListingIds?: string[];
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dateThreshold = (date?: string) => {
  const days = date === 'today' ? 1 : date === '3days' ? 3 : date === '7days' ? 7 : date === '30days' ? 30 : 0;
  return days ? new Date(Date.now() - days * 86400000) : undefined;
};

function searchDemo(input: SearchInput) {
  const words = input.q?.toLowerCase().split(/\s+/).filter(Boolean) || [];
  const nearby = input.location && input.radius ? citiesWithin(input.location, input.radius) : [];
  let rows = [...DEMO_LISTINGS, ...getPublishedMemoryListings()].filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const locationText = `${item.location.city} ${item.location.area}`.toLowerCase();
    const locationOk = !input.location
      || locationText.includes(input.location.toLowerCase())
      || (nearby.length > 0 && nearby.some((city) => (item.location.city || '').toLowerCase() === city.toLowerCase()));
    return (!words.length || words.every((word) => text.includes(word)))
      && (!input.excludeSellerIds?.includes(String(item.sellerId))) && (!input.excludeListingIds?.includes(item.publicId))
      && (!input.category || item.categorySlug === input.category)
      && (!input.subcategory || item.subcategorySlug === input.subcategory)
      && locationOk
      && (input.minPrice === undefined || item.price >= input.minPrice)
      && (input.maxPrice === undefined || item.price <= input.maxPrice)
      && (!input.condition?.length || input.condition.includes(item.condition))
      && (input.minYear === undefined || Number(item.attributes.year || 0) >= input.minYear)
      && (input.maxYear === undefined || (item.attributes.year !== undefined && Number(item.attributes.year) <= input.maxYear))
      && (!input.listingType || item.attributes.listingType === input.listingType)
      && Object.entries(input.attributes || {}).every(([key, value]) => String(item.attributes[key]) === String(value));
  });
  if (input.sort === 'price-asc') rows.sort((a, b) => a.price - b.price);
  else if (input.sort === 'price-desc') rows.sort((a, b) => b.price - a.price);
  else if (input.sort === 'most-viewed') rows.sort((a, b) => b.viewCount - a.viewCount);
  else if (input.sort === 'nearest' && input.location) {
    const origin = findCityByName(input.location);
    rows.sort((a, b) => {
      const cityA = findCityByName(a.location?.city);
      const cityB = findCityByName(b.location?.city);
      const distA = origin && cityA ? haversineKm(origin, cityA) : 9999;
      const distB = origin && cityB ? haversineKm(origin, cityB) : 9999;
      return distA - distB || +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }
  else if(input.sort==='recommended')rows.sort((a:any,b:any)=>Number(Boolean(b.isPromoted))-Number(Boolean(a.isPromoted))||+new Date(b.createdAt)-+new Date(a.createdAt));
  else rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const total = rows.length;
  rows = rows.slice((input.page - 1) * input.limit, input.page * input.limit);
  return { listings: rows, total };
}

export async function searchListings(input: SearchInput) {
  await expirePromotions();
  if (mongoose.connection.readyState !== 1) return searchDemo(input);
  const query: Record<string, unknown> = { status: 'published', availability: 'available', ...(input.excludeSellerIds?.length && { sellerId: { $nin: input.excludeSellerIds } }), ...(input.excludeListingIds?.length && { publicId: { $nin: input.excludeListingIds } }) };
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
  if (input.minYear !== undefined || input.maxYear !== undefined) query['attributes.year'] = { ...(input.minYear !== undefined && { $gte: input.minYear }), ...(input.maxYear !== undefined && { $lte: input.maxYear }) };
  if (input.listingType) query['attributes.listingType'] = input.listingType;
  const threshold = dateThreshold(input.date);
  if (threshold) query.publishedAt = { $gte: threshold };
  Object.entries(input.attributes || {}).forEach(([key, value]) => { query[`attributes.${key}`] = value; });
  const sort = input.sort === 'price-asc' ? { price: 1 } : input.sort === 'price-desc' ? { price: -1 } : input.sort === 'most-viewed' ? { viewCount: -1 } : input.sort==='recommended'?(input.q?{score:{$meta:'textScore'},'promotion.priority':-1,publishedAt:-1}:{'promotion.priority':-1,publishedAt:-1}):{ publishedAt: -1 };
  const [listings, total] = await Promise.all([
    Listing.find(query).sort(sort as any).skip((input.page - 1) * input.limit).limit(input.limit).select('-moderation -reportCount').lean(),
    Listing.countDocuments(query),
  ]);
  return { listings, total };
}

export function getFilterConfiguration(category?: string) { return filtersForCategory(category); }
