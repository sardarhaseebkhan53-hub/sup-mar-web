import { Router } from 'express';
import { z } from 'zod';
import { confirm, initiate } from '../controllers/accountLinkController.js';
import { authenticate } from '../middleware/auth.js';
import { otpRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const accountLinkRouter = Router();
accountLinkRouter.use(asyncHandler(authenticate));
accountLinkRouter.post('/initiate', otpRateLimit, validate(z.object({ phone: z.string().min(8).max(30), password: z.string().min(1).max(128) })), asyncHandler(initiate));
accountLinkRouter.post('/confirm', otpRateLimit, validate(z.object({ linkRequestId: z.string().min(1), code: z.string().regex(/^\d{6}$/), confirmation: z.literal('LINK ACCOUNTS') })), asyncHandler(confirm));
