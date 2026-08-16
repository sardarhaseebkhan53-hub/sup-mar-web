import { ACCOUNT_STATUS_VALUES, VERIFICATION_STATE_VALUES } from '../constants/account.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { ROLE_VALUES, USER_ROLES } from '../constants/roles.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { recordSecurityEvent } from './securityEventService.js';
import { presentUser } from './userPresenter.js';

export async function listUsers(filters) {
  const users = await getIdentityRepository().listUsers(filters);
  return users.map(presentUser);
}

export async function getUserForAdmin(userId) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  const events = await repository.listSecurityEvents({ userId, limit: 30 });
  return { user: presentUser(user), securityEvents: events };
}

export async function changeAccountStatus(adminId, userId, input, req) {
  if (!ACCOUNT_STATUS_VALUES.includes(input.status)) throw new AppError(422, 'Invalid account status', 'INVALID_STATUS');
  if (String(adminId) === String(userId) && ['banned', 'suspended', 'deleted'].includes(input.status)) throw new AppError(422, 'You cannot restrict your own admin account', 'SELF_RESTRICTION_DENIED');
  if (input.confirmation !== input.status.toUpperCase()) throw new AppError(422, `Type ${input.status.toUpperCase()} to confirm`, 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  const updated = await repository.updateUser(userId, { status: input.status, ...(input.status === 'deleted' ? { deletedAt: new Date() } : {}) });
  if (input.status !== 'active') await repository.revokeAllUserSessions(userId, 'account_status');
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ACCOUNT_STATUS_CHANGED, outcome: 'success', severity: 'high', metadata: { from: user.status, to: input.status, reason: input.reason } });
  return presentUser(updated);
}

export async function changeRoles(adminId, userId, input, req) {
  if (!Array.isArray(input.roles) || !input.roles.length || input.roles.some((role) => !ROLE_VALUES.includes(role))) throw new AppError(422, 'Select at least one valid role', 'INVALID_ROLES');
  if (!input.roles.includes(USER_ROLES.CUSTOMER) && !input.roles.includes(USER_ROLES.ADMIN)) input.roles.unshift(USER_ROLES.CUSTOMER);
  if (String(adminId) === String(userId) && !input.roles.includes(USER_ROLES.ADMIN)) throw new AppError(422, 'You cannot remove your own admin role', 'SELF_ROLE_CHANGE_DENIED');
  if (input.confirmation !== 'CHANGE ROLES') throw new AppError(422, 'Type CHANGE ROLES to confirm', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  const roles = [...new Set(input.roles)];
  const updated = await repository.updateUser(userId, { roles, 'security.tokenVersion': (user.security?.tokenVersion || 0) + 1 });
  await repository.revokeAllUserSessions(userId, 'admin');
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ROLES_CHANGED, outcome: 'success', severity: 'high', metadata: { from: user.roles, to: roles } });
  return presentUser(updated);
}

export async function resetVerification(adminId, userId, input, req) {
  if (!['email', 'phone', 'identity', 'business', 'trustedSeller'].includes(input.type) || !VERIFICATION_STATE_VALUES.includes(input.status)) throw new AppError(422, 'Invalid verification update', 'INVALID_VERIFICATION');
  if (input.confirmation !== 'UPDATE VERIFICATION') throw new AppError(422, 'Type UPDATE VERIFICATION to confirm', 'CONFIRMATION_REQUIRED');
  const updated = await getIdentityRepository().updateUser(userId, { [`verification.${input.type}.status`]: input.status, [`verification.${input.type}.verifiedAt`]: input.status === 'verified' ? new Date() : null, [`verification.${input.type}.reason`]: input.reason || '' });
  if (!updated) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  await recordSecurityEvent(req, { userId, actorId: adminId, type: SECURITY_EVENTS.ACCOUNT_STATUS_CHANGED, outcome: 'success', severity: 'high', metadata: { verification: input.type, status: input.status } });
  return presentUser(updated);
}
