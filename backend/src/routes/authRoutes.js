import { Router } from 'express';
import { z } from 'zod';
import { AUTH_PURPOSE_VALUES } from '../constants/account.js';
import { authCapabilities, forgotPassword, login, logoutAction, refresh, register, requestOtp, resendOtp, resetPasswordAction, socialProviders, verifyEmailToken, verifyOtpCode } from '../controllers/authController.js';
import { loginRateLimit, otpRateLimit, passwordResetRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const password = z.string().min(10).max(128);
const registration = z.object({
  method: z.enum(['email', 'phone']), name: z.string().trim().min(2).max(100),
  email: z.string().optional(), phone: z.string().optional(), password, confirmPassword: z.string(),
  accountType: z.enum(['customer', 'seller']).default('customer'), country: z.string().trim().length(2).default('PK'),
  province: z.string().trim().max(80).optional().default(''), city: z.string().trim().min(2).max(80), language: z.enum(['en', 'ur']).default('en'),
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
  if (value.method === 'email' && !value.email) context.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Email is required' });
  if (value.method === 'phone' && !value.phone) context.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Phone is required' });
});

export const authRouter = Router();
authRouter.get('/capabilities', authCapabilities);
authRouter.get('/social/providers', socialProviders);
authRouter.post('/register', loginRateLimit, validate(registration), asyncHandler(register));
authRouter.post('/login', loginRateLimit, validate(z.object({ identifier: z.string().min(3).max(200), password: z.string().min(1).max(128), remember: z.boolean().optional().default(false) })), asyncHandler(login));
authRouter.post('/otp/request', otpRateLimit, validate(z.object({ phone: z.string().min(8).max(30) })), asyncHandler(requestOtp));
authRouter.post('/verify-otp', otpRateLimit, validate(z.object({ phone: z.string().min(8).max(30), code: z.string().regex(/^\d{6}$/), purpose: z.enum(AUTH_PURPOSE_VALUES), remember: z.boolean().optional().default(false) })), asyncHandler(verifyOtpCode));
authRouter.post('/resend-otp', otpRateLimit, validate(z.object({ target: z.string().min(3).max(200), purpose: z.enum(AUTH_PURPOSE_VALUES) })), asyncHandler(resendOtp));
authRouter.post('/verify-email', otpRateLimit, validate(z.object({ email: z.string().min(3).max(200), token: z.string().min(20).max(200) })), asyncHandler(verifyEmailToken));
authRouter.post('/forgot-password', passwordResetRateLimit, validate(z.object({ identifier: z.string().min(3).max(200) })), asyncHandler(forgotPassword));
authRouter.post('/reset-password', passwordResetRateLimit, validate(z.object({ identifier: z.string().min(3).max(200), tokenOrCode: z.string().min(6).max(200), password, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })), asyncHandler(resetPasswordAction));
authRouter.post('/refresh', loginRateLimit, asyncHandler(refresh));
authRouter.post('/logout', asyncHandler(logoutAction));
