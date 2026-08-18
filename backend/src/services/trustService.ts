import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { publicSellerStats } from './listingService.js';
import { sellerResponseMetrics } from './messagingService.js';
import { summarize } from './reviewService.js';
import { Review } from '../models/Review.js';
import mongoose from 'mongoose';

const MIN_RATING_COUNT = 5;
const MIN_RESPONSE_SAMPLE = 5;

export async function buildTrustProfile(userId: string, profile: any) {
  const identity = await getIdentityRepository().findUserById(userId);
  const stats = await publicSellerStats(userId);
  const metrics = await sellerResponseMetrics(userId);
  const reviews: any[] = mongoose.connection.readyState === 1
    ? await Review.find({ sellerId: userId, status: 'Published' }).select('rating').lean()
    : [];
  const rating = reviews.length ? summarize(reviews) : { average: profile.rating || 0, count: profile.reviewCount || 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  const memberSince = profile.createdAt || identity?.createdAt;
  const accountAgeDays = memberSince ? Math.max(0, Math.floor((Date.now() - +new Date(memberSince)) / 86400000)) : 0;
  const verified = profile.verificationStatus === 'verified';
  const badges = [
    verified ? { key: 'verified', label: 'Verified Seller', tone: 'verified' } : null,
    rating.count >= MIN_RATING_COUNT && rating.average >= 4.5 ? { key: 'highly-rated', label: 'Highly Rated', tone: 'rating' } : null,
    metrics.responseTimeMinutes != null && metrics.sample >= MIN_RESPONSE_SAMPLE && metrics.responseTimeMinutes <= 120 ? { key: 'fast', label: 'Fast Responder', tone: 'response' } : null,
    (stats.activeListings || 0) >= 3 ? { key: 'active', label: 'Active Seller', tone: 'active' } : null,
  ].filter(Boolean);
  return {
    sellerId: userId,
    username: profile.publicSlug,
    displayName: profile.displayName,
    avatar: profile.avatar || null,
    accountAgeDays,
    memberSince,
    verificationStatus: mapVerification(profile.verificationStatus),
    verified,
    activeListings: stats.activeListings || 0,
    soldListings: stats.soldListings || 0,
    completedTransactions: stats.soldListings || 0,
    responseRate: metrics.responseRate,
    responseTimeMinutes: metrics.responseTimeMinutes,
    responseLabel: responseLabel(metrics),
    rating: rating.average,
    reviewCount: rating.count,
    distribution: rating.distribution,
    badges,
    safetyStatus: profile.safetyStatus || 'normal',
    accountType: profile.accountType || 'individual',
  };
}

export function mapVerification(status?: string) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return 'Unverified';
}

function responseLabel(metrics: { sample: number; responseRate: number | null; responseTimeMinutes: number | null }) {
  if (metrics.sample < MIN_RESPONSE_SAMPLE || metrics.responseTimeMinutes == null) return null;
  const hours = Math.max(1, Math.round(metrics.responseTimeMinutes / 60));
  return hours <= 1 ? 'Usually responds within 1 hour' : `Usually responds within ${hours} hours`;
}

export async function getTrustByUsername(username: string) {
  const profile = await getSellerProfileRepository().findByPublicSlug(username);
  if (!profile) return null;
  return buildTrustProfile(String(profile.userId), profile);
}
