import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const makeLimiter = (windowMs, limit, message, code) => rateLimit({
  windowMs,
  limit: env.nodeEnv === 'test' ? Math.max(limit, 100) : limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, message, code }),
});

export const loginRateLimit = makeLimiter(15 * 60_000, 12, 'Too many sign-in attempts. Try again later.', 'LOGIN_RATE_LIMITED');
export const otpRateLimit = makeLimiter(10 * 60_000, 8, 'Too many verification requests. Try again later.', 'OTP_RATE_LIMITED');
export const passwordResetRateLimit = makeLimiter(60 * 60_000, 6, 'Too many recovery requests. Try again later.', 'RECOVERY_RATE_LIMITED');
export const mediaIntentRateLimit = makeLimiter(60 * 60_000, 20, 'Too many image upload attempts. Try again later.', 'MEDIA_RATE_LIMITED');
export const messageRateLimit = makeLimiter(60_000, 40, 'You are sending messages too quickly. Try again shortly.', 'MESSAGE_RATE_LIMITED');
export const conversationRateLimit = makeLimiter(10 * 60_000, 30, 'Too many conversation actions. Try again later.', 'CONVERSATION_RATE_LIMITED');
export const reportRateLimit = makeLimiter(60 * 60_000, 10, 'Too many reports. Try again later.', 'REPORT_RATE_LIMITED');
