import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { OFF_PLATFORM_PAYMENT } from '../constants/safetyPolicies.js';
import { ListingRiskAssessment } from '../models/ListingRiskAssessment.js';
import { DEMO_LISTINGS } from '../constants/demoListings.js';
import { Listing } from '../models/Listing.js';
import { getPublishedMemoryListings } from './listingService.js';

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

function catalog() {
  return [...DEMO_LISTINGS, ...getPublishedMemoryListings()];
}

function normalize(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function similar(a: string, b: string) {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.max(left.size, right.size);
}

export async function assessListing(listing: any) {
  const signals: string[] = [];
  const peers = connected()
    ? await Listing.find({ status: 'published', categorySlug: listing.categorySlug, publicId: { $ne: listing.publicId } }).select('title description price sellerId media categorySlug createdAt').lean()
    : catalog().filter((item: any) => item.publicId !== listing.publicId);
  const prices = peers.map((item: any) => Number(item.price?.toString?.() ?? item.price ?? 0)).filter((value) => value > 0);
  const price = Number(listing.price?.toString?.() ?? listing.price ?? 0);
  if (prices.length >= 3 && price > 0) {
    const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    if (median && price < median * 0.1) signals.push('unusual_price');
  }
  const text = `${listing.title || ''} ${listing.description || ''}`.toLowerCase();
  if (OFF_PLATFORM_PAYMENT.some((phrase) => text.includes(phrase))) signals.push('off_platform_payment');
  const sellerId = String(listing.sellerId || '');
  const own = peers.filter((item: any) => String(item.sellerId || '') === sellerId);
  if (own.some((item: any) => similar(item.title, listing.title) >= 0.7 && Math.abs(Number(item.price) - price) / Math.max(price, 1) <= 0.15 && item.categorySlug === listing.categorySlug)) {
    signals.push('possible_duplicate');
  }
  const day = own.filter((item: any) => +new Date(item.createdAt || 0) >= Date.now() - 86400000).length;
  if (day >= 5) signals.push('rapid_listing');
  if ((listing.reportCount || 0) >= 3) signals.push('repeated_reports');
  const fingerprint = (listing.media || []).map((item: any) => item.key || item.url).filter(Boolean).sort().join('|');
  if (fingerprint && own.some((item: any) => (item.media || []).map((media: any) => media.key || media.url).filter(Boolean).sort().join('|') === fingerprint)) {
    signals.push('similar_images');
  }
  const riskLevel = signals.includes('off_platform_payment') || signals.includes('repeated_reports') || signals.length >= 3
    ? 'High'
    : signals.length ? 'Medium' : 'Low';
  const record = {
    id: crypto.randomUUID(),
    listingId: listing.publicId,
    riskLevel,
    signals,
    reviewed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (connected()) {
    const saved = await ListingRiskAssessment.findOneAndUpdate(
      { listingId: listing.publicId },
      { $set: { riskLevel, signals, updatedAt: new Date() }, $setOnInsert: { reviewed: false } },
      { upsert: true, new: true },
    ).lean();
    return saved;
  }
  memory.set(listing.publicId, record);
  return record;
}

export function publicSafetyNotice(assessment: any) {
  if (!assessment || assessment.riskLevel !== 'High') return null;
  if ((assessment.signals || []).includes('off_platform_payment')) {
    return { title: 'Safety notice', text: 'Be cautious when a seller requests payment outside QAVLIO.' };
  }
  return { title: 'Safety notice', text: 'Review the listing details carefully before paying or sharing personal information.' };
}

export async function listRiskAssessments(input: any) {
  let rows: any[] = connected()
    ? await ListingRiskAssessment.find({ ...(input.riskLevel && { riskLevel: input.riskLevel }), ...(input.reviewed !== undefined && { reviewed: input.reviewed }) }).sort({ updatedAt: -1 }).limit(500).lean()
    : [...memory.values()].filter((item) => (!input.riskLevel || item.riskLevel === input.riskLevel) && (input.reviewed === undefined || item.reviewed === input.reviewed));
  const total = rows.length;
  const start = ((input.page || 1) - 1) * (input.limit || 25);
  return {
    assessments: rows.slice(start, start + (input.limit || 25)).map((item) => ({
      id: String(item._id || item.id),
      listingId: item.listingId,
      riskLevel: item.riskLevel,
      signals: item.signals,
      reviewed: Boolean(item.reviewed),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    pagination: { page: input.page || 1, limit: input.limit || 25, total, totalPages: Math.ceil(total / (input.limit || 25)) },
    summary: { high: rows.filter((item) => item.riskLevel === 'High').length, unreviewed: rows.filter((item) => !item.reviewed).length },
  };
}

export async function updateRiskAssessment(id: string, patch: { reviewed?: boolean; riskLevel?: string; note?: string }) {
  if (connected() && mongoose.isValidObjectId(id)) {
    return ListingRiskAssessment.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: new Date() } }, { new: true }).lean();
  }
  const item = [...memory.values()].find((row) => String(row._id || row.id) === id || row.listingId === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date() });
  memory.set(item.listingId, item);
  return item;
}

export async function findPossibleDuplicates(listing: any) {
  const assessment: any = await assessListing(listing);
  return (assessment?.signals || []).includes('possible_duplicate');
}

export function __resetRiskMemory() { memory.clear(); }
