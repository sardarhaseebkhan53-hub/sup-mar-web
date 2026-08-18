import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { referralRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { attribute, createCode, history, myReferral, adminList, evaluate, trackReferralLinkView } from '../controllers/referralController.js';
import { USER_ROLES } from '../constants/roles.js';

export const referralRouter = Router();

const codeSchema = z.object({ customCode: z.string().trim().min(3).max(24).optional() }).strict();
const attributeSchema = z.object({ code: z.string().trim().min(3).max(32), method: z.enum(['link','code','manual']).default('code') }).strict();

referralRouter.get('/link/:code', referralRateLimit, asyncHandler(trackReferralLinkView));

referralRouter.use(asyncHandler(authenticate));

referralRouter.get('/', referralRateLimit, asyncHandler(myReferral));
referralRouter.get('/history', referralRateLimit, asyncHandler(history));
referralRouter.post('/code', referralRateLimit, validate(codeSchema), asyncHandler(createCode));
referralRouter.post('/attribute', referralRateLimit, validate(attributeSchema), asyncHandler(attribute));
referralRouter.post('/evaluate', referralRateLimit, asyncHandler(evaluate));

// Admin list
referralRouter.get('/admin/list', authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MODERATOR, USER_ROLES.FINANCE), asyncHandler(adminList));
