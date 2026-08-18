import { USER_ROLES } from '../constants/roles.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { recordSecurityEvent } from './securityEventService.js';
import { presentUser } from './userPresenter.js';

export interface SellerProfileInput {
  displayName: string;
  description?: string;
  location?: { country?: string; province?: string; city?: string; area?: string };
  contactPreference?: 'chat' | 'chat_and_call' | 'call';
  accountType?: 'individual' | 'business';
}

const publicSlug = (name: string, userId: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'seller'}-${userId.replaceAll('-', '').slice(0, 6).toLowerCase()}`;
const presentSellerProfile = (profile) => profile ? {
  id: String(profile._id || profile.id),
  userId: String(profile.userId),
  displayName: profile.displayName,
  username: profile.publicSlug,
  description: profile.description || '',
  avatar: profile.avatar || null,
  location: profile.location || {},
  contactPreference: profile.contactPreference || 'chat',
  verificationStatus: profile.verificationStatus || 'not_verified',
  rating: profile.rating || 0,
  reviewCount: profile.reviewCount || 0,
  activeListingCount: profile.activeListingCount || 0,
  soldListingCount: profile.soldListingCount || 0,
  responseRate: profile.responseRate ?? null,
  responseTimeMinutes: profile.responseTimeMinutes ?? null,
  accountType: profile.accountType || 'individual',
  memberSince: profile.createdAt,
  updatedAt: profile.updatedAt,
} : null;

const cleanInput = (input: SellerProfileInput, fallbackLocation: { country?: string; province?: string; city?: string; area?: string } = {}) => ({
  displayName: input.displayName.trim(),
  description: input.description?.trim() || '',
  location: {
    country: input.location?.country?.trim() || fallbackLocation.country || 'PK',
    province: input.location?.province?.trim() || fallbackLocation.province || '',
    city: input.location?.city?.trim() || fallbackLocation.city || '',
    area: input.location?.area?.trim() || fallbackLocation.area || '',
  },
  contactPreference: input.contactPreference || 'chat',
  accountType: input.accountType || 'individual',
});

export async function getOwnSellerProfile(userId: string) {
  const profile = await getSellerProfileRepository().findByUserId(userId);
  if (!profile) throw new AppError(404, 'Seller profile not found', 'SELLER_PROFILE_NOT_FOUND');
  return presentSellerProfile(profile);
}

export async function createSellerProfile(userId: string, input: SellerProfileInput, req) {
  const identityRepository = getIdentityRepository();
  const user = await identityRepository.findUserById(userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  if (await getSellerProfileRepository().findByUserId(userId)) throw new AppError(409, 'Seller profile already exists', 'SELLER_PROFILE_EXISTS');
  const profile = await getSellerProfileRepository().create({ userId, publicSlug: publicSlug(input.displayName, userId), ...cleanInput(input, user.location), avatar: user.avatar || null });
  const roles = [...new Set([...(user.roles || []), USER_ROLES.CUSTOMER, USER_ROLES.SELLER])];
  const updatedUser = await identityRepository.updateUser(userId, { roles, 'seller.status': 'active', 'seller.accountType': input.accountType || 'individual', 'seller.businessName': input.displayName.trim() });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.SELLER_ONBOARDING_COMPLETED, outcome: 'success', metadata: { sellerOnboarding: true } });
  return { user: presentUser(updatedUser), profile: presentSellerProfile(profile) };
}

export async function updateSellerProfile(userId: string, input: Partial<SellerProfileInput>, req) {
  const current = await getSellerProfileRepository().findByUserId(userId);
  if (!current) throw new AppError(404, 'Seller profile not found', 'SELLER_PROFILE_NOT_FOUND');
  const updates: Record<string, unknown> = {};
  if (input.displayName !== undefined) updates.displayName = input.displayName.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.contactPreference !== undefined) updates.contactPreference = input.contactPreference;
  if (input.accountType !== undefined) updates.accountType = input.accountType;
  if (input.location !== undefined) updates.location = cleanInput({ displayName: current.displayName, location: input.location }, current.location).location;
  const profile = await getSellerProfileRepository().update(userId, updates);
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.PROFILE_UPDATED, outcome: 'success', metadata: { sellerProfileFields: Object.keys(updates) } });
  return presentSellerProfile(profile);
}

export async function upsertSellerProfile(userId: string, input: SellerProfileInput) {
  const user = await getIdentityRepository().findUserById(userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  const profile = await getSellerProfileRepository().upsert(userId, { publicSlug: publicSlug(input.displayName, userId), ...cleanInput(input, user.location), avatar: user.avatar || null });
  return presentSellerProfile(profile);
}
