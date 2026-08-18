import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { shareRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listingShares, sellerShares, shareListing } from '../controllers/shareController.js';

export const shareRouter = Router();

const shareSchema = z.object({
  method: z.enum(['copy','native','whatsapp','facebook','twitter','link','other']).optional().default('copy'),
  referralCode: z.string().trim().max(32).optional().nullable(),
}).strict();

shareRouter.post('/listings/:id/share', shareRateLimit, validate(shareSchema), asyncHandler(shareListing));
shareRouter.get('/listings/:id/shares', asyncHandler(listingShares));

// Seller shares require auth
shareRouter.get('/seller/shares', asyncHandler(authenticate), asyncHandler(sellerShares));
