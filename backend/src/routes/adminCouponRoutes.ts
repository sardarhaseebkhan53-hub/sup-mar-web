import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { couponRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adminCreate, adminList, adminRedemptions, adminUpdate } from '../controllers/adminCouponController.js';
import { USER_ROLES } from '../constants/roles.js';

export const adminCouponRouter = Router();

adminCouponRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE));

const createSchema = z.object({
  code: z.string().trim().min(4).max(32),
  type: z.enum(['percentage','fixed','credit']),
  value: z.number().min(0).max(1000000),
  minimumAmount: z.number().min(0).max(10000000).optional().default(0),
  maximumDiscount: z.number().min(0).max(10000000).optional().nullable(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime(),
  usageLimit: z.number().int().min(1).max(10000000).optional().nullable(),
  perUserLimit: z.number().int().min(1).max(1000).optional().default(1),
  applicableListings: z.array(z.string().trim().min(1).max(100)).max(200).optional().default([]),
  applicableCategories: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  applicableCategorySlugs: z.array(z.string().trim().min(1).max(80)).max(50).optional().default([]),
  sellerId: z.string().trim().min(1).max(100).nullable().optional(),
  campaignId: z.string().trim().min(1).max(100).nullable().optional(),
  scope: z.enum(['platform','seller','campaign']).optional().default('platform'),
  description: z.string().trim().max(500).optional().default(''),
  isPublic: z.boolean().optional().default(true),
  status: z.enum(['draft','active','paused','expired','disabled']).optional().default('active'),
}).strict();

const updateSchema = createSchema.partial().strict();

adminCouponRouter.get('/', asyncHandler(adminList));
adminCouponRouter.post('/', couponRateLimit, validate(createSchema), asyncHandler(adminCreate));
adminCouponRouter.patch('/:id', couponRateLimit, validate(updateSchema), asyncHandler(adminUpdate));
adminCouponRouter.get('/:id/redemptions', asyncHandler(adminRedemptions));
