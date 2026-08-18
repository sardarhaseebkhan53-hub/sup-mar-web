import { env } from '../config/env.js';

/**
 * Central error → response mapping.
 *
 * - AppError: operational errors returned with their intended status/code.
 * - Body-parser JSON parse failures: clean 400 "Invalid request body", not a
 *   raw parser message or INTERNAL_ERROR.
 * - Mongoose CastError/ValidationError: 400 with a safe message.
 * - Everything else: 500 with a generic message in production (never leaking
 *   stack traces, DB internals, or raw error messages to users).
 *
 * The full error is logged (with the request ID) for server-side diagnostics,
 * but the client only ever receives safe, specific messages.
 */

function bodyParseStatus(error: Record<string, unknown>) {
  // express.json() / body-parser sets type='entity.parse.failed' with status 400.
  return error?.type === 'entity.parse.failed' && error?.status === 400;
}

export function errorHandler(error: Record<string, any>, req, res, _next) {
  const duplicate = error?.code === 11000;
  const operational = error?.name === 'AppError';
  const bodyParse = bodyParseStatus(error);
  const castError = error?.name === 'CastError';
  const mongooseValidation = error?.name === 'ValidationError';

  let status: number;
  let code: string;
  let message: string;

  if (bodyParse) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body must be valid JSON.';
  } else if (duplicate) {
    status = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'A resource with that identifier already exists.';
  } else if (mongooseValidation) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'One or more fields are invalid.';
  } else if (castError) {
    status = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'The provided identifier is invalid.';
  } else if (operational) {
    status = Number.isInteger(error.status) ? error.status : 500;
    code = error.code || 'INTERNAL_ERROR';
    message = error.message;
  } else {
    status = Number.isInteger(error.status) ? error.status : 500;
    code = error.code || 'INTERNAL_ERROR';
    message = status >= 500 && env.nodeEnv === 'production' ? 'An unexpected error occurred' : (error.message || 'An unexpected error occurred');
  }

  if (status >= 500 && !operational && !bodyParse) {
    console.error(`[${req.requestId}]`, error);
  }

  const payload: Record<string, unknown> = {
    success: false,
    message,
    code,
  };
  // Only AppError carries structured validation details; never leak internals.
  if (operational && error.details) payload.errors = error.details;
  payload.requestId = req.requestId;

  res.status(status).json(payload);
}
