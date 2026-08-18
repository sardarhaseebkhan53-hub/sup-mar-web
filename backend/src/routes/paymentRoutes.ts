import { Router } from 'express';
import { z } from 'zod';
import { create, show, verify, webhook } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { paymentRateLimit, paymentVerifyRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSchema = z.object({
  type: z.enum(['listing_fee', 'promotion', 'package']),
  listingId: z.string().min(3).max(100).optional(),
  promotionProductKey: z.string().max(80).optional(),
  packageId: z.string().min(1).max(100).optional(),
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.type === 'package' && !value.packageId) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Package is required', path: ['packageId'] });
  if (value.type !== 'package' && !value.listingId) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Listing is required', path: ['listingId'] });
  if (value.type === 'promotion' && !value.promotionProductKey) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Promotion is required', path: ['promotionProductKey'] });
});
export const paymentRouter = Router();
paymentRouter.post('/webhook', asyncHandler(webhook));
paymentRouter.use(asyncHandler(authenticate));
paymentRouter.post('/create', paymentRateLimit, validate(createSchema), asyncHandler(create));
paymentRouter.get('/:id', asyncHandler(show));
paymentRouter.post('/:id/verify', paymentVerifyRateLimit, asyncHandler(verify));
