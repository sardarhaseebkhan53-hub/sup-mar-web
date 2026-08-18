import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { couponRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { create, list, redemptions, update } from '../controllers/sellerCouponController.js';
import { USER_ROLES } from '../constants/roles.js';

export const sellerCouponRouter = Router();

sellerCouponRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.SELLER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN));

const couponCreateSchema = z.object({
  code: z.string().trim().min(4).max(32),
  type: z.enum(['percentage','fixed','credit']),
  value: z.number().min(0).max(1000000),
  minimumAmount: z.number().min(0).max(10000000).optional().default(0),
  maximumDiscount: z.number().min(0).max(10000000).optional().nullable(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime(),
  usageLimit: z.number().int().min(1).max(1000000).optional().nullable(),
  perUserLimit: z.number().int().min(1).max(100).optional().default(1),
  applicableListings: z.array(z.string().trim().min(1).max(100)).max(100).optional().default([]),
  applicableCategories: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
  applicableCategorySlugs: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
  description: z.string().trim().max(500).optional().default(''),
  isPublic: z.boolean().optional().default(true),
  status: z.enum(['draft','active','paused','expired','disabled']).optional().default('active'),
}).strict();

const couponUpdateSchema = couponCreateSchema.partial().strict();

sellerCouponRouter.get('/', asyncHandler(list));
sellerCouponRouter.post('/', couponRateLimit, validate(couponCreateSchema), asyncHandler(create));
sellerCouponRouter.patch('/:id', couponRateLimit, validate(couponUpdateSchema), asyncHandler(update));
sellerCouponRouter.get('/:id/redemptions', asyncHandler(redemptions));
