import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { recordSecurityEvent } from './securityEventService.js';
import { presentUser } from './userPresenter.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const sign = (parameters: Record<string, string | number>) => {
  const canonical = Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('&');
  return crypto.createHash('sha1').update(`${canonical}${env.media.apiSecret}`).digest('hex');
};
const assertConfigured = () => {
  if (env.media.provider !== 'cloudinary' || !env.media.cloudName || !env.media.apiKey || !env.media.apiSecret) {
    throw new AppError(503, 'Profile image storage is not configured for this environment', 'MEDIA_PROVIDER_UNAVAILABLE');
  }
};

export function createAvatarUploadIntent(userId: string, input: { fileName: string; fileType: string; fileSize: number }) {
  assertConfigured();
  if (!allowedTypes.has(input.fileType)) throw new AppError(422, 'Use a JPEG, PNG, or WebP profile image', 'AVATAR_TYPE_INVALID');
  if (input.fileSize <= 0 || input.fileSize > env.media.avatarMaxBytes) throw new AppError(422, `Profile images must be smaller than ${Math.floor(env.media.avatarMaxBytes / 1024 / 1024)} MB`, 'AVATAR_SIZE_INVALID');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `qavlio/avatars/${userId}`;
  const transformation = 'c_limit,h_1024,w_1024';
  const allowed_formats = 'jpg,jpeg,png,webp';
  return {
    provider: 'cloudinary',
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.media.cloudName}/image/upload`,
    fields: { api_key: env.media.apiKey, timestamp, folder, transformation, allowed_formats, signature: sign({ allowed_formats, folder, timestamp, transformation }) },
    constraints: { allowedTypes: [...allowedTypes], maxBytes: env.media.avatarMaxBytes },
  };
}

async function destroyCloudinaryAsset(publicId: string | null | undefined) {
  if (!publicId || env.media.provider !== 'cloudinary') return;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: env.media.apiKey, signature: sign({ public_id: publicId, timestamp }) });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.media.cloudName}/image/destroy`, { method: 'POST', body });
  if (!response.ok) throw new AppError(502, 'The previous profile image could not be removed from storage', 'MEDIA_DELETE_FAILED');
}

export async function completeAvatarUpload(userId: string, input: { secureUrl: string; publicId: string; version: number; signature: string }, req) {
  assertConfigured();
  const expected = sign({ public_id: input.publicId, version: input.version });
  const validSignature = input.signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(input.signature), Buffer.from(expected));
  let url: URL;
  try { url = new URL(input.secureUrl); } catch { throw new AppError(422, 'The uploaded profile image URL is invalid', 'AVATAR_UPLOAD_UNVERIFIED'); }
  if (!validSignature || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !input.publicId.startsWith(`qavlio/avatars/${userId}/`)) {
    throw new AppError(422, 'The uploaded profile image could not be verified', 'AVATAR_UPLOAD_UNVERIFIED');
  }
  const repository = getIdentityRepository();
  const current = await repository.findUserById(userId);
  if (!current) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  if (current.avatarKey && current.avatarKey !== input.publicId) await destroyCloudinaryAsset(current.avatarKey);
  const user = await repository.updateUser(userId, { avatar: input.secureUrl, avatarKey: input.publicId });
  const sellerProfile = await getSellerProfileRepository().findByUserId(userId);
  if (sellerProfile) await getSellerProfileRepository().update(userId, { avatar: input.secureUrl });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.AVATAR_UPDATED, outcome: 'success', metadata: { avatarUpdated: true } });
  return presentUser(user);
}

export async function removeAvatar(userId: string, req) {
  const repository = getIdentityRepository();
  const current = await repository.findUserById(userId);
  if (!current) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  await destroyCloudinaryAsset(current.avatarKey);
  const user = await repository.updateUser(userId, { avatar: null, avatarKey: null });
  const sellerProfile = await getSellerProfileRepository().findByUserId(userId);
  if (sellerProfile) await getSellerProfileRepository().update(userId, { avatar: null });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.AVATAR_UPDATED, outcome: 'success', metadata: { avatarRemoved: true } });
  return presentUser(user);
}
