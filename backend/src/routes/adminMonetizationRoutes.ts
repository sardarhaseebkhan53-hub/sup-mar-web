import { Router } from 'express';
import { z } from 'zod';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { USER_ROLES } from '../constants/roles.js';
import { packageCreate, packages, packageUpdate, refundUpdate, refunds, revenue, settings, settingsUpdate } from '../controllers/adminMonetizationController.js';
import { requirePermission } from '../middleware/adminPermission.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const promotion = z.object({ key: z.string().regex(/^[a-z0-9-]+$/).max(80), name: z.string().trim().min(2).max(100), description: z.string().trim().max(300).default(''), type: z.enum(['BOOST','FEATURED','TOP_SEARCH','HOMEPAGE','CATEGORY','URGENT']), placement: z.enum(['boost','featured','search','homepage','category','urgent']), durationHours: z.number().int().min(1).max(8760), price: z.number().min(0).max(10_000_000), currency: z.literal('PKR'), priority: z.number().int().min(0).max(100), creditCost: z.number().int().min(1).max(100), allowsStacking: z.boolean().default(false), isActive: z.boolean(), order: z.number().int().min(0).max(1000) }).strict();
const settingsSchema = z.object({ freeListingLimit: z.number().int().min(0).max(100), additionalListingFee: z.number().min(0).max(10_000_000), currency: z.literal('PKR'), taxRate: z.number().min(0).max(100), discountAmount: z.number().min(0).max(10_000_000), platformFee: z.number().min(0).max(10_000_000), paymentProcessingFee: z.number().min(0).max(10_000_000), promotionEnabled: z.boolean(), minPromotionDurationHours: z.number().int().min(1).max(8760), maxPromotionDurationHours: z.number().int().min(1).max(8760), promotionProducts: z.array(promotion).max(30) }).strict();
const packageSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().min(5).max(500), price: z.number().min(0).max(10_000_000), currency: z.literal('PKR'), listingCredits: z.number().int().min(0).max(10000), promotionCredits: z.number().int().min(0).max(10000), promotionDays: z.number().int().min(0).max(3650), validityDays: z.number().int().min(1).max(3650), features: z.array(z.string().trim().min(1).max(150)).max(20), active: z.boolean(), sortOrder: z.number().int().min(0).max(1000) }).strict();

export const adminMonetizationRouter = Router();
adminMonetizationRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.SUPPORT, USER_ROLES.FINANCE));
adminMonetizationRouter.get('/revenue', requirePermission(ADMIN_PERMISSIONS.FINANCE_VIEW), validate(z.object({ range: z.enum(['today','7d','30d','90d','custom']).default('30d'), from: z.string().datetime().optional(), to: z.string().datetime().optional() }), 'query'), asyncHandler(revenue));
adminMonetizationRouter.get('/settings/monetization', requirePermission(ADMIN_PERMISSIONS.SETTINGS_VIEW), asyncHandler(settings));
adminMonetizationRouter.patch('/settings/monetization', requirePermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE), validate(settingsSchema), asyncHandler(settingsUpdate));
adminMonetizationRouter.get('/monetization/packages', requirePermission(ADMIN_PERMISSIONS.SETTINGS_VIEW), asyncHandler(packages));
adminMonetizationRouter.post('/monetization/packages', requirePermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE), validate(packageSchema), asyncHandler(packageCreate));
adminMonetizationRouter.patch('/monetization/packages/:id', requirePermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE), validate(packageSchema.partial().strict()), asyncHandler(packageUpdate));
adminMonetizationRouter.get('/refunds', requirePermission(ADMIN_PERMISSIONS.FINANCE_VIEW), validate(z.object({ status: z.enum(['Requested','Processing','Completed','Rejected']).optional() }), 'query'), asyncHandler(refunds));
adminMonetizationRouter.patch('/refunds/:id', requirePermission(ADMIN_PERMISSIONS.FINANCE_REFUND), validate(z.object({ status: z.enum(['Processing','Completed','Rejected']), note: z.string().trim().max(1000).default('') }).strict()), asyncHandler(refundUpdate));
