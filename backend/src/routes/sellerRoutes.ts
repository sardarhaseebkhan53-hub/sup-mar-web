import { Router } from 'express';
import { z } from 'zod';
import { createProfile, patchProfile, sellerProfile } from '../controllers/sellerController.js';
import { USER_ROLES } from '../constants/roles.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const location = z.object({ country: z.string().trim().length(2).optional(), province: z.string().trim().max(80).optional(), city: z.string().trim().max(80).optional(), area: z.string().trim().max(100).optional() }).optional();
const sellerInput = z.object({
  displayName: z.string().trim().min(2).max(120), description: z.string().trim().max(1200).optional().default(''), location,
  contactPreference: z.enum(['chat', 'chat_and_call', 'call']).optional().default('chat'), accountType: z.enum(['individual', 'business']).optional().default('individual'), acceptSellerPolicy: z.literal(true),
});

export const sellerRouter = Router();
sellerRouter.use(asyncHandler(authenticate));
sellerRouter.post('/profile', validate(sellerInput), asyncHandler(createProfile));
sellerRouter.get('/profile', authorize(USER_ROLES.SELLER), asyncHandler(sellerProfile));
sellerRouter.patch('/profile', authorize(USER_ROLES.SELLER), validate(sellerInput.partial()), asyncHandler(patchProfile));
