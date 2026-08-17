import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { avatarComplete, avatarIntent, avatarRemove, deleteAccount, deleteMe, me, patchMe, patchNotificationPreferences, patchPassword, removeAllSessions, removePhone, removeSession, sellerOnboarding, sendEmailVerification, sendPhoneVerification, sessions, verificationStatus } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { mediaIntentRateLimit, otpRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const strongPassword = z.string().min(env.security.passwordMinLength).max(128)
  .regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number').regex(/[^A-Za-z0-9]/, 'Add a special character');
const profileUpdate = z.object({
  name: z.string().trim().min(2).max(100).optional(), username: z.string().regex(/^[a-z0-9._]{3,40}$/).optional(), about: z.string().trim().max(1000).optional(), language: z.enum(['en', 'ur']).optional(),
  location: z.object({ country: z.string().trim().length(2).optional(), province: z.string().trim().max(80).optional(), city: z.string().trim().max(80).optional(), area: z.string().trim().max(100).optional() }).optional(),
  privacy: z.object({ profileVisibility: z.enum(['public', 'registered', 'private']).optional(), contactPreference: z.enum(['chat', 'chat_and_call', 'call']).optional() }).optional(),
});
const passwordUpdate = z.object({ currentPassword: z.string().min(1), password: strongPassword, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
const deactivateInput = z.object({ password: z.string().min(1), confirmation: z.literal('DELETE') });
const deleteInput = z.object({ password: z.string().min(1), confirmation: z.literal('DELETE ACCOUNT') });

export const userRouter = Router();
userRouter.use(asyncHandler(authenticate));
userRouter.get('/me', asyncHandler(me));
userRouter.patch('/me', validate(profileUpdate), asyncHandler(patchMe));
userRouter.patch('/me/password', validate(passwordUpdate), asyncHandler(patchPassword));
userRouter.delete('/me', validate(deactivateInput), asyncHandler(deleteMe));
// Phase 2 contract aliases; the /me resources remain backward compatible.
userRouter.get('/profile', asyncHandler(me));
userRouter.patch('/profile', validate(profileUpdate), asyncHandler(patchMe));
userRouter.patch('/password', validate(passwordUpdate), asyncHandler(patchPassword));
userRouter.delete('/account', validate(deleteInput), asyncHandler(deleteAccount));

userRouter.get('/verification/status', asyncHandler(verificationStatus));
userRouter.post('/verification/phone', otpRateLimit, validate(z.object({ phone: z.string().min(8).max(30) })), asyncHandler(sendPhoneVerification));
userRouter.post('/verification/email', otpRateLimit, validate(z.object({ email: z.string().email().max(200) })), asyncHandler(sendEmailVerification));
userRouter.delete('/verification/phone', validate(z.object({ password: z.string().min(1).max(128) })), asyncHandler(removePhone));
userRouter.patch('/me/seller-onboarding', validate(z.object({
  accountType: z.enum(['individual', 'business']), businessName: z.string().max(120).optional().default(''), displayName: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1200).optional().default(''), location: z.object({ country: z.string().length(2).optional(), province: z.string().max(80).optional(), city: z.string().max(80).optional(), area: z.string().max(100).optional() }).optional(),
  contactPreference: z.enum(['chat', 'chat_and_call', 'call']).optional().default('chat'), acceptSellerPolicy: z.literal(true),
})), asyncHandler(sellerOnboarding));

userRouter.post('/avatar/upload-intent', mediaIntentRateLimit, validate(z.object({ fileName: z.string().trim().min(1).max(180), fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']), fileSize: z.number().int().positive() })), asyncHandler(avatarIntent));
userRouter.post('/avatar/complete', mediaIntentRateLimit, validate(z.object({ secureUrl: z.string().url().max(1000), publicId: z.string().min(10).max(500), version: z.number().int().positive(), signature: z.string().regex(/^[a-f0-9]{40}$/i) })), asyncHandler(avatarComplete));
userRouter.delete('/avatar', asyncHandler(avatarRemove));

userRouter.get('/sessions', asyncHandler(sessions));
userRouter.delete('/sessions/all', asyncHandler(removeAllSessions));
userRouter.delete('/sessions/:id', asyncHandler(removeSession));
userRouter.patch('/notification-preferences', validate(z.object({
  inApp: z.boolean().optional(), email: z.boolean().optional(), push: z.boolean().optional(), sms: z.boolean().optional(), security: z.boolean().optional(), marketing: z.boolean().optional(),
  messages: z.boolean().optional(), listingUpdates: z.boolean().optional(), account: z.boolean().optional(), promotions: z.boolean().optional(), announcements: z.boolean().optional(),
})), asyncHandler(patchNotificationPreferences));
