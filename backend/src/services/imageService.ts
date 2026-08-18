import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 8 * 1024 * 1024;
const sign = (parameters: Record<string, string | number>) => {
  const canonical = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  return crypto.createHash('sha1').update(`${canonical}${env.media.apiSecret}`).digest('hex');
};
const configured = () => env.media.provider === 'cloudinary' && env.media.cloudName && env.media.apiKey && env.media.apiSecret;

export function createListingUploadIntent(userId: string, input: { fileName: string; fileType: string; fileSize: number }) {
  if (!allowedTypes.has(input.fileType)) throw new AppError(422, 'Use JPG, PNG, or WebP listing photos', 'LISTING_IMAGE_TYPE_INVALID');
  if (input.fileSize <= 0 || input.fileSize > maxBytes) throw new AppError(422, 'Each listing photo must be 8 MB or smaller', 'LISTING_IMAGE_SIZE_INVALID');
  if (!configured()) throw new AppError(503, 'Listing image storage is not configured in this environment', 'MEDIA_PROVIDER_UNAVAILABLE');
  const timestamp = Math.floor(Date.now() / 1000); const folder = `qavlio/listings/${userId}`;
  const transformation = 'c_limit,h_1600,w_1600,q_auto:good,f_auto'; const allowed_formats = 'jpg,jpeg,png,webp';
  return { provider: 'cloudinary', uploadUrl: `https://api.cloudinary.com/v1_1/${env.media.cloudName}/image/upload`, fields: { api_key: env.media.apiKey, timestamp, folder, transformation, allowed_formats, signature: sign({ allowed_formats, folder, timestamp, transformation }) }, constraints: { allowedTypes: [...allowedTypes], maxBytes, maxImages: 12 } };
}

export function createMessageUploadIntent(userId: string, input: { fileName: string; fileType: string; fileSize: number }) {
  if (!allowedTypes.has(input.fileType)) throw new AppError(422, 'Use JPG, PNG, or WebP attachments', 'MESSAGE_IMAGE_TYPE_INVALID');
  if (input.fileSize <= 0 || input.fileSize > 5 * 1024 * 1024) throw new AppError(422, 'Each attachment must be 5 MB or smaller', 'MESSAGE_IMAGE_SIZE_INVALID');
  if (!configured()) throw new AppError(503, 'Message image storage is not configured in this environment', 'MEDIA_PROVIDER_UNAVAILABLE');
  const timestamp = Math.floor(Date.now() / 1000); const folder = `qavlio/messages/${userId}`; const transformation = 'c_limit,h_1400,w_1400,q_auto:good,f_auto'; const allowed_formats = 'jpg,jpeg,png,webp';
  return { provider: 'cloudinary', uploadUrl: `https://api.cloudinary.com/v1_1/${env.media.cloudName}/image/upload`, fields: { api_key: env.media.apiKey, timestamp, folder, transformation, allowed_formats, signature: sign({ allowed_formats, folder, timestamp, transformation }) }, constraints: { allowedTypes: [...allowedTypes], maxBytes: 5 * 1024 * 1024, maxAttachments: 5 } };
}

export function createAdUploadIntent(adminId:string,input:{fileName:string;fileType:string;fileSize:number}){if(!allowedTypes.has(input.fileType))throw new AppError(422,'Use JPG, PNG, or WebP advertising images','AD_IMAGE_TYPE_INVALID');if(input.fileSize<=0||input.fileSize>10*1024*1024)throw new AppError(422,'Advertisement images must be 10 MB or smaller','AD_IMAGE_SIZE_INVALID');if(!configured())throw new AppError(503,'Advertisement image storage is not configured','MEDIA_PROVIDER_UNAVAILABLE');const timestamp=Math.floor(Date.now()/1000),folder=`qavlio/advertisements/${adminId}`,transformation='c_limit,h_1600,w_2400,q_auto:good,f_auto',allowed_formats='jpg,jpeg,png,webp';return{provider:'cloudinary',uploadUrl:`https://api.cloudinary.com/v1_1/${env.media.cloudName}/image/upload`,fields:{api_key:env.media.apiKey,timestamp,folder,transformation,allowed_formats,signature:sign({allowed_formats,folder,timestamp,transformation})},constraints:{allowedTypes:[...allowedTypes],maxBytes:10*1024*1024}}}

export function verifyMessageAttachments(userId: string, attachments: Array<{ url: string; key: string; mimeType: string }>) {
  if (attachments.length > 5) throw new AppError(422, 'Add no more than 5 images', 'MESSAGE_ATTACHMENTS_LIMIT');
  for (const image of attachments) { let url: URL; try { url = new URL(image.url); } catch { throw new AppError(422, 'An attachment URL is invalid', 'MESSAGE_IMAGE_UNVERIFIED'); } if (!allowedTypes.has(image.mimeType) || (configured() && (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !image.key.startsWith(`qavlio/messages/${userId}/`)))) throw new AppError(422, 'An attachment could not be verified', 'MESSAGE_IMAGE_UNVERIFIED'); }
}

export function verifyListingMedia(userId: string, media: Array<{ url: string; key: string }>) {
  if (!media.length) return;
  for (const image of media) {
    let url: URL; try { url = new URL(image.url); } catch { throw new AppError(422, 'A listing image URL is invalid', 'LISTING_IMAGE_UNVERIFIED'); }
    if (configured() && (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !image.key.startsWith(`qavlio/listings/${userId}/`))) throw new AppError(422, 'A listing image could not be verified', 'LISTING_IMAGE_UNVERIFIED');
  }
}
