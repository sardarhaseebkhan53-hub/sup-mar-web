import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/adminPermission.js';
import { getAuthSettings, updateAuthSettings } from '../controllers/adminAuthSettingsController.js';
import { validate } from '../middleware/validate.js';

const updateSchema = z.object({
  otpEnabled: z.union([z.boolean(), z.string()]).optional(),
  otpProvider: z.string().optional(),
  otpChannel: z.string().optional(),
  otpRequiredForSignup: z.union([z.boolean(), z.string()]).optional(),
  otpRequiredForLogin: z.union([z.boolean(), z.string()]).optional(),
  otpRequiredForPasswordReset: z.union([z.boolean(), z.string()]).optional(),
  accountLinkingEnabled: z.union([z.boolean(), z.string()]).optional(),
  passwordPolicy: z.object({
    minLength: z.number().int().min(6).max(128).optional(),
    requireUppercase: z.union([z.boolean(), z.string()]).optional(),
    requireLowercase: z.union([z.boolean(), z.string()]).optional(),
    requireNumber: z.union([z.boolean(), z.string()]).optional(),
    requireSpecial: z.union([z.boolean(), z.string()]).optional(),
  }).optional(),
  providers: z.record(z.string(), z.object({ enabled: z.union([z.boolean(), z.string()]).optional() })).optional(),
});

export const adminAuthSettingsRouter = Router();

adminAuthSettingsRouter.get(
  '/auth-settings',
  asyncHandler(authenticate),
  requirePermission('settings:view'),
  asyncHandler(getAuthSettings),
);
adminAuthSettingsRouter.patch(
  '/auth-settings',
  asyncHandler(authenticate),
  requirePermission('settings:manage'),
  validate(updateSchema),
  asyncHandler(updateAuthSettings),
);
