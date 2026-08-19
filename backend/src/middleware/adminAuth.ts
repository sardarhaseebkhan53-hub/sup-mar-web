import { ROLE_PERMISSIONS, type AdminPermission } from '../constants/adminPermissions.js';
import { ADMIN_ROLE_VALUES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';
import { authenticate } from './auth.js';

const ADMIN_ROLES: readonly string[] = ADMIN_ROLE_VALUES;

export function permissionsForRoles(roles: string[] = []): AdminPermission[] {
  const granted = new Set<AdminPermission>();
  for (const role of roles) for (const permission of ROLE_PERMISSIONS[role] || []) granted.add(permission);
  return [...granted];
}

/**
 * Authorization for every /admin API endpoint.
 *
 * Authentication alone is never enough: the identity must be authenticated AND
 * hold an administrator role. Marketplace customers and sellers receive 403.
 */
export function requireAdminRole(req: any, _res: any, next: any) {
  const roles: string[] = req.auth?.roles || [];
  if (!req.auth?.userId) return next(new AppError(401, 'Administrator authentication required', 'ADMIN_AUTH_REQUIRED'));
  if (!roles.some((role) => ADMIN_ROLES.includes(role))) {
    return next(new AppError(403, 'Administrator access is required for this resource', 'ADMIN_FORBIDDEN'));
  }
  req.auth.isAdmin = true;
  req.auth.adminContext = req.auth.context === 'admin';
  req.auth.permissions = permissionsForRoles(roles);
  return next();
}

/** authenticate + administrator role check, in a single middleware. */
export async function authenticateAdmin(req: any, res: any, next: any) {
  return authenticate(req, res, (error?: unknown) => {
    if (error) return next(error);
    return requireAdminRole(req, res, next);
  });
}
