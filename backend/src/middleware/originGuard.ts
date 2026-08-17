import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function requireTrustedOrigin(req, _res, next) {
  const origin = req.get('origin');
  if (!origin) return next();
  const allowed = env.clientOrigins.includes(origin) || (env.nodeEnv !== 'production' && /^https:\/\/[^/]+\.e2b\.app$/.test(origin));
  if (!allowed) return next(new AppError(403, 'Request origin is not allowed', 'ORIGIN_NOT_ALLOWED'));
  return next();
}
