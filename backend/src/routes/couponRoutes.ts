import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { couponRateLimit, couponValidationRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { myCoupons, myRedemptions, publicCoupons, redeem, validate as validateCouponHandler } from '../controllers/couponController.js';

export const couponRouter = Router();

const validateSchema = z.object({
  code: z.string().trim().min(3).max(32),
  amount: z.coerce.number().min(0).max(1_000_000_000),
  listingId: z.string().trim().min(1).max(100).optional(),
  categorySlug: z.string().trim().min(1).max(80).optional(),
}).strict();

const redeemSchema = z.object({
  code: z.string().trim().min(3).max(32),
  amount: z.coerce.number().min(0).max(1_000_000_000),
  listingId: z.string().trim().min(1).max(100).optional(),
  orderId: z.string().trim().min(1).max(100).optional(),
  paymentId: z.string().trim().min(1).max(100).optional(),
}).strict();

// Public validation - requires auth optionally? We allow optional auth? But spec says backend validates; we require auth for tracking
couponRouter.get('/public', asyncHandler(publicCoupons));

couponRouter.post('/validate', couponValidationRateLimit, asyncHandler(authenticate), validate(validateSchema), asyncHandler(validateCouponHandler));
couponRouter.post('/redeem', couponRateLimit, asyncHandler(authenticate), validate(redeemSchema), asyncHandler(redeem));

couponRouter.get('/my', asyncHandler(authenticate), asyncHandler(myCoupons));
couponRouter.get('/my/redemptions', asyncHandler(authenticate), asyncHandler(myRedemptions));
