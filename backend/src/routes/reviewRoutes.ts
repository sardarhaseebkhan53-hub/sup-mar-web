import { Router } from 'express';
import { z } from 'zod';
import { helpful, mine, patch, remove, report, respond } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { reportRateLimit, reviewRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reviewRouter = Router();
reviewRouter.get('/mine', asyncHandler(authenticate), asyncHandler(mine));
reviewRouter.patch('/:id', asyncHandler(authenticate), reviewRateLimit, validate(z.object({ rating: z.number().int().min(1).max(5).optional(), title: z.string().trim().max(120).optional(), comment: z.string().trim().max(2000).optional() }).strict()), asyncHandler(patch));
reviewRouter.delete('/:id', asyncHandler(authenticate), reviewRateLimit, asyncHandler(remove));
reviewRouter.post('/:id/helpful', asyncHandler(authenticate), reviewRateLimit, asyncHandler(helpful));
reviewRouter.post('/:id/response', asyncHandler(authenticate), reviewRateLimit, validate(z.object({ text: z.string().trim().min(2).max(1000) }).strict()), asyncHandler(respond));
reviewRouter.post('/:id/report', asyncHandler(authenticate), reportRateLimit, validate(z.object({ reason: z.enum(['spam', 'fake', 'fake-review', 'abuse', 'harassment', 'offensive', 'off-topic', 'manipulation', 'personal-information', 'other']), description: z.string().trim().max(1000).optional().default('') }).strict()), asyncHandler(report));
