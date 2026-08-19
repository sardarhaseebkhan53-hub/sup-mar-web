import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';
import { campaignRateLimit } from '../middleware/authRateLimits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { create, list, update, getById, adminExpire } from '../controllers/adminCampaignController.js';
import { USER_ROLES } from '../constants/roles.js';

export const adminCampaignRouter = Router();

adminCampaignRouter.use(asyncHandler(authenticateAdmin), authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MODERATOR, USER_ROLES.FINANCE));

const bannerSchema = z.object({
  imageUrl: z.string().trim().max(1000).optional().default(''),
  mobileImageUrl: z.string().trim().max(1000).optional().default(''),
  ctaText: z.string().trim().max(40).optional().default('Explore'),
  ctaLink: z.string().trim().max(500).optional().default(''),
  placement: z.enum(['home','category','listing','search','global']).optional().default('home'),
}).strict();

const seoSchema = z.object({
  title: z.string().trim().max(150).optional(),
  description: z.string().trim().max(300).optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  ogImage: z.string().trim().max(1000).optional(),
}).strict();

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  banner: bannerSchema.optional(),
  bannerImage: z.string().trim().max(1000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  audience: z.enum(['all','new_users','returning_users','sellers','category_interested','wishlist','saved_search']).optional().default('all'),
  couponId: z.string().trim().min(1).max(100).nullable().optional(),
  targetCategories: z.array(z.string().trim().min(1).max(100)).max(100).optional().default([]),
  targetCategorySlugs: z.array(z.string().trim().min(1).max(80)).max(100).optional().default([]),
  targetListings: z.array(z.string().trim().min(1).max(100)).max(200).optional().default([]),
  status: z.enum(['draft','scheduled','active','paused','completed','archived']).optional().default('draft'),
  seo: seoSchema.optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  featured: z.boolean().optional().default(false),
  priority: z.number().int().min(0).max(100).optional().default(10),
  isPublic: z.boolean().optional().default(true),
  enabled: z.boolean().optional().default(true),
  scope: z.enum(['platform','seller']).optional().default('platform'),
  sellerId: z.string().trim().min(1).max(100).nullable().optional(),
  frequency: z.object({
    dailyLimit: z.number().int().min(0).max(100).optional(),
    weeklyLimit: z.number().int().min(0).max(500).optional(),
    cooldownHours: z.number().int().min(0).max(720).optional(),
  }).strict().optional(),
}).strict();

const updateSchema = createSchema.partial().strict();

adminCampaignRouter.get('/', asyncHandler(list));
adminCampaignRouter.post('/', campaignRateLimit, validate(createSchema), asyncHandler(create));
adminCampaignRouter.patch('/:id', campaignRateLimit, validate(updateSchema), asyncHandler(update));
adminCampaignRouter.get('/:id', asyncHandler(getById));
adminCampaignRouter.post('/sync-status', asyncHandler(adminExpire));
