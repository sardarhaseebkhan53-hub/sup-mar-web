import { Router } from 'express';
import { z } from 'zod';
import { ACCOUNT_STATUS_VALUES, VERIFICATION_STATE_VALUES } from '../constants/account.js';
import { ROLE_VALUES, USER_ROLES } from '../constants/roles.js';
import { accountStatus, roles, userDetails, users, verification } from '../controllers/adminUserController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminUserRouter = Router();
adminUserRouter.use(asyncHandler(authenticate), authorize(USER_ROLES.ADMIN));
adminUserRouter.get('/', validate(z.object({ search: z.string().max(100).optional(), status: z.enum(ACCOUNT_STATUS_VALUES).optional(), role: z.enum(ROLE_VALUES).optional(), limit: z.coerce.number().min(1).max(100).optional() }), 'query'), asyncHandler(users));
adminUserRouter.get('/:id', asyncHandler(userDetails));
adminUserRouter.patch('/:id/status', validate(z.object({ status: z.enum(ACCOUNT_STATUS_VALUES), reason: z.string().min(3).max(500), confirmation: z.string() })), asyncHandler(accountStatus));
adminUserRouter.patch('/:id/roles', validate(z.object({ roles: z.array(z.enum(ROLE_VALUES)).min(1), confirmation: z.literal('CHANGE ROLES') })), asyncHandler(roles));
adminUserRouter.patch('/:id/verification', validate(z.object({ type: z.enum(['email', 'phone', 'identity', 'business', 'trustedSeller']), status: z.enum(VERIFICATION_STATE_VALUES), reason: z.string().max(500).optional(), confirmation: z.literal('UPDATE VERIFICATION') })), asyncHandler(verification));
