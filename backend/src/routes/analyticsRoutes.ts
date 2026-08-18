import { Router } from 'express';
import { z } from 'zod';
import { track } from '../controllers/analyticsController.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyticsRouter = Router();
analyticsRouter.post('/listings/:id/events', optionalAuthenticate, validate(z.object({ type: z.enum(['listing_impression', 'listing_click', 'listing_view', 'favorite_added', 'contact_seller']), placement: z.string().trim().max(40).optional(), clientId: z.string().uuid().optional() }).strict()), asyncHandler(track));
