import { Router } from 'express';
import { z } from 'zod';
import { cancel, placement, products } from '../controllers/promotionController.js';
import { authenticate } from '../middleware/auth.js';
import { promotionRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const promotionRouter = Router();
promotionRouter.get('/products', asyncHandler(products));
promotionRouter.get('/placements/:placement', validate(z.object({ category: z.string().regex(/^[a-z0-9-]+$/).optional(), limit: z.coerce.number().int().min(1).max(24).default(12) }), 'query'), asyncHandler(placement));
promotionRouter.post('/:id/cancel', promotionRateLimit, asyncHandler(authenticate), asyncHandler(cancel));
