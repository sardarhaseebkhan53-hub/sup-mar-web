import { Router } from 'express';
import { z } from 'zod';
import { campaignRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicList, getBySlug, trackView, trackClick, countdown, funnel } from '../controllers/campaignController.js';
import { authenticate } from '../middleware/auth.js';

export const campaignRouter = Router();

campaignRouter.get('/', asyncHandler(publicList));
campaignRouter.get('/slug/:slug', asyncHandler(getBySlug));
campaignRouter.get('/countdown/:slug', asyncHandler(countdown));

// Authenticated tracking
campaignRouter.post('/:id/view', campaignRateLimit, asyncHandler(trackView));
campaignRouter.post('/:id/click', campaignRateLimit, validate(z.object({ type: z.string().min(1).max(50).optional(), listingId: z.string().optional(), placement: z.string().optional() }).strict()), asyncHandler(trackClick));

// Funnel - allow public but maybe auth for admin
campaignRouter.get('/:id/funnel', asyncHandler(funnel));
