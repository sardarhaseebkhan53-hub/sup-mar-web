import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { ReviewHelpful } from '../models/ReviewHelpful.js';
import { ReviewReport } from '../models/ReviewReport.js';
import { ReviewResponse } from '../models/ReviewResponse.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { findEligibleInteraction } from './messagingService.js';
import { findListingByPublicKey } from './listingService.js';


const reviews = new Map<string, any>();
const responses = new Map<string, any>();
const helpful = new Set<string>();
const reports = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

function sanitizePlain(value: unknown, max: number) {
  const stripped = String(value || '').replace(/<[^>]*>/g, '');
  return stripped.split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join('').trim().slice(0, max);
}

function presentReview(record: any, extras: any = {}) {
  return {
    id: String(record._id || record.id),
    reviewerId: String(record.reviewerId),
    sellerId: String(record.sellerId),
    listingId: record.listingId,
    rating: record.rating,
    title: record.title || '',
    comment: record.comment || '',
    status: record.status,
    helpfulCount: record.helpfulCount || 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    reviewerName: extras.reviewerName || 'QAVLIO user',
    reviewerAvatar: extras.reviewerAvatar || null,
    response: extras.response || null,
  };
}

async function resolveSellerUserId(usernameOrId: string) {
  const bySlug = await getSellerProfileRepository().findByPublicSlug(usernameOrId);
  if (bySlug) return String(bySlug.userId);
  const byUser = await getSellerProfileRepository().findByUserId(usernameOrId);
  if (byUser) return String(byUser.userId);
  const listed: any[] = await getSellerProfileRepository().list({ search: usernameOrId, limit: 50 });
  const match = listed.find((item) => item.publicSlug === usernameOrId || String(item.userId) === usernameOrId);
  return match ? String(match.userId) : usernameOrId;
}

export async function reviewEligibility(reviewerId: string, sellerKey: string, listingId?: string) {
  const listing = listingId ? await findListingByPublicKey(listingId) : null;
  const sellerId = listing ? String(listing.sellerId) : await resolveSellerUserId(sellerKey);
  if (reviewerId === sellerId) return { eligible: false, reason: 'You cannot review yourself.' };
  const interaction = await findEligibleInteraction(reviewerId, sellerId, listingId || listing?.publicId);
  if (!interaction) return { eligible: false, reason: 'Reviews require a QAVLIO conversation about this seller’s listing.' };
  const existing = await findReview(reviewerId, String(interaction.listingId));
  return { eligible: !existing, reason: existing ? 'You already reviewed this listing interaction.' : null, listingId: String(interaction.listingId), conversationId: interaction.conversationId, sellerId };
}

async function findReview(reviewerId: string, listingId: string) {
  if (connected()) return Review.findOne({ reviewerId, listingId }).lean();
  return [...reviews.values()].find((item) => item.reviewerId === reviewerId && item.listingId === listingId) || null;
}

export async function createReview(reviewerId: string, sellerKey: string, input: { listingId?: string; rating: number; title?: string; comment?: string }) {
  const check = await reviewEligibility(reviewerId, sellerKey, input.listingId);
  if (check.reason && /already reviewed/i.test(check.reason)) throw new AppError(409, check.reason, 'REVIEW_EXISTS');
  if (!check.eligible) throw new AppError(403, check.reason || 'You cannot review this seller yet.', 'REVIEW_NOT_ELIGIBLE');
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError(422, 'Choose a rating from 1 to 5 stars.', 'REVIEW_RATING_INVALID');
  const title = sanitizePlain(input.title, 120);
  const comment = sanitizePlain(input.comment, 2000);
  if (!title && !comment) throw new AppError(422, 'Add a short title or comment.', 'REVIEW_EMPTY');
  if (/<script|javascript:|onerror=/i.test(`${title} ${comment}`)) throw new AppError(422, 'Reviews must be plain text.', 'REVIEW_UNSAFE');
  const record = {
    id: crypto.randomUUID(),
    reviewerId,
    sellerId: check.sellerId,
    listingId: check.listingId,
    conversationId: check.conversationId,
    rating,
    title,
    comment,
    status: 'Published',
    helpfulCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (connected()) {
    try {
      const created = await Review.create(record);
      await refreshSellerRating(check.sellerId!);
      return presentReview(created.toObject());
    } catch (error: any) {
      if (error?.code === 11000) throw new AppError(409, 'You already reviewed this listing interaction.', 'REVIEW_EXISTS');
      throw error;
    }
  }
  if (await findReview(reviewerId, check.listingId!)) throw new AppError(409, 'You already reviewed this listing interaction.', 'REVIEW_EXISTS');
  reviews.set(record.id, record);
  await refreshSellerRating(check.sellerId!);
  return presentReview(record);
}

export async function updateReview(userId: string, id: string, input: { rating?: number; title?: string; comment?: string }) {
  const current: any = await getReviewRecord(id);
  if (String(current.reviewerId) !== userId) throw new AppError(403, 'You can only edit your own review.', 'REVIEW_FORBIDDEN');
  if (current.status === 'Removed') throw new AppError(409, 'Removed reviews cannot be edited.', 'REVIEW_REMOVED');
  const patch: any = { updatedAt: new Date() };
  if (input.rating !== undefined) {
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError(422, 'Choose a rating from 1 to 5 stars.', 'REVIEW_RATING_INVALID');
    patch.rating = rating;
  }
  if (input.title !== undefined) patch.title = sanitizePlain(input.title, 120);
  if (input.comment !== undefined) patch.comment = sanitizePlain(input.comment, 2000);
  const next = await saveReview(current, patch);
  await refreshSellerRating(String(current.sellerId));
  return presentReview(next);
}

export async function deleteReview(userId: string, id: string) {
  const current: any = await getReviewRecord(id);
  if (String(current.reviewerId) !== userId) throw new AppError(403, 'You can only delete your own review.', 'REVIEW_FORBIDDEN');
  const next = await saveReview(current, { status: 'Removed', updatedAt: new Date() });
  await refreshSellerRating(String(current.sellerId));
  return presentReview(next);
}

export async function listSellerReviews(sellerKey: string, input: { sort?: string; page?: number; limit?: number }) {
  const sellerId = await resolveSellerUserId(sellerKey);
  const sort = input.sort || 'newest';
  const page = input.page || 1;
  const limit = Math.min(input.limit || 10, 50);
  let rows: any[] = connected()
    ? await Review.find({ sellerId, status: 'Published' }).lean()
    : [...reviews.values()].filter((item) => String(item.sellerId) === String(sellerId) && item.status === 'Published');
  rows.sort((a, b) => {
    if (sort === 'highest') return b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt);
    if (sort === 'lowest') return a.rating - b.rating || +new Date(b.createdAt) - +new Date(a.createdAt);
    if (sort === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0) || +new Date(b.createdAt) - +new Date(a.createdAt);
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
  const total = rows.length;
  const slice = rows.slice((page - 1) * limit, page * limit);
  const presented = await Promise.all(slice.map(async (item) => {
    const reviewer = await getIdentityRepository().findUserById(String(item.reviewerId));
    const response = await getResponse(String(item._id || item.id));
    return presentReview(item, { reviewerName: reviewer?.name, reviewerAvatar: reviewer?.avatar, response });
  }));
  return { reviews: presented, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary: summarize(rows) };
}

export async function listMyReviews(userId: string) {
  const rows: any[] = connected()
    ? await Review.find({ reviewerId: userId, status: { $ne: 'Removed' } }).sort({ createdAt: -1 }).lean()
    : [...reviews.values()].filter((item) => item.reviewerId === userId && item.status !== 'Removed').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return Promise.all(rows.map(async (item) => presentReview(item, { response: await getResponse(String(item._id || item.id)) })));
}

export async function listReviewsForSellerInbox(sellerId: string) {
  const rows: any[] = connected()
    ? await Review.find({ sellerId, status: 'Published' }).sort({ createdAt: -1 }).lean()
    : [...reviews.values()].filter((item) => item.sellerId === sellerId && item.status === 'Published').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return Promise.all(rows.map(async (item) => {
    const reviewer = await getIdentityRepository().findUserById(String(item.reviewerId));
    return presentReview(item, { reviewerName: reviewer?.name, reviewerAvatar: reviewer?.avatar, response: await getResponse(String(item._id || item.id)) });
  }));
}

export async function markHelpful(userId: string, id: string) {
  const current: any = await getReviewRecord(id);
  if (current.status !== 'Published') throw new AppError(409, 'This review cannot be marked helpful.', 'REVIEW_NOT_PUBLISHED');
  const key = `${userId}:${id}`;
  if (connected()) {
    try {
      await ReviewHelpful.create({ reviewId: current._id || id, userId });
      await Review.updateOne({ _id: current._id }, { $inc: { helpfulCount: 1 } });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
  } else if (!helpful.has(key)) {
    helpful.add(key);
    current.helpfulCount = (current.helpfulCount || 0) + 1;
    reviews.set(String(current.id), current);
  }
  const next = await getReviewRecord(id);
  return { helpful: true, helpfulCount: next.helpfulCount || 0 };
}

export async function respondToReview(sellerId: string, id: string, text: string) {
  const current: any = await getReviewRecord(id);
  if (String(current.sellerId) !== sellerId) throw new AppError(403, 'You can only respond to reviews about your listings.', 'REVIEW_RESPONSE_FORBIDDEN');
  const clean = sanitizePlain(text, 1000);
  if (clean.length < 2) throw new AppError(422, 'Write a short response.', 'REVIEW_RESPONSE_EMPTY');
  const record = { id: crypto.randomUUID(), reviewId: String(current._id || current.id), sellerId, text: clean, createdAt: new Date(), updatedAt: new Date() };
  if (connected()) {
    const existing: any = await ReviewResponse.findOne({ reviewId: current._id }).lean();
    if (existing) {
      const updated: any = await ReviewResponse.findByIdAndUpdate(existing._id, { $set: { text: clean, updatedAt: new Date() } }, { new: true }).lean();
      return { id: String(updated._id), text: updated.text, createdAt: updated.createdAt, updatedAt: updated.updatedAt };
    }
    const created = await ReviewResponse.create({ reviewId: current._id, sellerId, text: clean });
    return { id: String(created._id), text: created.text, createdAt: created.createdAt, updatedAt: created.updatedAt };
  }
  const existing = [...responses.values()].find((item) => item.reviewId === record.reviewId);
  if (existing) { existing.text = clean; existing.updatedAt = new Date(); responses.set(existing.id, existing); return existing; }
  responses.set(record.id, record);
  return record;
}

export async function reportReview(userId: string, id: string, input: { reason: string; description?: string }) {
  const current: any = await getReviewRecord(id);
  if (String(current.reviewerId) === userId) throw new AppError(409, 'You cannot report your own review.', 'OWN_REVIEW_REPORT');
  const description = sanitizePlain(input.description, 1000);
  if (connected()) {
    const open = await ReviewReport.exists({ reviewId: current._id, reporterId: userId, status: { $in: ['pending', 'investigating', 'reviewed'] } });
    if (open) throw new AppError(409, 'You already reported this review.', 'REPORT_EXISTS');
    const created = await ReviewReport.create({ reviewId: current._id, reporterId: userId, reason: input.reason, description });
    return { id: String(created._id), status: created.status };
  }
  const duplicate = [...reports.values()].find((item) => item.reviewId === String(current.id) && item.reporterId === userId && ['pending', 'investigating', 'reviewed'].includes(item.status));
  if (duplicate) throw new AppError(409, 'You already reported this review.', 'REPORT_EXISTS');
  const report = { id: crypto.randomUUID(), reviewId: String(current.id), reporterId: userId, reason: input.reason, description, status: 'pending', createdAt: new Date() };
  reports.set(report.id, report);
  return { id: report.id, status: report.status };
}

export async function adminListReviews(input: any) {
  let rows: any[] = connected() ? await Review.find({}).sort({ createdAt: -1 }).limit(2000).lean() : [...reviews.values()];
  if (input.status) rows = rows.filter((item) => item.status === input.status);
  if (input.search) rows = rows.filter((item) => `${item.title} ${item.comment} ${item.listingId}`.toLowerCase().includes(String(input.search).toLowerCase()));
  const total = rows.length;
  const start = ((input.page || 1) - 1) * (input.limit || 25);
  return { reviews: rows.slice(start, start + (input.limit || 25)).map((item) => presentReview(item)), pagination: { page: input.page || 1, limit: input.limit || 25, total, totalPages: Math.ceil(total / (input.limit || 25)) } };
}

export async function adminSetReviewStatus(id: string, status: string) {
  if (!['Published', 'Pending', 'Hidden', 'Removed'].includes(status)) throw new AppError(422, 'Invalid review status', 'REVIEW_STATUS_INVALID');
  const current: any = await getReviewRecord(id);
  const next = await saveReview(current, { status, updatedAt: new Date() });
  await refreshSellerRating(String(current.sellerId));
  return presentReview(next);
}

export async function adminReviewReports() {
  if (connected()) return ReviewReport.find({}).sort({ createdAt: -1 }).lean();
  return [...reports.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function adminUpdateReviewReport(id: string, status: string) {
  if (connected()) {
    const item = await ReviewReport.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
    if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
    return item;
  }
  const item = reports.get(id);
  if (!item) throw new AppError(404, 'Report not found', 'REPORT_NOT_FOUND');
  item.status = status;
  reports.set(id, item);
  return item;
}

export function summarize(rows: any[]) {
  const published = rows.filter((item) => item.status === 'Published' || !item.status);
  const count = published.length;
  const average = count ? Math.round((published.reduce((sum, item) => sum + Number(item.rating), 0) / count) * 10) / 10 : 0;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
  for (const item of published) distribution[item.rating] = (distribution[item.rating] || 0) + 1;
  return { average, count, distribution };
}

export async function refreshSellerRating(sellerId: string) {
  const rows: any[] = connected()
    ? await Review.find({ sellerId, status: 'Published' }).select('rating').lean()
    : [...reviews.values()].filter((item) => item.sellerId === sellerId && item.status === 'Published');
  const stats = summarize(rows);
  try { await getSellerProfileRepository().update(sellerId, { rating: stats.average, reviewCount: stats.count }); } catch { /* profile may not exist in isolated tests */ }
  return stats;
}

async function getReviewRecord(id: string) {
  const item: any = connected() && mongoose.isValidObjectId(id) ? await Review.findById(id).lean() : reviews.get(id);
  if (!item) throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  return item;
}

async function saveReview(current: any, patch: any) {
  if (connected()) return Review.findByIdAndUpdate(current._id, { $set: patch }, { new: true }).lean();
  const next = { ...current, ...patch };
  reviews.set(String(current.id), next);
  return next;
}

async function getResponse(reviewId: string) {
  const item: any = connected() && mongoose.isValidObjectId(reviewId)
    ? await ReviewResponse.findOne({ reviewId }).lean()
    : [...responses.values()].find((row) => row.reviewId === reviewId);
  return item ? { id: String(item._id || item.id), text: item.text, createdAt: item.createdAt, updatedAt: item.updatedAt } : null;
}

export function __resetReviewMemory() { reviews.clear(); responses.clear(); helpful.clear(); reports.clear(); }
