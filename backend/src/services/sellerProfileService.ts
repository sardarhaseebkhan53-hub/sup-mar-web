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
  business?: {
    name?: string;
    description?: string;
    logo?: string | null;
    category?: string;
    location?: string;
    workingHours?: Array<{ day: string; open: boolean; from?: string; to?: string }>;
    contact?: { chat?: boolean; call?: boolean; email?: boolean };
    showContactDetails?: boolean;
  };
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** Phase 17 §41–43 — business profile fields, sanitized. */
function cleanBusiness(input: any) {
  if (!input || typeof input !== 'object') return undefined;
  const clean: any = {};
  if (typeof input.name === 'string') clean.name = input.name.trim().slice(0, 140);
  if (typeof input.description === 'string') clean.description = input.description.trim().slice(0, 2000);
  if (typeof input.logo === 'string') clean.logo = input.logo.slice(0, 500);
  if (typeof input.category === 'string') clean.category = input.category.trim().slice(0, 80);
  if (typeof input.location === 'string') clean.location = input.location.trim().slice(0, 160);
  if (Array.isArray(input.workingHours)) {
    clean.workingHours = input.workingHours
      .filter((row: any) => row && DAYS.includes(String(row.day).toLowerCase()))
      .slice(0, 7)
      .map((row: any) => ({
        day: String(row.day).toLowerCase(),
        open: Boolean(row.open),
        from: typeof row.from === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.from) ? row.from : '',
        to: typeof row.to === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.to) ? row.to : '',
      }));
  }
  if (input.contact && typeof input.contact === 'object') {
    clean.contact = {
      ...(typeof input.contact.chat === 'boolean' && { chat: input.contact.chat }),
      ...(typeof input.contact.call === 'boolean' && { call: input.contact.call }),
      ...(typeof input.contact.email === 'boolean' && { email: input.contact.email }),
    };
  }
  if (typeof input.showContactDetails === 'boolean') clean.showContactDetails = input.showContactDetails;
  return Object.keys(clean).length ? clean : undefined;
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
  business: profile.business ? {
    name: profile.business.name || '',
    description: profile.business.description || '',
    logo: profile.business.logo || null,
    category: profile.business.category || '',
    location: profile.business.location || '',
    workingHours: (profile.business.workingHours || []).map((row: any) => ({ day: row.day, open: Boolean(row.open), from: row.from || '', to: row.to || '' })),
    contact: { chat: profile.business.contact?.chat !== false, call: Boolean(profile.business.contact?.call), email: Boolean(profile.business.contact?.email) },
    showContactDetails: profile.business.showContactDetails !== false,
  } : null,
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
  const business = cleanBusiness(input.business);
  if (business) {
    const merged = { ...(current.business || {}), ...business };
    if (input.accountType === 'individual') business.workingHours = []; // casual sellers don't publish business hours
    updates.business = input.accountType === 'individual' ? { ...merged, workingHours: [] } : merged;
  }
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
