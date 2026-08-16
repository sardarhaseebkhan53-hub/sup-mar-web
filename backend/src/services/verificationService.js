import { AUTH_PURPOSES } from '../constants/account.js';
import { env } from '../config/env.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { hmacSecret, randomOtp, randomToken } from '../utils/security.js';
import { deliverAuthenticationSecret } from './authDeliveryService.js';

const tokenPurposes = new Set([AUTH_PURPOSES.EMAIL_VERIFICATION, AUTH_PURPOSES.PASSWORD_RESET_EMAIL]);

export async function issueVerificationChallenge({ userId = null, target, purpose, channel, metadata = {}, isResend = false }) {
  const repository = getIdentityRepository();
  const previous = await repository.findLatestChallenge(target, purpose);
  const now = new Date();
  if (previous?.lockedUntil && new Date(previous.lockedUntil) > now) throw new AppError(423, 'Verification is temporarily locked. Try again later.', 'OTP_LOCKED');
  if (previous && !previous.consumedAt && new Date(previous.resendAvailableAt) > now) {
    const retryAfter = Math.ceil((new Date(previous.resendAvailableAt) - now) / 1000);
    throw new AppError(429, `Please wait ${retryAfter} seconds before requesting another code`, 'OTP_RATE_LIMITED', { retryAfter });
  }
  if (previous?.resendCount >= 5) throw new AppError(429, 'Too many verification requests. Try again later.', 'OTP_REQUEST_LIMIT');
  if (previous && !previous.consumedAt) await repository.updateChallenge(previous._id || previous.id, { consumedAt: now });

  const secret = tokenPurposes.has(purpose) ? randomToken() : randomOtp();
  const expiresAt = new Date(Date.now() + env.auth.otpExpiresMinutes * 60_000);
  const challenge = await repository.createChallenge({
    userId: userId ? String(userId) : previous?.userId || null,
    target,
    channel,
    purpose,
    secretHash: hmacSecret(target, purpose, secret),
    attempts: 0,
    maxAttempts: env.auth.otpMaxAttempts,
    resendCount: isResend ? (previous?.resendCount || 0) + 1 : previous?.resendCount || 0,
    expiresAt,
    resendAvailableAt: new Date(Date.now() + env.auth.otpResendSeconds * 1000),
    metadata,
  });
  const link = tokenPurposes.has(purpose) ? `${env.frontendUrl}/${purpose === AUTH_PURPOSES.EMAIL_VERIFICATION ? 'verify-email' : 'reset-password'}?token=${secret}&target=${encodeURIComponent(target)}` : null;
  await deliverAuthenticationSecret({ channel, target, purpose, secret, expiresAt, link });
  return { challenge, expiresAt, resendAfterSeconds: env.auth.otpResendSeconds };
}

export async function verifyChallenge({ target, purpose, secret }) {
  const repository = getIdentityRepository();
  const challenge = await repository.findLatestChallenge(target, purpose);
  const now = new Date();
  if (!challenge || challenge.consumedAt) throw new AppError(400, 'This verification code is invalid or has already been used', 'OTP_INVALID');
  if (challenge.lockedUntil && new Date(challenge.lockedUntil) > now) throw new AppError(423, 'Verification is temporarily locked. Try again later.', 'OTP_LOCKED');
  if (new Date(challenge.expiresAt) <= now) {
    await repository.updateChallenge(challenge._id || challenge.id, { consumedAt: now });
    throw new AppError(410, 'This verification code has expired. Request a new one.', 'OTP_EXPIRED');
  }
  if (hmacSecret(target, purpose, secret) !== challenge.secretHash) {
    const attempts = (challenge.attempts || 0) + 1;
    const updates = { attempts };
    if (attempts >= challenge.maxAttempts) updates.lockedUntil = new Date(Date.now() + 15 * 60_000);
    await repository.updateChallenge(challenge._id || challenge.id, updates);
    if (attempts >= challenge.maxAttempts) throw new AppError(423, 'Too many incorrect attempts. Verification is temporarily locked.', 'OTP_ATTEMPTS_EXCEEDED');
    throw new AppError(400, 'The verification code is incorrect', 'OTP_INVALID', { attemptsRemaining: challenge.maxAttempts - attempts });
  }
  await repository.updateChallenge(challenge._id || challenge.id, { consumedAt: now });
  return challenge;
}
