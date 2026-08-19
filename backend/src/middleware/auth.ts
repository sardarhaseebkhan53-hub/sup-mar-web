import { ACCOUNT_STATUSES, VERIFICATION_STATES } from '../constants/account.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { verifyAccessToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';

export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
  try {
    const claims = verifyAccessToken(token);
    const repository = getIdentityRepository();
    const [user, session] = await Promise.all([repository.findUserById(claims.sub, { includePassword: true }), repository.findSessionById(claims.sid)]);
    if (!user || !session || session.revokedAt || new Date(session.expiresAt) <= new Date()) return next(new AppError(401, 'Your session has expired. Sign in again.', 'SESSION_EXPIRED'));
    if ((user.security?.tokenVersion || 0) !== claims.ver) return next(new AppError(401, 'Your session is no longer valid', 'SESSION_REVOKED'));
    if (user.status !== ACCOUNT_STATUSES.ACTIVE) {
      const codes = { suspended: 'ACCOUNT_SUSPENDED', banned: 'ACCOUNT_BANNED', deactivated: 'ACCOUNT_DEACTIVATED', deleted: 'ACCOUNT_UNAVAILABLE', pending_verification: 'ACCOUNT_UNVERIFIED' };
      return next(new AppError(403, 'This account cannot access protected QAVLIO features', codes[user.status] || 'ACCOUNT_RESTRICTED'));
    }
    req.auth = { userId: String(user._id || user.id), sessionId: String(session._id || session.id), roles: user.roles, user, context: claims.ctx || session.context || 'user' };
    repository.touchSession(req.auth.sessionId).catch(() => {});
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'Invalid or expired access token', 'AUTH_INVALID'));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.some((role) => req.auth?.roles?.includes(role))) return next(new AppError(403, 'You do not have access to this resource', 'FORBIDDEN'));
    return next();
  };
}

export function requireVerified(req, _res, next) {
  const verification = req.auth?.user?.verification;
  const verified = verification?.email?.status === VERIFICATION_STATES.VERIFIED || verification?.phone?.status === VERIFICATION_STATES.VERIFIED;
  if (!verified) return next(new AppError(403, 'Verify your email or phone before using this feature', 'ACCOUNT_UNVERIFIED'));
  return next();
}
