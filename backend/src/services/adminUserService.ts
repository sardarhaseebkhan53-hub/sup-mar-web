import { ACCOUNT_STATUS_VALUES, VERIFICATION_STATE_VALUES } from '../constants/account.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { ROLE_VALUES, USER_ROLES, type UserRole } from '../constants/roles.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { recordSecurityEvent } from './securityEventService.js';
import { presentUser } from './userPresenter.js';
import { adminListListings } from './listingService.js';
import { adminListOrders, adminListPayments } from './paymentService.js';
import { adminReports } from './adminReportService.js';
import { adminListReviews } from './reviewService.js';
import { activityTimeline } from './adminActivityService.js';

const actorIsSuperAdmin = (req) => req.auth?.roles?.includes(USER_ROLES.SUPER_ADMIN);

function assertPrivilegedTargetAccess(user, req) {
  const targetIsPrivileged = user?.roles?.some((role) => [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE].includes(role));
  if (targetIsPrivileged && !actorIsSuperAdmin(req)) {
    throw new AppError(403, 'Only a super administrator can manage this account', 'SUPER_ADMIN_REQUIRED');
  }
}

export async function listUsers(filters) {
  const users = await getIdentityRepository().listUsers(filters);
  return users.map(presentUser);
}

export async function getUserForAdmin(userId, includeFinance = false) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  const [events,listings,reports,reviews,activity,financial] = await Promise.all([repository.listSecurityEvents({ userId, limit: 30 }),adminListListings({page:1,limit:2000,sort:'newest'}),adminReports({page:1,limit:1000}),adminListReviews({page:1,limit:2000}),activityTimeline('user',userId,30),includeFinance?Promise.all([adminListPayments({userId,page:1,limit:100}),adminListOrders({userId,page:1,limit:100})]):Promise.resolve(null)]);
  const owned=listings.listings.filter((item:any)=>String(item.sellerId)===String(userId));const reported=reports.reports.filter((item:any)=>String(item.reporterId)===String(userId)||String(item.targetId)===String(userId));const relatedReviews=(reviews.reviews||[]).filter((item:any)=>String(item.reviewerId)===String(userId)||String(item.sellerId)===String(userId));const payments:any=financial?.[0],orders:any=financial?.[1];
  return { user: presentUser(user), securityEvents: events, statistics:{listings:owned.length,activeListings:owned.filter((item:any)=>item.status==='published').length,...(includeFinance&&{transactions:payments.pagination.total,orders:orders.pagination.total}),reports:reported.length,reviews:relatedReviews.length},listings:owned.slice(0,20),...(includeFinance&&{orders:orders.orders.slice(0,20),payments:payments.payments.slice(0,10)}),reports:reported.slice(0,10),reviews:relatedReviews.slice(0,10),activity,financialAccess:includeFinance };
}

export async function changeAccountStatus(adminId, userId, input, req) {
  if (!ACCOUNT_STATUS_VALUES.includes(input.status)) throw new AppError(422, 'Invalid account status', 'INVALID_STATUS');
  if (String(adminId) === String(userId) && ['banned', 'suspended', 'deleted'].includes(input.status)) throw new AppError(422, 'You cannot restrict your own admin account', 'SELF_RESTRICTION_DENIED');
  if (input.confirmation !== input.status.toUpperCase()) throw new AppError(422, `Type ${input.status.toUpperCase()} to confirm`, 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  assertPrivilegedTargetAccess(user, req);
  const updated = await repository.updateUser(userId, { status: input.status, ...(input.status === 'deleted' ? { deletedAt: new Date() } : {}) });
  if (input.status !== 'active') await repository.revokeAllUserSessions(userId, 'account_status');
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ACCOUNT_STATUS_CHANGED, outcome: 'success', severity: 'high', metadata: { from: user.status, to: input.status, reason: input.reason } });
  return presentUser(updated);
}

export async function changeRoles(adminId, userId, input: { roles: UserRole[]; confirmation: string }, req) {
  if (!Array.isArray(input.roles) || !input.roles.length || input.roles.some((role) => !ROLE_VALUES.includes(role))) throw new AppError(422, 'Select at least one valid role', 'INVALID_ROLES');
  if (input.confirmation !== 'CHANGE ROLES') throw new AppError(422, 'Type CHANGE ROLES to confirm', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  assertPrivilegedTargetAccess(user, req);
  const requestedRoles = [...new Set(input.roles)];
  const privilegedRoles: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE];
  const changesPrivilegedRole = privilegedRoles.some((role) => requestedRoles.includes(role) !== Boolean(user.roles?.includes(role)));
  if (changesPrivilegedRole && !actorIsSuperAdmin(req)) throw new AppError(403, 'Only a super administrator can grant or revoke privileged roles', 'SUPER_ADMIN_REQUIRED');
  if (String(adminId) === String(userId) && user.roles?.includes(USER_ROLES.SUPER_ADMIN) && !requestedRoles.includes(USER_ROLES.SUPER_ADMIN)) throw new AppError(422, 'You cannot remove your own super administrator role', 'SELF_ROLE_CHANGE_DENIED');
  if (String(adminId) === String(userId) && !requestedRoles.some((role) => privilegedRoles.includes(role))) throw new AppError(422, 'You cannot remove your own administrative access', 'SELF_ROLE_CHANGE_DENIED');
  const baseRoles: UserRole[] = [USER_ROLES.CUSTOMER, ...privilegedRoles];
  const roles = requestedRoles.some((role) => baseRoles.includes(role)) ? requestedRoles : [USER_ROLES.CUSTOMER, ...requestedRoles];
  const updated = await repository.updateUser(userId, { roles, 'security.tokenVersion': (user.security?.tokenVersion || 0) + 1 });
  await repository.revokeAllUserSessions(userId, 'admin');
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ROLES_CHANGED, outcome: 'success', severity: 'high', metadata: { from: user.roles, to: roles } });
  return presentUser(updated);
}

export async function resetVerification(adminId, userId, input, req) {
  if (!['email', 'phone', 'identity', 'business', 'trustedSeller'].includes(input.type) || !VERIFICATION_STATE_VALUES.includes(input.status)) throw new AppError(422, 'Invalid verification update', 'INVALID_VERIFICATION');
  if (input.confirmation !== 'UPDATE VERIFICATION') throw new AppError(422, 'Type UPDATE VERIFICATION to confirm', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  assertPrivilegedTargetAccess(user, req);
  const updated = await repository.updateUser(userId, { [`verification.${input.type}.status`]: input.status, [`verification.${input.type}.verifiedAt`]: input.status === 'verified' ? new Date() : null, [`verification.${input.type}.reason`]: input.reason || '' });
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ACCOUNT_STATUS_CHANGED, outcome: 'success', severity: 'high', metadata: { verification: input.type, status: input.status } });
  return presentUser(updated);
}
