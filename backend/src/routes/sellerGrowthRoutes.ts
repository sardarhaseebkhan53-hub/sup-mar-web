import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { growthRateLimit } from '../middleware/authRateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sellerAnalytics, sellerCampaigns } from '../controllers/growthController.js';
import { USER_ROLES } from '../constants/roles.js';

export const sellerGrowthRouter = Router();

sellerGrowthRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.SELLER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN));

sellerGrowthRouter.get('/campaigns', growthRateLimit, asyncHandler(sellerCampaigns));
sellerGrowthRouter.get('/analytics', growthRateLimit, asyncHandler(sellerAnalytics));
