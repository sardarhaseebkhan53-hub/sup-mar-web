import crypto from 'node:crypto';
import { ACCOUNT_STATUSES, AUTH_PURPOSES, VERIFICATION_STATES } from '../constants/account.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { USER_ROLES } from '../constants/roles.js';
import { env } from '../config/env.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { createUsername, normalizeEmail, normalizeIdentifier, normalizePhone } from '../utils/identity.js';
import { sha256 } from '../utils/security.js';
import { authSettingsService } from './authSettingsService.js';
import { hashPassword, verifyPassword } from './passwordService.js';
import { recordSecurityEvent } from './securityEventService.js';
import { clearRefreshCookieOptions, createLoginSession, refreshCookieName, refreshCookieOptions } from './tokenService.js';
import { presentUser } from './userPresenter.js';
import { issueVerificationChallenge, verifyChallenge } from './verificationService.js';

const DUMMY_PASSWORD_HASH = '$2a$12$LQv3c1yqBWUHMh7c46F6JOy1lM4LziVJzmiR9HU8QxWn3nXhVXV9K';

function userId(user: any) { return String(user._id || user.id); }
function maskTarget(target: string) {
  if (target.includes('@')) { const [name, domain] = target.split('@'); return `${name.slice(0, 2)}***@${domain}`; }
  return `${target.slice(0, 3)}••••••${target.slice(-2)}`;
}
function defaultVerification({ email = false, phone = false }: { email?: boolean; phone?: boolean } = {}) {
  const item = (verified: boolean) => ({ status: verified ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.NOT_VERIFIED, ...(verified ? { verifiedAt: new Date() } : {}) });
  return { email: item(email), phone: item(phone), identity: item(false), business: item(false), trustedSeller: item(false) };
}
function defaultPreferences(language = 'en') {
  return {
    language,
    privacy: { profileVisibility: 'public', contactPreference: 'chat' },
    notifications: { inApp: true, email: true, push: false, sms: true, security: true, marketing: false, messages: true, listingUpdates: true, account: true, promotions: false, announcements: true, savedSearchAlerts: true, priceAlerts: true, sellerUpdates: true, listingAvailability: true, payments: true },
  };
}
function assertAccountCanLogin(user: any) {
  const errors: Record<string, [number, string, string]> = {
    [ACCOUNT_STATUSES.PENDING_VERIFICATION]: [403, 'Verify your account before signing in', 'ACCOUNT_UNVERIFIED'],
    [ACCOUNT_STATUSES.SUSPENDED]: [403, 'This account is temporarily suspended. Contact support for help.', 'ACCOUNT_SUSPENDED'],
    [ACCOUNT_STATUSES.BANNED]: [403, 'This account has been banned. Contact support if you believe this is an error.', 'ACCOUNT_BANNED'],
    [ACCOUNT_STATUSES.DEACTIVATED]: [403, 'This account has been deactivated', 'ACCOUNT_DEACTIVATED'],
    [ACCOUNT_STATUSES.DELETED]: [403, 'This account is unavailable', 'ACCOUNT_UNAVAILABLE'],
  };
  if (errors[user.status]) throw new AppError(...errors[user.status]);
}

async function uniqueUsername(name: string) {
  const repository = getIdentityRepository();
  const initial = createUsername(name);
  if (!(await repository.findUserByUsername(initial))) return initial;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = createUsername(name, String(Math.floor(1000 + Math.random() * 9000)));
    if (!(await repository.findUserByUsername(candidate))) return candidate;
  }
  return createUsername(name, crypto.randomUUID().slice(0, 8));
}

export async function registerWithEmail(input: any, req: any) {
  const repository = getIdentityRepository();
  const email = normalizeEmail(input.email);
  if (await repository.findUserByEmail(email)) throw new AppError(409, 'An account already exists with this email', 'EMAIL_EXISTS');
  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null;
  if (phone && await repository.findUserByPhone(phone)) throw new AppError(409, 'An account already exists with this phone number', 'PHONE_EXISTS');
  const passwordHash = await hashPassword(input.password);
  const sellerRequested = input.accountType === USER_ROLES.SELLER;
  const otpRequiredForSignup = await authSettingsService.isOtpRequired('signup');
  const user = await repository.createUser({
    name: input.name.trim(),
    username: await uniqueUsername(input.name),
    email,
    phone,
    passwordHash,
    roles: sellerRequested ? [USER_ROLES.CUSTOMER, USER_ROLES.SELLER] : [USER_ROLES.CUSTOMER],
    status: otpRequiredForSignup ? ACCOUNT_STATUSES.PENDING_VERIFICATION : ACCOUNT_STATUSES.ACTIVE,
    avatar: null,
    about: '',
    locale: input.language || 'en',
    location: { country: input.country || 'PK', province: input.province || '', city: input.city || '', area: '' },
    verification: otpRequiredForSignup
      ? defaultVerification({ email: false })
      : defaultVerification({ email: true }),
    seller: { status: sellerRequested ? 'onboarding' : 'not_started', businessName: '' },
    preferences: defaultPreferences(input.language || 'en'),
    security: { failedLoginCount: 0, tokenVersion: 0, twoFactorEnabled: false },
  });
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.ACCOUNT_REGISTERED, outcome: 'success', metadata: { method: 'email', otpRequired: otpRequiredForSignup } });

  if (otpRequiredForSignup) {
    const issued = await issueVerificationChallenge({ userId: userId(user), target: email, purpose: AUTH_PURPOSES.EMAIL_VERIFICATION, channel: 'email' });
    return {
      user: presentUser(user),
      verification: { channel: 'email', target: maskTarget(email), expiresAt: issued.expiresAt, resendAfterSeconds: issued.resendAfterSeconds, required: true },
    };
  }

  // Referral attribution (non-blocking)
  if (input.referralCode) {
    try {
      const { attributeReferral } = await import('./referralService.js');
      await attributeReferral(input.referralCode, userId(user), req, 'code');
    } catch (e) {
      void e;
    }
  }

  return {
    user: presentUser(user),
    verification: { channel: 'email', target: maskTarget(email), required: false },
  };
}

export async function registerWithPhone(input: any, req: any) {
  const repository = getIdentityRepository();
  const phone = normalizePhone(input.phone);
  if (await repository.findUserByPhone(phone)) throw new AppError(409, 'An account already exists with this phone number', 'PHONE_EXISTS');
  const passwordHash = await hashPassword(input.password);
  const sellerRequested = input.accountType === USER_ROLES.SELLER;
  const otpRequiredForSignup = await authSettingsService.isOtpRequired('signup');
  const user = await repository.createUser({
    name: input.name.trim(),
    username: await uniqueUsername(input.name),
    phone,
    passwordHash,
    roles: sellerRequested ? [USER_ROLES.CUSTOMER, USER_ROLES.SELLER] : [USER_ROLES.CUSTOMER],
    status: otpRequiredForSignup ? ACCOUNT_STATUSES.PENDING_VERIFICATION : ACCOUNT_STATUSES.ACTIVE,
    avatar: null,
    about: '',
    locale: input.language || 'en',
    location: { country: input.country || 'PK', province: '', city: input.city || '', area: '' },
    verification: otpRequiredForSignup
      ? defaultVerification({ phone: false })
      : defaultVerification({ phone: true }),
    seller: { status: sellerRequested ? 'onboarding' : 'not_started', businessName: '' },
    preferences: defaultPreferences(input.language || 'en'),
    security: { failedLoginCount: 0, tokenVersion: 0, twoFactorEnabled: false },
  });
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.ACCOUNT_REGISTERED, outcome: 'success', metadata: { method: 'phone', otpRequired: otpRequiredForSignup } });

  if (otpRequiredForSignup) {
    const issued = await issueVerificationChallenge({ userId: userId(user), target: phone, purpose: AUTH_PURPOSES.PHONE_SIGNUP, channel: 'sms' });
    return {
      user: presentUser(user),
      verification: { channel: 'sms', target: maskTarget(phone), normalizedTarget: phone, purpose: AUTH_PURPOSES.PHONE_SIGNUP, expiresAt: issued.expiresAt, resendAfterSeconds: issued.resendAfterSeconds, required: true },
    };
  }

  if (input.referralCode) {
    try {
      const { attributeReferral } = await import('./referralService.js');
      await attributeReferral(input.referralCode, userId(user), req, 'code');
    } catch (e) {
      void e;
    }
  }

  return {
    user: presentUser(user),
    verification: { channel: 'sms', target: maskTarget(phone), normalizedTarget: phone, purpose: AUTH_PURPOSES.PHONE_SIGNUP, required: false },
  };
}

export async function loginWithPassword(input: any, req: any) {
  const repository = getIdentityRepository();
  const identifier = normalizeIdentifier(input.identifier);
  const user = await repository.findUserByIdentifier(identifier, { includePassword: true });
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    if (user) {
      const attempts = (user.security?.failedLoginCount || 0) + 1;
      const updates: any = { 'security.failedLoginCount': attempts };
      if (attempts >= env.auth.loginMaxAttempts) updates['security.lockUntil'] = new Date(Date.now() + env.auth.loginLockMinutes * 60_000);
      await repository.updateUser(userId(user), updates);
    }
    await recordSecurityEvent(req, { userId: user ? userId(user) : null, type: SECURITY_EVENTS.LOGIN_FAILED, outcome: 'failure', severity: 'medium', metadata: { identifierHash: sha256(identifier) } });
    throw new AppError(401, 'The email, phone number, or password is incorrect', 'INVALID_CREDENTIALS');
  }
  if (user.security?.lockUntil && new Date(user.security.lockUntil) > new Date()) throw new AppError(423, 'Too many login attempts. Try again later.', 'LOGIN_LOCKED');
  assertAccountCanLogin(user);
  const otpRequired = await authSettingsService.isOtpRequired('login');
  if (otpRequired) {
    // If OTP is required for login, do not issue a session yet. The frontend
    // is expected to call /auth/verify-otp after the user enters the code.
    await issueVerificationChallenge({ userId: userId(user), target: user.email || user.phone, purpose: AUTH_PURPOSES.PHONE_LOGIN, channel: user.email ? 'email' : 'sms' });
    return {
      user: presentUser(user),
      otpRequired: true,
      verification: { channel: user.email ? 'email' : 'sms', target: maskTarget(user.email || user.phone || ''), purpose: AUTH_PURPOSES.PHONE_LOGIN },
    };
  }
  const updatedUser = await repository.updateUser(userId(user), { 'security.failedLoginCount': 0, 'security.lockUntil': null, lastLoginAt: new Date() });
  const tokens = await createLoginSession(updatedUser, req, { remember: Boolean(input.remember) });
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.LOGIN_SUCCEEDED, outcome: 'success' });
  return { user: presentUser(updatedUser), ...tokens };
}

export async function requestPhoneOtpLogin(phoneInput: string, req: any) {
  const repository = getIdentityRepository();
  const phone = normalizePhone(phoneInput);
  const user = await repository.findUserByPhone(phone);
  const enabled = (await authSettingsService.otpStatus()).enabled;
  if (!enabled) {
    // When OTP is disabled by admin, do not send codes. Return a clear message.
    return {
      message: 'Phone OTP is currently disabled by the administrator. Use your email and password to sign in.',
      disabled: true,
      target: maskTarget(phone),
      normalizedTarget: phone,
    };
  }
  if (user && user.status === ACCOUNT_STATUSES.ACTIVE) {
    await issueVerificationChallenge({ userId: userId(user), target: phone, purpose: AUTH_PURPOSES.PHONE_LOGIN, channel: 'sms' });
    await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.OTP_REQUESTED, metadata: { purpose: AUTH_PURPOSES.PHONE_LOGIN } });
  }
  return { message: 'If this phone number is eligible, a verification code has been sent', target: maskTarget(phone), normalizedTarget: phone, purpose: AUTH_PURPOSES.PHONE_LOGIN };
}

export async function resendVerification({ target: rawTarget, purpose }: any, req: any) {
  const target = rawTarget.includes('@') ? normalizeEmail(rawTarget) : normalizePhone(rawTarget);
  const channel = target.includes('@') ? 'email' : 'sms';
  const repository = getIdentityRepository();
  const previous = await repository.findLatestChallenge(target, purpose);
  if (!previous) throw new AppError(400, 'No verification request was found. Start the verification flow again.', 'VERIFICATION_NOT_FOUND');
  const issued = await issueVerificationChallenge({ target, purpose, channel, isResend: true });
  await recordSecurityEvent(req, { type: SECURITY_EVENTS.OTP_REQUESTED, metadata: { purpose, targetHash: sha256(target) } });
  return { message: 'A new verification code has been sent', target: maskTarget(target), expiresAt: issued.expiresAt, resendAfterSeconds: issued.resendAfterSeconds };
}

export async function resendEmailVerificationChallenge(rawEmail: string, req: any) {
  const email = normalizeEmail(rawEmail);
  const user = await getIdentityRepository().findUserByEmail(email);
  if (user?.verification?.email?.status === VERIFICATION_STATES.VERIFIED) return { alreadyVerified: true, email };
  return resendVerification({ target: email, purpose: AUTH_PURPOSES.EMAIL_VERIFICATION }, req);
}

export async function verifyEmail({ email: rawEmail, token }: any, req: any) {
  const email = normalizeEmail(rawEmail);
  const repository = getIdentityRepository();
  const existingUser = await repository.findUserByEmail(email);
  if (existingUser?.verification?.email?.status === VERIFICATION_STATES.VERIFIED) return { user: presentUser(existingUser), alreadyVerified: true };
  const challenge = await verifyChallenge({ target: email, purpose: AUTH_PURPOSES.EMAIL_VERIFICATION, secret: token });
  const user = await repository.findUserById(challenge.userId);
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  const updated = await repository.updateUser(userId(user), { 'verification.email.status': VERIFICATION_STATES.VERIFIED, 'verification.email.verifiedAt': new Date(), status: user.status === ACCOUNT_STATUSES.PENDING_VERIFICATION ? ACCOUNT_STATUSES.ACTIVE : user.status });
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.EMAIL_VERIFIED, outcome: 'success' });

  // Evaluate referral eligibility after email verification
  try {
    const { evaluateReferralEligibility } = await import('./referralService.js');
    await evaluateReferralEligibility(userId(user));
  } catch { /* referral evaluation is best-effort */ }

  return { user: presentUser(updated), alreadyVerified: false };
}

export async function verifyOtp(input: any, req: any) {
  const target = normalizePhone(input.phone);
  const repository = getIdentityRepository();
  let challenge;
  try {
    challenge = await verifyChallenge({ target, purpose: input.purpose, secret: input.code });
  } catch (error) {
    await recordSecurityEvent(req, { type: SECURITY_EVENTS.OTP_FAILED, outcome: 'failure', severity: 'medium', metadata: { purpose: input.purpose, targetHash: sha256(target), code: (error as any).code } });
    throw error;
  }
  const user = challenge.userId ? await repository.findUserById(challenge.userId, { includePassword: true }) : await repository.findUserByPhone(target, { includePassword: true });
  if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  if (input.purpose === AUTH_PURPOSES.PHONE_SIGNUP || input.purpose === AUTH_PURPOSES.PHONE_VERIFICATION) {
    const updated = await repository.updateUser(userId(user), { phone: target, 'verification.phone.status': VERIFICATION_STATES.VERIFIED, 'verification.phone.verifiedAt': new Date(), status: user.status === ACCOUNT_STATUSES.PENDING_VERIFICATION ? ACCOUNT_STATUSES.ACTIVE : user.status });
    await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.OTP_VERIFIED, outcome: 'success', metadata: { purpose: input.purpose } });

    try {
      const { evaluateReferralEligibility } = await import('./referralService.js');
      await evaluateReferralEligibility(userId(user));
    } catch { /* referral evaluation is best-effort */ }

    return { user: presentUser(updated), verified: true };
  }
  if (input.purpose === AUTH_PURPOSES.PHONE_LOGIN) {
    assertAccountCanLogin(user);
    const updated = await repository.updateUser(userId(user), { lastLoginAt: new Date(), 'security.failedLoginCount': 0 });
    const tokens = await createLoginSession(updated, req, { remember: Boolean(input.remember) });
    await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.LOGIN_SUCCEEDED, outcome: 'success', metadata: { method: 'phone_otp' } });
    return { user: presentUser(updated), ...tokens };
  }
  throw new AppError(422, 'This verification purpose is not supported here', 'INVALID_OTP_PURPOSE');
}

export async function requestPasswordReset(identifierInput: string, req: any) {
  let identifier: string;
  try { identifier = normalizeIdentifier(identifierInput); } catch { return { message: 'If an eligible account exists, recovery instructions have been sent' }; }
  const repository = getIdentityRepository();
  const user = await repository.findUserByIdentifier(identifier);
  const otpStatus = await authSettingsService.otpStatus();
  const allowOtp = otpStatus.enabled;
  if (user && ![ACCOUNT_STATUSES.BANNED, ACCOUNT_STATUSES.DELETED].includes(user.status)) {
    const email = identifier.includes('@');
    if (allowOtp) {
      await issueVerificationChallenge({ userId: userId(user), target: identifier, purpose: email ? AUTH_PURPOSES.PASSWORD_RESET_EMAIL : AUTH_PURPOSES.PASSWORD_RESET_PHONE, channel: email ? 'email' : 'sms' });
      await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.PASSWORD_RESET_REQUESTED, metadata: { channel: email ? 'email' : 'sms' } });
    } else {
      // Issue a server-issued, single-use reset token that can be used directly.
      // The token is hashed at rest and expires.
      const { issueServerResetToken } = await import('./passwordResetService.js');
      const issued = await issueServerResetToken(userId(user));
      await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.PASSWORD_RESET_REQUESTED, metadata: { channel: 'server_token' } });
      return { message: 'A secure reset link has been generated. Use it to create a new password.', target: maskTarget(identifier), channel: 'token', tokenHint: issued.hint, expiresAt: issued.expiresAt };
    }
  }
  return { message: 'If an eligible account exists, recovery instructions have been sent', target: maskTarget(identifier), otpEnabled: allowOtp };
}

export async function resetPassword(input: any, req: any) {
  const target = normalizeIdentifier(input.identifier);
  const repository = getIdentityRepository();
  let user;
  let propagateError: any = null;
  if (input.tokenOrCode && /^\d{6}$/.test(input.tokenOrCode)) {
    const purpose = target.includes('@') ? AUTH_PURPOSES.PASSWORD_RESET_EMAIL : AUTH_PURPOSES.PASSWORD_RESET_PHONE;
    const challenge = await verifyChallenge({ target, purpose, secret: input.tokenOrCode });
    user = await repository.findUserById(challenge.userId, { includePassword: true });
  } else if (input.tokenOrCode) {
    // Try OTP-style challenge first (the email/phone reset token delivered
    // through the normal channel), then fall back to server-issued tokens.
    try {
      const purpose = target.includes('@') ? AUTH_PURPOSES.PASSWORD_RESET_EMAIL : AUTH_PURPOSES.PASSWORD_RESET_PHONE;
      const challenge = await verifyChallenge({ target, purpose, secret: input.tokenOrCode });
      user = await repository.findUserById(challenge.userId, { includePassword: true });
    } catch (error: any) {
      // Preserve the original challenge error so the caller can surface
      // a precise code (e.g. OTP_EXPIRED) instead of a generic invalid.
      propagateError = error;
      const { consumeServerResetToken } = await import('./passwordResetService.js');
      user = await consumeServerResetToken(input.tokenOrCode);
    }
  }
  if (!user) {
    if (propagateError) throw propagateError;
    throw new AppError(400, 'This reset request is invalid', 'RESET_INVALID');
  }
  const passwordHash = await hashPassword(input.password);
  await repository.updateUser(userId(user), { passwordHash, 'security.passwordChangedAt': new Date(), 'security.tokenVersion': (user.security?.tokenVersion || 0) + 1, 'security.failedLoginCount': 0, 'security.lockUntil': null });
  await repository.revokeAllUserSessions(userId(user), 'password_change');
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.PASSWORD_RESET_COMPLETED, outcome: 'success', severity: 'medium' });
  return { message: 'Your password has been reset. Sign in with your new password.' };
}

export async function refreshSession(rawRefreshToken: string | null, req: any) {
  if (!rawRefreshToken) throw new AppError(401, 'Your session has expired. Sign in again.', 'SESSION_EXPIRED');
  const repository = getIdentityRepository();
  const current = await repository.findSessionByTokenHash(sha256(rawRefreshToken));
  if (!current) throw new AppError(401, 'Your session has expired. Sign in again.', 'SESSION_EXPIRED');
  if (current.revokedAt) {
    if (current.revokeReason === 'rotated') await repository.revokeFamily(current.familyId, 'reuse_detected');
    throw new AppError(401, 'This session is no longer valid', 'SESSION_REVOKED');
  }
  if (new Date(current.expiresAt) <= new Date()) throw new AppError(401, 'Your session has expired. Sign in again.', 'SESSION_EXPIRED');
  const user = await repository.findUserById(current.userId, { includePassword: true });
  if (!user) throw new AppError(401, 'Your session is no longer valid', 'SESSION_REVOKED');
  assertAccountCanLogin(user);
  await repository.revokeSession(current._id || current.id, 'rotated');
  const tokens = await createLoginSession(user, req, { familyId: current.familyId, remember: Boolean(current.remember) });
  await recordSecurityEvent(req, { userId: userId(user), type: SECURITY_EVENTS.SESSION_REFRESHED, outcome: 'success' });
  return { user: presentUser(user), ...tokens };
}

export async function logout(rawRefreshToken: string | null, req: any) {
  if (rawRefreshToken) {
    const repository = getIdentityRepository();
    const session = await repository.findSessionByTokenHash(sha256(rawRefreshToken));
    if (session && !session.revokedAt) {
      await repository.revokeSession(session._id || session.id, 'logout');
      await recordSecurityEvent(req, { userId: session.userId, type: SECURITY_EVENTS.LOGOUT, outcome: 'success' });
    }
  }
  return { message: 'You have been logged out' };
}

export function setRefreshCookie(res: any, tokens: any) { res.cookie(refreshCookieName, tokens.rawRefreshToken, refreshCookieOptions(tokens.refreshMaxAge)); }
export function clearRefreshCookie(res: any) { res.clearCookie(refreshCookieName, clearRefreshCookieOptions()); }
export function getRefreshCookie(req: any) { return req.cookies?.[refreshCookieName] || null; }
