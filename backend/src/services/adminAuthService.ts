import { env } from '../config/env.js';
import { ACCOUNT_STATUSES, VERIFICATION_STATES } from '../constants/account.js';
import { ADMIN_ROLE_VALUES, USER_ROLES } from '../constants/roles.js';
import { SECURITY_EVENTS } from '../constants/securityEvents.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { AppError } from '../utils/AppError.js';
import { sha256 } from '../utils/security.js';
import { verifyPassword } from './passwordService.js';
import { recordSecurityEvent } from './securityEventService.js';
import { adminRefreshCookieName, adminRefreshCookieOptions, clearAdminRefreshCookieOptions, createLoginSession } from './tokenService.js';

const DUMMY_PASSWORD_HASH = '$2a$12$LQv3c1yqBWUHMh7c46F6JOy1lM4LziVJzmiR9HU8QxWn3nXhVXV9K';
const ADMIN_ROLES: readonly string[] = ADMIN_ROLE_VALUES;

function identity(user: any) { return String(user._id || user.id); }
export function isAdminUser(user: any): boolean {
  return Array.isArray(user?.roles) && user.roles.some((role: string) => ADMIN_ROLES.includes(role));
}

/** Administrator identity exposed to the Admin Panel. Never contains secrets. */
export function presentAdmin(user: any) {
  if (!user) return null;
  const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
  return {
    id: identity(user),
    name: user.name,
    username: user.username || '',
    email: user.email || null,
    roles,
    role: roles.find((role) => ADMIN_ROLES.includes(role)) || null,
    status: user.status,
    avatar: user.avatar || null,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function normalizeUsername(value: unknown) { return String(value || '').trim().toLowerCase(); }

/**
 * Bootstrap-only password hasher. Bypasses the marketplace strong-password
 * policy (which requires uppercase + special characters) so operators can seed
 * the first administrator with their own chosen password, while normal user
 * signup/reset flows keep using hashPassword() and its strict validation.
 */
async function hashSeedPassword(password: string) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(password, env.nodeEnv === 'test' ? 4 : 12);
}

async function findAdminCandidate(username: string) {
  const repository = getIdentityRepository();
  const byUsername = await repository.findUserByUsername(username, { includePassword: true });
  if (byUsername) return byUsername;
  // Administrators may also sign in with the configured admin email address.
  if (username.includes('@')) return repository.findUserByEmail(username, { includePassword: true });
  return null;
}

/**
 * Idempotent development/bootstrap seed for the administrator account.
 *
 * Admin exists? YES -> do nothing. NO -> create with a securely hashed password.
 * The plaintext password is never stored, logged, or returned.
 */
export async function ensureAdminAccount({ silent = false }: { silent?: boolean } = {}) {
  if (!env.admin.seedEnabled) return { created: false, skipped: 'seed_disabled' as const };
  const username = normalizeUsername(env.admin.username);
  const password = env.admin.password;
  if (!username || !password) return { created: false, skipped: 'not_configured' as const };

  const repository = getIdentityRepository();
  const existingByUsername = await repository.findUserByUsername(username);
  const existingByEmail = env.admin.email ? await repository.findUserByEmail(env.admin.email) : null;
  const existing = existingByUsername || existingByEmail;
  if (existing) {
    if (!isAdminUser(existing)) {
      if (!silent) console.warn(`[admin] "${username}" exists without an administrator role. Grant the role through the audited admin workflow.`);
      return { created: false, skipped: 'exists_without_admin_role' as const };
    }
    return { created: false, skipped: 'already_exists' as const, adminId: identity(existing) };
  }

  let passwordHash: string;
  try {
    // Operator-provided bootstrap passwords are accepted with a relaxed floor
    // (>= 8 characters) so a chosen operator password always works on first
    // boot; marketplace user passwords still enforce the full strong policy.
    if (password.length < 8) throw new AppError(422, 'Password too short', 'PASSWORD_WEAK');
    passwordHash = await hashSeedPassword(password);
  } catch {
    if (!silent) console.warn('[admin] ADMIN_PASSWORD does not meet the password policy; the admin account was not created.');
    return { created: false, skipped: 'weak_password' as const };
  }

  const created = await repository.createUser({
    name: env.admin.name || 'QAVLIO Administrator',
    username,
    ...(env.admin.email ? { email: env.admin.email } : {}),
    passwordHash,
    roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN],
    status: ACCOUNT_STATUSES.ACTIVE,
    verification: {
      email: env.admin.email
        ? { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() }
        : { status: VERIFICATION_STATES.NOT_VERIFIED },
      phone: { status: VERIFICATION_STATES.NOT_VERIFIED },
      identity: { status: VERIFICATION_STATES.NOT_VERIFIED },
      business: { status: VERIFICATION_STATES.NOT_VERIFIED },
      trustedSeller: { status: VERIFICATION_STATES.NOT_VERIFIED },
    },
    security: { tokenVersion: 0, failedLoginCount: 0, twoFactorEnabled: false },
    preferences: { language: 'en' },
  });
  if (!silent) console.info(`[admin] Administrator account "${username}" created. Sign in at /admin/login and rotate the password immediately.`);
  return { created: true, adminId: identity(created) };
}

/** Username + password administrator sign-in. No phone, no OTP, no marketplace profile checks. */
export async function loginAdmin(input: { username: string; password: string; remember?: boolean }, req: any) {
  const username = normalizeUsername(input.username);
  const repository = getIdentityRepository();
  const user = await findAdminCandidate(username);
  const passwordMatches = await verifyPassword(String(input.password || ''), user?.passwordHash || DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    if (user) {
      const attempts = (user.security?.failedLoginCount || 0) + 1;
      const updates: any = { 'security.failedLoginCount': attempts };
      if (attempts >= env.auth.loginMaxAttempts) updates['security.lockUntil'] = new Date(Date.now() + env.auth.loginLockMinutes * 60_000);
      await repository.updateUser(identity(user), updates);
    }
    await recordSecurityEvent(req, {
      userId: user ? identity(user) : null, type: SECURITY_EVENTS.ADMIN_LOGIN_FAILED, outcome: 'failure', severity: 'high',
      metadata: { usernameHash: sha256(username) },
    });
    throw new AppError(401, 'The administrator username or password is incorrect', 'INVALID_ADMIN_CREDENTIALS');
  }

  if (user.security?.lockUntil && new Date(user.security.lockUntil) > new Date()) {
    throw new AppError(423, 'Too many administrator sign-in attempts. Try again later.', 'ADMIN_LOGIN_LOCKED');
  }

  if (!isAdminUser(user)) {
    await recordSecurityEvent(req, { userId: identity(user), type: SECURITY_EVENTS.ADMIN_LOGIN_FORBIDDEN, outcome: 'failure', severity: 'high' });
    throw new AppError(403, 'This account is not an administrator', 'NOT_AN_ADMINISTRATOR');
  }
  if (user.status !== ACCOUNT_STATUSES.ACTIVE) {
    throw new AppError(403, 'This administrator account cannot sign in', 'ADMIN_ACCOUNT_RESTRICTED');
  }

  const updated = await repository.updateUser(identity(user), { 'security.failedLoginCount': 0, 'security.lockUntil': null, lastLoginAt: new Date() });
  const tokens = await createLoginSession(updated, req, { remember: Boolean(input.remember), context: 'admin' });
  await recordSecurityEvent(req, { userId: identity(user), type: SECURITY_EVENTS.ADMIN_LOGIN_SUCCEEDED, outcome: 'success', severity: 'medium' });
  return { admin: presentAdmin(updated), ...tokens };
}

/** Rotates the admin refresh session. Marketplace refresh tokens are rejected here. */
export async function refreshAdminSession(rawRefreshToken: string | null, req: any) {
  if (!rawRefreshToken) throw new AppError(401, 'Your admin session has expired. Sign in again.', 'ADMIN_SESSION_EXPIRED');
  const repository = getIdentityRepository();
  const current = await repository.findSessionByTokenHash(sha256(rawRefreshToken));
  if (!current) throw new AppError(401, 'Your admin session has expired. Sign in again.', 'ADMIN_SESSION_EXPIRED');
  if ((current.context || 'user') !== 'admin') throw new AppError(401, 'This session is not an administrator session', 'ADMIN_SESSION_INVALID');
  if (current.revokedAt) {
    if (current.revokeReason === 'rotated') await repository.revokeFamily(current.familyId, 'reuse_detected');
    throw new AppError(401, 'This admin session is no longer valid', 'ADMIN_SESSION_REVOKED');
  }
  if (new Date(current.expiresAt) <= new Date()) throw new AppError(401, 'Your admin session has expired. Sign in again.', 'ADMIN_SESSION_EXPIRED');

  const user = await repository.findUserById(current.userId, { includePassword: true });
  if (!user) throw new AppError(401, 'This admin session is no longer valid', 'ADMIN_SESSION_REVOKED');
  if (!isAdminUser(user) || user.status !== ACCOUNT_STATUSES.ACTIVE) {
    await repository.revokeSession(current._id || current.id, 'account_status');
    throw new AppError(403, 'This account is not an administrator', 'NOT_AN_ADMINISTRATOR');
  }

  await repository.revokeSession(current._id || current.id, 'rotated');
  const tokens = await createLoginSession(user, req, { familyId: current.familyId, remember: Boolean(current.remember), context: 'admin' });
  await recordSecurityEvent(req, { userId: identity(user), type: SECURITY_EVENTS.ADMIN_SESSION_REFRESHED, outcome: 'success' });
  return { admin: presentAdmin(user), ...tokens };
}

export async function logoutAdmin(rawRefreshToken: string | null, req: any) {
  if (rawRefreshToken) {
    const repository = getIdentityRepository();
    const session = await repository.findSessionByTokenHash(sha256(rawRefreshToken));
    if (session && !session.revokedAt && (session.context || 'user') === 'admin') {
      await repository.revokeSession(session._id || session.id, 'logout');
      await recordSecurityEvent(req, { userId: session.userId, type: SECURITY_EVENTS.ADMIN_LOGOUT, outcome: 'success' });
    }
  }
  return { message: 'Administrator signed out' };
}

export function setAdminRefreshCookie(res: any, tokens: any) { res.cookie(adminRefreshCookieName, tokens.rawRefreshToken, adminRefreshCookieOptions(tokens.refreshMaxAge)); }
export function clearAdminRefreshCookie(res: any) { res.clearCookie(adminRefreshCookieName, clearAdminRefreshCookieOptions()); }
export function getAdminRefreshCookie(req: any) { return req.cookies?.[adminRefreshCookieName] || null; }
