import { Router } from 'express';
import { add, clear, index } from '../controllers/recentlyViewedController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const recentlyViewedRouter = Router();
recentlyViewedRouter.use(asyncHandler(authenticate));
recentlyViewedRouter.get('/', asyncHandler(index));
recentlyViewedRouter.post('/:listingId', asyncHandler(add));
recentlyViewedRouter.delete('/', asyncHandler(clear));
recentlyViewedRouter.delete('/:listingId', asyncHandler(clear));
