import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SellerTeamMember } from '../models/SellerTeamMember.js';
import { AppError } from '../utils/AppError.js';

/**
 * Seller scope (Phase 17 §51–54, §62–63) — every seller endpoint resolves the acting
 * business from the AUTHENTICATED identity, never from client-supplied IDs.
 * Team members act inside the owner's business with a role-derived permission set;
 * financial access stays owner-only by default.
 */

export type SellerPermission =
  | 'listings' | 'inventory' | 'leads' | 'customers' | 'messages' | 'orders'
  | 'promotions' | 'analytics' | 'revenue' | 'team' | 'settings' | 'export' | 'ai';

const ROLE_PERMISSIONS: Record<string, SellerPermission[]> = {
  owner: ['listings', 'inventory', 'leads', 'customers', 'messages', 'orders', 'promotions', 'analytics', 'revenue', 'team', 'settings', 'export', 'ai'],
  manager: ['listings', 'inventory', 'leads', 'customers', 'messages', 'analytics', 'ai', 'export'],
  staff: ['listings', 'leads', 'messages'],
};

export function permissionsForRole(role: string): SellerPermission[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

export type SellerScope = {
  /** The business owner whose data is in scope (owner themselves, or the team owner). */
  ownerId: string;
  /** The authenticated user acting on the business. */
  actorId: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: SellerPermission[];
  isTeamMember: boolean;
};

const memory = new Map<string, any>();
const connected = () => mongoose.connection.readyState === 1;

async function activeMembership(userId: string): Promise<any | null> {
  if (connected()) {
    const record: any = await SellerTeamMember.findOne({ userId, status: 'active' }).lean();
    return record || null;
  }
  const rows = [...memory.values()].filter((item: any) => String(item.userId) === String(userId) && item.status === 'active');
  return rows[0] || null;
}

/**
 * Resolve the seller scope for an authenticated user. The user's own account is always
 * the default scope; an accepted team membership redirects the scope to the owner's
 * business with the member's role permissions. Team members are granted the seller role
 * on access so Seller Center navigation works — they never get financial permissions.
 */
export async function resolveSellerScope(userId: string): Promise<SellerScope> {
  const membership = await activeMembership(userId);
  if (membership) {
    return {
      ownerId: String(membership.ownerId),
      actorId: userId,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
      isTeamMember: true,
    };
  }
  return { ownerId: userId, actorId: userId, role: 'owner', permissions: permissionsForRole('owner'), isTeamMember: false };
}

/** Route gate: authenticated + (seller role OR active business-team membership). */
export async function requireSellerScope(req: any, _res, next) {
  try {
    const membership = await activeMembership(req.auth.userId);
    if (!membership && !(req.auth?.roles || []).includes('seller')) {
      throw new AppError(403, 'You do not have access to the QAVLIO Seller Center', 'FORBIDDEN');
    }
    if (membership) {
      // Membership implies Seller Center access even if the role grant was missed.
      const { getIdentityRepository } = await import('../repositories/identityRepository.js');
      const identity = getIdentityRepository();
      const user: any = await identity.findUserById(req.auth.userId).catch(() => null);
      if (user && !(user.roles || []).includes('seller')) {
        await identity.updateUser(req.auth.userId, { roles: [...new Set([...(user.roles || []), 'seller'])] }).catch(() => undefined);
        req.auth = { ...req.auth, roles: [...(req.auth.roles || []), 'seller'] };
      }
    }
    const scope = await resolveSellerScope(req.auth.userId);
    if (!scope.permissions.length) throw new AppError(403, 'You do not have seller access', 'FORBIDDEN');
    req.sellerScope = scope;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireScopePermission(permission: SellerPermission) {
  return (req: any, _res, next) => {
    const scope = req.sellerScope as SellerScope | undefined;
    if (!scope) return next(new AppError(500, 'Seller scope missing', 'SCOPE_MISSING'));
    if (!scope.permissions.includes(permission)) {
      return next(new AppError(403, `Your ${scope.role} role does not allow this action`, 'TEAM_PERMISSION_DENIED'));
    }
    next();
  };
}

export function hashInviteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createTeamRecord(record: any) {
  if (connected()) {
    const created: any = await SellerTeamMember.create(record);
    return created.toObject();
  }
  const item = { _id: crypto.randomUUID(), ...record, invitedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
  memory.set(item._id, item);
  return item;
}

export async function findTeamRecord(filter: any): Promise<any | null> {
  if (connected()) return SellerTeamMember.findOne(filter).lean();
  const entries = Object.entries(filter);
  return [...memory.values()].find((item: any) => entries.every(([key, value]) => {
    if (key === '_id') return String(item._id) === String(value);
    return String(item[key]) === String(value);
  })) || null;
}

export async function listTeamRecords(ownerId: string): Promise<any[]> {
  const now = new Date();
  if (connected()) {
    const rows: any[] = await SellerTeamMember.find({ ownerId }).sort({ invitedAt: -1 }).lean();
    for (const row of rows) {
      if (row.status === 'invited' && new Date(row.expiresAt) <= now) {
        await SellerTeamMember.updateOne({ _id: row._id }, { $set: { status: 'expired' } }).catch(() => undefined);
        row.status = 'expired';
      }
    }
    return rows;
  }
  const rows = [...memory.values()].filter((item: any) => String(item.ownerId) === String(ownerId)).sort((a, b) => +b.invitedAt - +a.invitedAt);
  for (const row of rows) {
    if (row.status === 'invited' && new Date(row.expiresAt) <= now) {
      row.status = 'expired';
      memory.set(row._id, row);
    }
  }
  return rows;
}

export async function updateTeamRecord(id: string, patch: any): Promise<any | null> {
  if (connected()) return SellerTeamMember.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  const item = memory.get(String(id));
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date() });
  memory.set(item._id, item);
  return item;
}

export function presentTeamMember(row: any, actorRole: string) {
  const member: any = {
    id: String(row._id),
    role: row.role,
    status: row.status,
    inviteEmail: row.inviteEmail,
    invitedAt: row.invitedAt,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt || null,
    userId: row.userId ? String(row.userId) : null,
  };
  if (actorRole === 'owner') member.permissions = permissionsForRole(row.role);
  return member;
}

export function __resetSellerScopeMemory() {
  memory.clear();
}
