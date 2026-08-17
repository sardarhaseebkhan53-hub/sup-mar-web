import { AUTH_PURPOSES } from '../constants/account.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhone } from '../utils/identity.js';
import { verifyPassword } from './passwordService.js';
import { recordSecurityEvent } from './securityEventService.js';
import { issueVerificationChallenge, verifyChallenge } from './verificationService.js';

const idOf = (record) => String(record._id || record.id);

export async function initiateAccountLink(userId, input, req) {
  const repository = getIdentityRepository();
  const phone = normalizePhone(input.phone);
  const current = await repository.findUserById(userId, { includePassword: true });
  if (!current || !(await verifyPassword(input.password, current.passwordHash))) throw new AppError(401, 'Re-authentication failed', 'REAUTHENTICATION_FAILED');
  const target = await repository.findUserByPhone(phone);
  if (!target || idOf(target) === String(userId)) throw new AppError(422, 'This number does not require account linking', 'ACCOUNT_LINK_NOT_REQUIRED');
  const request = await repository.createLinkRequest({ requestedByUserId: String(userId), targetUserId: idOf(target), targetPhone: phone, status: 'pending_verification', identityConfirmedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) });
  await issueVerificationChallenge({ userId, target: phone, purpose: AUTH_PURPOSES.ACCOUNT_LINK, channel: 'sms', metadata: { linkRequestId: idOf(request) } });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.ACCOUNT_LINK_REQUESTED, outcome: 'success', severity: 'high' });
  return { linkRequestId: idOf(request), phone, expiresAt: request.expiresAt, warning: 'Accounts are never merged automatically. Verify the number and explicitly confirm the consequences.' };
}

export async function confirmAccountLink(userId, input, req) {
  if (input.confirmation !== 'LINK ACCOUNTS') throw new AppError(422, 'Type LINK ACCOUNTS to confirm', 'CONFIRMATION_REQUIRED');
  const repository = getIdentityRepository();
  const request = await repository.findLinkRequest(input.linkRequestId);
  if (!request || String(request.requestedByUserId) !== String(userId) || request.status !== 'pending_verification') throw new AppError(400, 'This account-link request is invalid', 'ACCOUNT_LINK_INVALID');
  if (new Date(request.expiresAt) <= new Date()) throw new AppError(410, 'This account-link request has expired', 'ACCOUNT_LINK_EXPIRED');
  const challenge = await verifyChallenge({ target: request.targetPhone, purpose: AUTH_PURPOSES.ACCOUNT_LINK, secret: input.code });
  if (challenge.metadata?.linkRequestId !== String(input.linkRequestId)) throw new AppError(400, 'This verification code does not match the link request', 'ACCOUNT_LINK_INVALID');
  const updated = await repository.updateLinkRequest(input.linkRequestId, { status: 'ready_for_review', otpVerifiedAt: new Date(), warningAcceptedAt: new Date() });
  await recordSecurityEvent(req, { userId, type: SECURITY_EVENTS.ACCOUNT_LINK_CONFIRMED, outcome: 'success', severity: 'high', metadata: { linkRequestId: input.linkRequestId } });
  return { status: updated.status, message: 'Identity checks are complete. QAVLIO will review account eligibility before any data is merged.' };
}
