import crypto from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../constants/roles.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { randomToken, requestSecurityContext, sha256, parseDuration } from '../utils/security.js';

export interface AccessClaims extends JwtPayload {
  sub: string;
  sid: string;
  roles: UserRole[];
  status: string;
  ver: number;
}

export function createAccessToken(user, sessionId): string {
  return jwt.sign({
    sub: String(user._id || user.id), sid: String(sessionId), roles: user.roles, status: user.status, ver: user.security?.tokenVersion || 0,
  }, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'], issuer: 'qavlio-api', audience: 'qavlio-clients' });
}

export function verifyAccessToken(token): AccessClaims {
  const claims = jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'], issuer: 'qavlio-api', audience: 'qavlio-clients' });
  if (typeof claims === 'string' || !claims.sub || !claims.sid) throw new Error('Invalid token claims');
  return claims as AccessClaims;
}

export async function createLoginSession(user, req, { remember = false, familyId = null }: { remember?: boolean; familyId?: string | null } = {}) {
  const rawRefreshToken = randomToken();
  const ttl = parseDuration(remember ? env.jwt.rememberTtl : env.jwt.refreshTtl, remember ? 30 * 86400_000 : 7 * 86400_000);
  const security = requestSecurityContext(req);
  const session = await getIdentityRepository().createSession({
    userId: String(user._id || user.id), tokenHash: sha256(rawRefreshToken), familyId: familyId || crypto.randomUUID(), remember,
    device: security.device, browser: security.browser, platform: security.platform, userAgent: security.userAgent,
    ipHash: security.ipHash, ipApproximation: security.ipApproximation, loginAt: new Date(), lastActiveAt: new Date(), expiresAt: new Date(Date.now() + ttl),
  });
  return { session, rawRefreshToken, accessToken: createAccessToken(user, session._id || session.id), refreshMaxAge: ttl };
}

export const refreshCookieName = 'qavlio_refresh';
export function refreshCookieOptions(maxAge) { return { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax' as const, path: `${env.apiPrefix}/auth`, maxAge }; }
export function clearRefreshCookieOptions() { return { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax' as const, path: `${env.apiPrefix}/auth` }; }
