import { Router } from 'express';
import { follow, index, status, unfollow } from '../controllers/followController.js';
import { authenticate } from '../middleware/auth.js';
import { followRateLimit } from '../middleware/authRateLimits.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const followRouter = Router();
followRouter.use(asyncHandler(authenticate));
followRouter.get('/', asyncHandler(index));
followRouter.get('/:sellerId', asyncHandler(status));
followRouter.post('/:sellerId', followRateLimit, asyncHandler(follow));
followRouter.delete('/:sellerId', followRateLimit, asyncHandler(unfollow));
