import { Router } from 'express';
import { z } from 'zod';
import { adminLogin, adminLogout, adminMe, adminRefresh } from '../controllers/adminAuthController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { loginRateLimit, sessionRefreshRateLimit } from '../middleware/authRateLimits.js';
import { requireTrustedOrigin } from '../middleware/originGuard.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Administrator authentication.
 *
 * Completely separate from the marketplace /auth routes: username + password only,
 * no phone normalization, no OTP challenge, no marketplace profile verification.
 */
export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  requireTrustedOrigin,
  loginRateLimit,
  validate(z.object({
    username: z.string().trim().min(2).max(120),
    password: z.string().min(1).max(200),
    remember: z.boolean().optional().default(false),
  })),
  asyncHandler(adminLogin),
);
adminAuthRouter.post('/refresh', requireTrustedOrigin, sessionRefreshRateLimit, asyncHandler(adminRefresh));
adminAuthRouter.post('/logout', requireTrustedOrigin, asyncHandler(adminLogout));
adminAuthRouter.get('/me', asyncHandler(authenticateAdmin), asyncHandler(adminMe));
