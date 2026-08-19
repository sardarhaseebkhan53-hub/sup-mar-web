import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { growthRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analytics, campaignAnalytics, couponAnalytics, getSettings, patchSettings, referralAnalytics, shareAnalytics, topCampaigns } from '../controllers/growthController.js';
import { USER_ROLES } from '../constants/roles.js';
import { adminList as referralAdminList } from '../controllers/referralController.js';

export const adminGrowthRouter = Router();

// Growth analytics - admin only
adminGrowthRouter.use(asyncHandler(authenticateAdmin), authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE, USER_ROLES.MODERATOR));

adminGrowthRouter.get('/analytics', growthRateLimit, validate(z.object({ range: z.enum(['today','7d','30d','90d']).default('30d') }).strict(), 'query'), asyncHandler(analytics));
adminGrowthRouter.get('/analytics/referrals', growthRateLimit, validate(z.object({ range: z.enum(['today','7d','30d','90d']).default('30d') }).strict(), 'query'), asyncHandler(referralAnalytics));
adminGrowthRouter.get('/analytics/coupons', growthRateLimit, validate(z.object({ range: z.enum(['today','7d','30d','90d']).default('30d') }).strict(), 'query'), asyncHandler(couponAnalytics));
adminGrowthRouter.get('/analytics/campaigns', growthRateLimit, validate(z.object({ range: z.enum(['today','7d','30d','90d']).default('30d'), sellerId: z.string().optional() }).strict(), 'query'), asyncHandler(campaignAnalytics));
adminGrowthRouter.get('/analytics/shares', growthRateLimit, asyncHandler(shareAnalytics));
adminGrowthRouter.get('/analytics/top-campaigns', growthRateLimit, validate(z.object({ metric: z.enum(['conversions','revenue','ctr','redemptions']).default('conversions'), page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(50).optional() }).strict(), 'query'), asyncHandler(topCampaigns));

adminGrowthRouter.get('/referrals', growthRateLimit, validate(z.object({ status: z.enum(['pending','eligible','rewarded','rejected','expired']).optional(), suspicious: z.enum(['true','false']).optional(), referrerId: z.string().optional(), page: z.coerce.number().min(1).optional(), limit: z.coerce.number().min(1).max(100).optional() }).strict(), 'query'), asyncHandler(referralAdminList));

adminGrowthRouter.get('/settings', asyncHandler(getSettings));
adminGrowthRouter.patch('/settings', growthRateLimit, asyncHandler(patchSettings));

// Seller-scoped growth analytics via admin (for support)
adminGrowthRouter.get('/seller/:sellerId/analytics', growthRateLimit, asyncHandler(async (req,res)=>{
  req.query.sellerId = req.params.sellerId;
  return campaignAnalytics(req,res);
}));
