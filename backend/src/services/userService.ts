import { ACCOUNT_STATUSES, AUTH_PURPOSES, VERIFICATION_STATES } from '../constants/account.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { USER_ROLES } from '../constants/roles.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { getSellerProfileRepository } from '../repositories/sellerProfileRepository.js';
import { AppError } from '../utils/AppError.js';
import { normalizeEmail, normalizePhone } from '../utils/identity.js';
import { hashPassword, verifyPassword } from './passwordService.js';
import { recordSecurityEvent } from './securityEventService.js';
import { presentSession, presentUser } from './userPresenter.js';
import { upsertSellerProfile } from './sellerProfileService.js';
import { issueVerificationChallenge } from './verificationService.js';

const idOf = (record) => String(record._id || record.id);

export async function getProfile(userId) {
  const user = await getIdentityRepository().findUserById(userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  return presentUser(user);
}

export async function updateProfile(userId, input: any, req) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  const updates: Record<string, any> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.username !== undefined) {
    const username = input.username.toLowerCase().trim();
    const existing = await repository.findUserByUsername(username);
    if (existing && idOf(existing) !== String(userId)) throw new AppError(409, 'This username is already taken', 'USERNAME_EXISTS');
    updates.username = username;
  }
  if (input.about !== undefined) updates.about = input.about.trim();
  if (input.language !== undefined) { updates.locale = input.language; updates['preferences.language'] = input.language; }
  if (input.privacy?.profileVisibility !== undefined) updates['preferences.privacy.profileVisibility'] = input.privacy.profileVisibility;
  if (input.privacy?.contactPreference !== undefined) updates['preferences.privacy.contactPreference'] = input.privacy.contactPreference;
  for (const field of ['country', 'province', 'city', 'area']) if (input.location?.[field] !== undefined) updates[`location.${field}`] = input.location[field].trim();
  const updated = await repository.updateUser(userId, updates);
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.PROFILE_UPDATED, outcome: 'success', metadata: { fields: Object.keys(updates) } });
  return presentUser(updated);
}

export async function changePassword(userId, input, req) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId, { includePassword: true });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) throw new AppError(401, 'Your current password is incorrect', 'CURRENT_PASSWORD_INVALID');
  const passwordHash = await hashPassword(input.password);
  await repository.updateUser(userId, { passwordHash, 'security.passwordChangedAt': new Date(), 'security.tokenVersion': (user.security?.tokenVersion || 0) + 1 });
  await repository.revokeAllUserSessions(userId, 'password_change');
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.PASSWORD_CHANGED, outcome: 'success', severity: 'medium' });
  return { message: 'Password changed. Sign in again on your devices.' };
}

export async function deactivateAccount(userId, input, req) {
  if (input.confirmation !== 'DELETE') throw new AppError(422, 'Type DELETE to confirm account deletion', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId, { includePassword: true });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new AppError(401, 'Your password is incorrect', 'CURRENT_PASSWORD_INVALID');
  await repository.updateUser(userId, { status: ACCOUNT_STATUSES.DEACTIVATED, deactivatedAt: new Date(), 'security.tokenVersion': (user.security?.tokenVersion || 0) + 1 });
  await repository.revokeAllUserSessions(userId, 'account_status');
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.ACCOUNT_DEACTIVATED, outcome: 'success', severity: 'high' });
  return { message: 'Your account has been deactivated. Retained records follow the published privacy and legal policy.' };
}

export async function deleteAccountPermanently(userId, input, req) {
  if (input.confirmation !== 'DELETE ACCOUNT') throw new AppError(422, 'Type DELETE ACCOUNT to confirm account deletion', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId, { includePassword: true });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new AppError(401, 'Your password is incorrect', 'CURRENT_PASSWORD_INVALID');
  const anonymizedId = String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(-16);
  await repository.updateUser(userId, {
    name: 'Deleted QAVLIO member', username: `deleted.${anonymizedId}`, email: user.email ? `deleted.${anonymizedId}@deleted.qavlio.invalid` : null,
    phone: null, avatar: null, avatarKey: null, about: '', status: ACCOUNT_STATUSES.DELETED, deletedAt: new Date(),
    'security.tokenVersion': (user.security?.tokenVersion || 0) + 1,
  });
  const sellerProfile = await getSellerProfileRepository().findByUserId(userId);
  if (sellerProfile) await getSellerProfileRepository().update(userId, { displayName: 'Deleted seller', description: '', avatar: null, isActive: false });
  await repository.revokeAllUserSessions(userId, 'account_deleted');
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.ACCOUNT_DELETED, outcome: 'success', severity: 'high' });
  return { message: 'Your account has been deleted and optional profile information has been anonymized.' };
}

export async function requestPhoneVerification(userId, phoneInput, req) {
  const repository = getIdentityRepository();
  const phone = normalizePhone(phoneInput);
  const user = await repository.findUserById(userId);
  const existing = await repository.findUserByPhone(phone);
  if (existing && idOf(existing) !== String(userId)) throw new AppError(409, 'This phone number is already linked to another QAVLIO account', 'PHONE_LINKING_REQUIRED', { linkingRequired: true });
  if (user.phone === phone && user.verification?.phone?.status === VERIFICATION_STATES.VERIFIED) return { alreadyVerified: true, phone };
  const result = await issueVerificationChallenge({ userId, target: phone, purpose: AUTH_PURPOSES.PHONE_VERIFICATION, channel: 'sms' });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.OTP_REQUESTED, metadata: { purpose: AUTH_PURPOSES.PHONE_VERIFICATION } });
  return { phone, purpose: AUTH_PURPOSES.PHONE_VERIFICATION, expiresAt: result.expiresAt, resendAfterSeconds: result.resendAfterSeconds };
}

export async function removeVerifiedPhone(userId, password, req) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId, { includePassword: true });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AppError(401, 'Your password is incorrect', 'CURRENT_PASSWORD_INVALID');
  if (user.verification?.email?.status !== VERIFICATION_STATES.VERIFIED) throw new AppError(422, 'Verify an email before removing your phone number', 'VERIFIED_RECOVERY_REQUIRED');
  const updated = await repository.updateUser(userId, { phone: null, 'verification.phone.status': VERIFICATION_STATES.NOT_VERIFIED, 'verification.phone.verifiedAt': null });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.PROFILE_UPDATED, outcome: 'success', severity: 'medium', metadata: { phoneRemoved: true } });
  return presentUser(updated);
}

export async function requestEmailVerification(userId, emailInput, req) {
  const repository = getIdentityRepository();
  const email = normalizeEmail(emailInput);
  const user = await repository.findUserById(userId);
  const existing = await repository.findUserByEmail(email);
  if (existing && idOf(existing) !== String(userId)) throw new AppError(409, 'This email is already linked to another QAVLIO account', 'EMAIL_EXISTS');
  if (user.email === email && user.verification?.email?.status === VERIFICATION_STATES.VERIFIED) return { alreadyVerified: true, email };
  if (user.email !== email) await repository.updateUser(userId, { email, 'verification.email.status': VERIFICATION_STATES.PENDING, 'verification.email.verifiedAt': null });
  const result = await issueVerificationChallenge({ userId, target: email, purpose: AUTH_PURPOSES.EMAIL_VERIFICATION, channel: 'email' });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.PROFILE_UPDATED, outcome: 'success', metadata: { emailChangePending: true } });
  return { email, expiresAt: result.expiresAt, resendAfterSeconds: result.resendAfterSeconds };
}

export async function getVerificationStatus(userId) {
  const user = await getIdentityRepository().findUserById(userId);
  return { status: user.verification, accountStatus: user.status };
}

export async function getSessions(userId, currentSessionId) {
  const sessions = await getIdentityRepository().listActiveSessions(userId);
  return sessions.map((session) => presentSession(session, currentSessionId));
}

export async function revokeSession(userId, sessionId, req) {
  const repository = getIdentityRepository();
  const session = await repository.findSessionById(sessionId);
  if (!session || String(session.userId) !== String(userId)) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
  await repository.revokeSession(sessionId, 'logout');
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.LOGOUT, outcome: 'success', metadata: { sessionId } });
  return { message: 'That device has been logged out' };
}

export async function revokeAllSessions(userId, req) {
  await getIdentityRepository().revokeAllUserSessions(userId, 'logout_all');
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.LOGOUT_ALL, outcome: 'success', severity: 'medium' });
  return { message: 'All devices have been logged out' };
}

export async function completeSellerOnboarding(userId, input, req) {
  const repository = getIdentityRepository();
  const user = await repository.findUserById(userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  const roles = [...new Set([...(user.roles || []), USER_ROLES.CUSTOMER, USER_ROLES.SELLER])];
  const updated = await repository.updateUser(userId, {
    roles,
    'seller.status': 'active',
    'seller.businessName': input.businessName?.trim() || '',
    'seller.accountType': input.accountType,
  });
  await upsertSellerProfile(userId, {
    displayName: input.displayName?.trim() || input.businessName?.trim() || user.name,
    description: input.description?.trim() || '',
    location: input.location || user.location,
    contactPreference: input.contactPreference || 'chat',
    accountType: input.accountType,
  });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.SELLER_ONBOARDING_COMPLETED, outcome: 'success', metadata: { sellerOnboarding: true, accountType: input.accountType } });
  return presentUser(updated);
}

export async function updateNotificationPreferences(userId, input) {
  const updates: Record<string, any> = {};
  for (const key of ['inApp', 'email', 'push', 'sms', 'security', 'marketing', 'messages', 'listingUpdates', 'account', 'promotions', 'announcements']) if (input[key] !== undefined) updates[`preferences.notifications.${key}`] = input[key];
  const user = await getIdentityRepository().updateUser(userId, updates);
  return user.preferences.notifications;
}
