import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const hmacSecret = (target, purpose, secret) => crypto.createHmac('sha256', env.otpPepper).update(`${target}:${purpose}:${secret}`).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const randomOtp = () => String(crypto.randomInt(100000, 1000000));
export const hashIp = (ip = '') => (ip ? sha256(`${env.otpPepper}:${ip}`) : '');

export function parseDuration(value, fallbackMs) {
  const match = String(value || '').match(/^(\d+)([smhd])$/);
  if (!match) return fallbackMs;
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2]];
}

export function requestSecurityContext(req) {
  const userAgent = (req.get('user-agent') || '').slice(0, 500);
  let browser = 'Unknown browser';
  if (/Edg\//i.test(userAgent)) browser = 'Edge';
  else if (/Chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//i.test(userAgent)) browser = 'Safari';
  let platform = 'Unknown platform';
  if (/Android/i.test(userAgent)) platform = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) platform = 'iOS';
  else if (/Windows/i.test(userAgent)) platform = 'Windows';
  else if (/Mac OS/i.test(userAgent)) platform = 'macOS';
  else if (/Linux/i.test(userAgent)) platform = 'Linux';
  return {
    userAgent,
    browser,
    platform,
    device: /Mobile|Android|iPhone/i.test(userAgent) ? `${browser} mobile` : `${browser} desktop`,
    ipHash: hashIp(req.ip),
    ipApproximation: 'Approximate location unavailable',
    requestId: req.requestId,
  };
}
