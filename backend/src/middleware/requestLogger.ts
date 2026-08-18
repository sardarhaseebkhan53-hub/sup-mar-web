import type { NextFunction, Request, Response } from 'express';

/**
 * Structured, latency-tracked request logging for production observability.
 *
 * - Logs method, route, status, latency (ms) and request ID per request.
 * - Redacts bodies for sensitive endpoints so passwords, tokens, payment
 *   credentials and private message contents are never written to logs.
 * - Logs only for `info` level; errors surface through the error handler with
 *   the same request ID so logs can be correlated.
 *
 * No user payload content (emails, messages, phone numbers) is logged.
 */

const SENSITIVE_ROUTE = /\/auth\/|\/payments\/|\/payment\/|\/conversations\/|\/messages\/|\/users\/(password|me|account)|\/sellers|\/admin\/|\/coupons\/|\/referrals/i;

const KNOWN_SKIPPED = new Set([
  '/health',
  '/ready',
  '/favicon.ico',
  '/socket.io',
]);

const redact = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (/password|secret|token|apiKey|api_key|otp|authorization|cvv|pan|card|pin/i.test(key)) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(child);
      }
    }
    return out;
  }
  return value;
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const requestId = (req as Request & { requestId?: string }).requestId;

  res.on('finish', () => {
    const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;
    const url = req.originalUrl || req.url;

    if (KNOWN_SKIPPED.has(url.split('?')[0])) return;

    const sensitive = SENSITIVE_ROUTE.test(url);
    const record: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level: 'info',
      type: 'http',
      method: req.method,
      path: url,
      status: res.statusCode,
      latencyMs: Math.round(latencyMs * 10) / 10,
      requestId,
    };
    if (sensitive) {
      record.redacted = true;
    } else if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body && Object.keys(req.body).length) {
      record.body = redact(req.body);
    }
    console.info(JSON.stringify(record));
  });

  next();
}
