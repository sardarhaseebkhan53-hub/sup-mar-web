import { Router } from 'express';
import { z } from 'zod';
import { create, index, patch, remove, test } from '../controllers/savedSearchController.js';
import { authenticate } from '../middleware/auth.js';
import { savedSearchRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const input = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  query: z.string().trim().max(100).optional(),
  filters: z.record(z.unknown()).optional(),
  categoryId: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  minPrice: z.number().min(0).max(1_000_000_000_000).nullable().optional(),
  maxPrice: z.number().min(0).max(1_000_000_000_000).nullable().optional(),
  condition: z.string().trim().max(80).optional(),
  sort: z.string().trim().max(40).optional(),
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(['instant', 'daily', 'weekly']).optional(),
}).strict();

export const savedSearchRouter = Router();
savedSearchRouter.use(asyncHandler(authenticate));
savedSearchRouter.get('/', asyncHandler(index));
savedSearchRouter.post('/', savedSearchRateLimit, validate(input), asyncHandler(create));
savedSearchRouter.patch('/:id', savedSearchRateLimit, validate(input), asyncHandler(patch));
savedSearchRouter.delete('/:id', savedSearchRateLimit, asyncHandler(remove));
savedSearchRouter.post('/:id/test', savedSearchRateLimit, asyncHandler(test));
