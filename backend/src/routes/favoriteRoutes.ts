import { Router } from 'express';
import { z } from 'zod';
import { add, bulkRemove, index, merge, priceAlert, remove, status } from '../controllers/favoriteController.js';
import { authenticate } from '../middleware/auth.js';
import { favoriteRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const favoriteRouter = Router();
favoriteRouter.use(asyncHandler(authenticate));
favoriteRouter.get('/', asyncHandler(index));
favoriteRouter.post('/merge', favoriteRateLimit, validate(z.object({ listingIds: z.array(z.string().min(3).max(80)).max(40) }).strict()), asyncHandler(merge));
favoriteRouter.post('/bulk-delete', favoriteRateLimit, validate(z.object({ listingIds: z.array(z.string().min(3).max(80)).max(50) }).strict()), asyncHandler(bulkRemove));
favoriteRouter.get('/:listingId', asyncHandler(status));
favoriteRouter.post('/:listingId', favoriteRateLimit, asyncHandler(add));
favoriteRouter.delete('/:listingId', favoriteRateLimit, asyncHandler(remove));
favoriteRouter.patch('/:listingId', favoriteRateLimit, validate(z.object({ priceAlertEnabled: z.boolean().optional(), enabled: z.boolean().optional() }).strict()), asyncHandler(priceAlert));
