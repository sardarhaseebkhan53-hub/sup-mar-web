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
export const reviewRateLimit = makeLimiter(60 * 60_000, 12, 'Too many review actions. Try again later.', 'REVIEW_RATE_LIMITED');
export const blockRateLimit = makeLimiter(10 * 60_000, 20, 'Too many block actions. Try again later.', 'BLOCK_RATE_LIMITED');
export const paymentRateLimit = makeLimiter(10 * 60_000, 12, 'Too many payment attempts. Try again later.', 'PAYMENT_RATE_LIMITED');
export const paymentVerifyRateLimit = makeLimiter(5 * 60_000, 20, 'Too many payment checks. Try again shortly.', 'PAYMENT_VERIFY_RATE_LIMITED');
export const promotionRateLimit = makeLimiter(10 * 60_000, 12, 'Too many promotion requests. Try again later.', 'PROMOTION_RATE_LIMITED');
export const adEventRateLimit = makeLimiter(60_000, 60, 'Too many advertising events. Try again later.', 'AD_EVENT_RATE_LIMITED');
export const rewardRateLimit = makeLimiter(60 * 60_000, 10, 'Too many reward requests. Try again later.', 'REWARD_RATE_LIMITED');
export const favoriteRateLimit = makeLimiter(60_000, 40, 'Too many favorite actions. Try again shortly.', 'FAVORITE_RATE_LIMITED');
export const savedSearchRateLimit = makeLimiter(10 * 60_000, 30, 'Too many saved search actions. Try again later.', 'SAVED_SEARCH_RATE_LIMITED');
export const followRateLimit = makeLimiter(10 * 60_000, 30, 'Too many follow actions. Try again later.', 'FOLLOW_RATE_LIMITED');
export const verificationSubmissionRateLimit = makeLimiter(24 * 60 * 60_000, 5, 'Too many verification submissions. Try again later.', 'VERIFICATION_RATE_LIMITED');
export const appealRateLimit = makeLimiter(24 * 60 * 60_000, 5, 'Too many appeal attempts. Try again later.', 'APPEAL_RATE_LIMITED');
export const moderationActionRateLimit = makeLimiter(60_000, 60, 'Too many moderation actions. Try again shortly.', 'MODERATION_RATE_LIMITED');
