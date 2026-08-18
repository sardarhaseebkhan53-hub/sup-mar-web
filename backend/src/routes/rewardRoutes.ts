import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rewardClaimRateLimit } from '../middleware/authRateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { myRewards, rewardsBalance } from '../controllers/rewardController.js';

export const rewardRouter = Router();

rewardRouter.use(asyncHandler(authenticate));

rewardRouter.get('/', rewardClaimRateLimit, asyncHandler(myRewards));
rewardRouter.get('/balance', rewardClaimRateLimit, asyncHandler(rewardsBalance));
