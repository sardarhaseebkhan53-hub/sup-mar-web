import { env } from '../config/env.js';

export function errorHandler(error, req, res, _next) {
  const duplicate = error?.code === 11000;
  const operational = error?.name === 'AppError';
  const status = duplicate ? 409 : Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500 && !operational) console.error(`[${req.requestId}]`, error);
  res.status(status).json({
    success: false,
    message: status >= 500 && env.nodeEnv === 'production' && !operational ? 'An unexpected error occurred' : error.message,
    code: error.code || 'INTERNAL_ERROR',
    ...(error.details ? { errors: error.details } : {}),
    requestId: req.requestId,
  });
}
