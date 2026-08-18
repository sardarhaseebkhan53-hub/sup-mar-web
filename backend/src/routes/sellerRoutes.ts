import { Router } from 'express';
import { z } from 'zod';
import { createProfile, patchProfile, sellerProfile } from '../controllers/sellerController.js';
import { listings as publicListings, show as publicShow } from '../controllers/publicSellerController.js';
import { create as createReview, eligibility as reviewEligible, index as sellerReviews } from '../controllers/reviewController.js';
import { show as trustShow } from '../controllers/trustController.js';
import { reviewRateLimit } from '../middleware/authRateLimits.js';
import { USER_ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const location = z.object({ country: z.string().trim().length(2).optional(), province: z.string().trim().max(80).optional(), city: z.string().trim().max(80).optional(), area: z.string().trim().max(100).optional() }).optional();
const sellerInput = z.object({ displayName: z.string().trim().min(2).max(120), description: z.string().trim().max(1200).optional().default(''), location, contactPreference: z.enum(['chat', 'chat_and_call', 'call']).optional().default('chat'), accountType: z.enum(['individual', 'business']).optional().default('individual'),
  business: z.object({
    name: z.string().trim().max(140).optional(), description: z.string().trim().max(2000).optional(), logo: z.string().max(500).nullable().optional(),
    category: z.string().trim().max(80).optional(), location: z.string().trim().max(160).optional(),
    workingHours: z.array(z.object({ day: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']), open: z.boolean(), from: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/).optional().default(''), to: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/).optional().default('') }).strict()).max(7).optional(),
    contact: z.object({ chat: z.boolean().optional(), call: z.boolean().optional(), email: z.boolean().optional() }).strict().optional(),
    showContactDetails: z.boolean().optional(),
  }).strict().optional(),
  acceptSellerPolicy: z.literal(true) });
export const sellerRouter = Router();
sellerRouter.post('/profile', asyncHandler(authenticate), validate(sellerInput), asyncHandler(createProfile));
sellerRouter.get('/profile', asyncHandler(authenticate), authorize(USER_ROLES.SELLER), asyncHandler(sellerProfile));
sellerRouter.patch('/profile', asyncHandler(authenticate), authorize(USER_ROLES.SELLER), validate(sellerInput.partial()), asyncHandler(patchProfile));
sellerRouter.get('/:username/listings', validate(z.object({ sort: z.enum(['newest','price-asc','price-desc']).default('newest') }), 'query'), asyncHandler(publicListings));
sellerRouter.get('/:username/trust', asyncHandler(trustShow));
sellerRouter.get('/:username/reviews', validate(z.object({ sort: z.enum(['newest','highest','lowest','helpful']).default('newest'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) }), 'query'), asyncHandler(sellerReviews));
sellerRouter.get('/:username/reviews/eligibility', asyncHandler(authenticate), validate(z.object({ listingId: z.string().max(80).optional() }), 'query'), asyncHandler(reviewEligible));
sellerRouter.post('/:username/reviews', asyncHandler(authenticate), reviewRateLimit, validate(z.object({ listingId: z.string().trim().max(80).optional(), rating: z.number().int().min(1).max(5), title: z.string().trim().max(120).optional(), comment: z.string().trim().max(2000).optional() }).strict()), asyncHandler(createReview));
sellerRouter.get('/:username', asyncHandler(publicShow));
