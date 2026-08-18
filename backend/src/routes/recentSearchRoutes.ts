import { Router } from 'express';
import { z } from 'zod';
import { clear, create, index, remove } from '../controllers/recentSearchController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const recentSearchRouter = Router();
recentSearchRouter.use(asyncHandler(authenticate));
recentSearchRouter.get('/', asyncHandler(index));
recentSearchRouter.post('/', validate(z.object({ query: z.string().trim().max(100).optional(), filters: z.record(z.unknown()).optional() }).strict()), asyncHandler(create));
recentSearchRouter.delete('/', asyncHandler(clear));
recentSearchRouter.delete('/:id', asyncHandler(remove));
