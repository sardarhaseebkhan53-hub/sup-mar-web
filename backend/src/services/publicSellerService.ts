import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { listPublicListingsBySeller } from './listingService.js';
import { buildTrustProfile } from './trustService.js';

const present = async (profile: any) => {
  if (!profile.publicSlug) {
    profile.publicSlug = `${String(profile.displayName || 'seller').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${String(profile.userId).replaceAll('-', '').slice(0, 6).toLowerCase()}`;
    await getSellerProfileRepository().update(String(profile.userId), { publicSlug: profile.publicSlug });
  }
  if (!profile?.isActive && profile?.isActive !== undefined) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
  const trust = await buildTrustProfile(String(profile.userId), profile);
  return {
    id: String(profile.userId),
    username: profile.publicSlug,
    displayName: profile.displayName,
    description: profile.description || '',
    avatar: profile.avatar || null,
    location: { country: profile.location?.country || 'PK', province: profile.location?.province || '', city: profile.location?.city || '' },
    verificationStatus: profile.verificationStatus || 'not_verified',
    rating: trust.rating,
    reviewCount: trust.reviewCount,
    responseRate: trust.responseRate,
    responseLabel: trust.responseLabel,
    accountType: profile.accountType || 'individual',
    memberSince: profile.createdAt,
    badges: trust.badges,
    verified: trust.verified,
    safetyStatus: trust.safetyStatus,
    distribution: trust.distribution,
    activeListings: trust.activeListings,
    soldListings: trust.soldListings,
  };
};

export async function getPublicSeller(username: string) {
  const profile = await getSellerProfileRepository().findByPublicSlug(username);
  if (!profile) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
  return present(profile);
}

export async function getPublicSellerByUserId(userId: string) {
  const profile = await getSellerProfileRepository().findByUserId(userId);
  return profile ? present(profile) : null;
}

export async function getPublicSellerListings(username: string, sort: string) {
  const profile = await getSellerProfileRepository().findByPublicSlug(username);
  if (!profile) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');
  return listPublicListingsBySeller(String(profile.userId), sort);
}
