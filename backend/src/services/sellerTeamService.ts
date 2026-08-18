import crypto from 'node:crypto';
import { USER_ROLES } from '../constants/roles.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { createSystemNotification } from './messagingService.js';
import { createTeamRecord, findTeamRecord, hashInviteToken, listTeamRecords, permissionsForRole, presentTeamMember, updateTeamRecord } from './sellerScopeService.js';

/**
 * Seller team management (Phase 17 §51–54). Invitations target an email; the invited
 * person accepts with their EXISTING QAVLIO account — no separate passwords are ever created.
 * Owners can also pre-link an existing account (staff onboarding in person).
 */

export const TEAM_ROLES = ['owner', 'manager', 'staff'] as const;
const MAX_TEAM = 10;
const DEFAULT_INVITE_DAYS = 7;

export async function listTeam(ownerId: string, actorRole: string) {
  const rows = await listTeamRecords(ownerId);
  const profile = await getSellerProfileRepository().findByUserId(ownerId).catch(() => null);
  return {
    accountType: profile?.accountType || 'individual',
    eligible: (profile?.accountType || 'individual') === 'business',
    roleMatrix: TEAM_ROLES.map((role) => ({ role, permissions: permissionsForRole(role) })),
    members: rows.map((row: any) => presentTeamMember(row, actorRole)),
    limits: { max: MAX_TEAM, used: rows.filter((row: any) => row.status !== 'revoked' && row.status !== 'expired').length },
  };
}

export async function inviteMember(ownerId: string, invitedBy: string, input: { email: string; role: string; expiresInDays?: number; userId?: string }) {
  const profile = await getSellerProfileRepository().findByUserId(ownerId).catch(() => null);
  if (!profile || profile.accountType !== 'business') throw new AppError(403, 'Team management is available for business accounts', 'BUSINESS_FEATURE_REQUIRED');
  if (!TEAM_ROLES.includes(input.role as any) || input.role === 'owner') throw new AppError(422, 'Invite a manager or staff member — the owner role cannot be invited', 'TEAM_ROLE_INVALID');
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError(422, 'Enter a valid email address', 'VALIDATION_ERROR');
  if (email === String(await findOwnerEmail(ownerId)).toLowerCase()) throw new AppError(422, 'You are already the owner of this business', 'TEAM_ROLE_INVALID');

  const existing = await findTeamRecord({ ownerId, inviteEmail: email });
  if (existing && ['invited', 'active'].includes(existing.status)) throw new AppError(409, 'That email already has an invitation or membership', 'TEAM_INVITE_EXISTS');
  const team = await listTeamRecords(ownerId);
  if (team.filter((row: any) => ['invited', 'active'].includes(row.status)).length >= MAX_TEAM) throw new AppError(422, `Business teams can have up to ${MAX_TEAM} members`, 'TEAM_LIMIT');

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + Math.min(30, Math.max(1, input.expiresInDays || DEFAULT_INVITE_DAYS)) * 86_400_000);
  let linkedUserId: string | null = null;
  if (input.userId) {
    const user = await getIdentityRepository().findUserById(String(input.userId));
    if (user) linkedUserId = String(user._id || user.id);
  } else {
    const identity = getIdentityRepository();
    const byEmail: any = await (identity as any).findUserByEmail?.(email).catch(() => null);
    if (byEmail) linkedUserId = String(byEmail._id || byEmail.id);
  }

  const record = await createTeamRecord({
    ownerId,
    userId: linkedUserId,
    inviteEmail: email,
    role: input.role,
    status: linkedUserId ? 'invited' : 'invited',
    inviteTokenHash: hashInviteToken(token),
    invitedBy,
    invitedAt: new Date(),
    expiresAt,
  });
  if (linkedUserId) {
    await createSystemNotification(linkedUserId, { type: 'seller_update', title: 'Team invitation', body: `You were invited to a QAVLIO business workspace as ${input.role}. Open Seller Center → Team to accept.`, relatedType: 'seller' }).catch(() => undefined);
  }
  return {
    member: presentTeamMember(record, 'owner'),
    invite: { token: linkedUserId ? null : token, expiresAt, note: linkedUserId ? 'Invitation sent to their QAVLIO notifications.' : 'Share this one-time invitation link — it expires and uses their existing QAVLIO account.' },
  };
}

export async function acceptInvitation(userId: string, token: string) {
  const record = await findTeamRecord({ inviteTokenHash: hashInviteToken(token) });
  if (!record || record.status !== 'invited') throw new AppError(404, 'This invitation is no longer valid', 'TEAM_INVITE_INVALID');
  if (new Date(record.expiresAt) <= new Date()) {
    await updateTeamRecord(String(record._id), { status: 'expired' });
    throw new AppError(410, 'This invitation has expired', 'TEAM_INVITE_EXPIRED');
  }
  if (String(record.ownerId) === String(userId)) throw new AppError(422, 'You already own this business', 'TEAM_ROLE_INVALID');
  const existing = await findTeamRecord({ ownerId: record.ownerId, userId });
  if (existing && existing.status === 'active') throw new AppError(409, 'You are already a member of this business', 'TEAM_MEMBER_EXISTS');
  const updated: any = await updateTeamRecord(String(record._id), { status: 'active', userId, acceptedAt: new Date(), inviteTokenHash: '' });

  // Grant the seller role so Seller Center becomes reachable; business scope comes from membership.
  const identity = getIdentityRepository();
  const user: any = await identity.findUserById(userId);
  if (user && !(user.roles || []).includes(USER_ROLES.SELLER)) {
    await identity.updateUser(userId, { roles: [...new Set([...(user.roles || []), USER_ROLES.CUSTOMER, USER_ROLES.SELLER])] });
  }
  await createSystemNotification(String(record.ownerId), { type: 'seller_update', title: 'Team member joined', body: `${record.inviteEmail} accepted the ${record.role} invitation.`, relatedType: 'seller' }).catch(() => undefined);
  return presentTeamMember(updated, 'owner');
}

export async function updateMember(ownerId: string, id: string, patch: { role?: string; status?: string }) {
  const record = await findTeamRecord({ _id: id });
  if (!record || String(record.ownerId) !== String(ownerId)) throw new AppError(404, 'Team member not found', 'TEAM_MEMBER_NOT_FOUND');
  const updates: any = {};
  if (patch.role) {
    if (!['manager', 'staff'].includes(patch.role)) throw new AppError(422, 'Members can be manager or staff', 'TEAM_ROLE_INVALID');
    updates.role = patch.role;
  }
  if (patch.status && ['invited', 'active', 'revoked'].includes(patch.status)) {
    if (record.role === 'owner') throw new AppError(422, 'The owner cannot be modified', 'TEAM_ROLE_INVALID');
    updates.status = patch.status;
    if (patch.status === 'revoked' && record.userId) {
      const identity = getIdentityRepository();
      const user: any = await identity.findUserById(String(record.userId)).catch(() => null);
      if (user && (user.roles || []).includes(USER_ROLES.SELLER)) {
        const stillMemberElsewhere = (await listTeamRecords(record.userId)).length === 0 && !(await getSellerProfileRepository().findByUserId(String(record.userId)).catch(() => null));
        if (stillMemberElsewhere) await identity.updateUser(String(record.userId), { roles: (user.roles || []).filter((role: string) => role !== USER_ROLES.SELLER) }).catch(() => undefined);
      }
    }
  }
  const updated = await updateTeamRecord(String(record._id), updates);
  return presentTeamMember(updated, 'owner');
}

async function findOwnerEmail(ownerId: string) {
  const user: any = await getIdentityRepository().findUserById(ownerId).catch(() => null);
  return user?.email?.address || user?.email || 'owner@qavlio.test';
}

export function __resetTeamMemoryHelpers() {
  // memory lives in sellerScopeService; exposed there.
}
