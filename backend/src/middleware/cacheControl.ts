import type { NextFunction, Request, Response } from 'express';

/**
 * Sets safe `Cache-Control` headers on public, read-only responses.
 *
 * Only applied to specific, non-personalized, read-only endpoints whose data
 * changes rarely (categories, public configuration, locations, campaigns).
 * Private or authenticated data is NEVER cached by this middleware — apply it
 * per-route only where it is known to be safe.
 */
export function cacheControl(maxAgeSeconds: number, opts: { privateData?: boolean } = {}) {
  return function cacheControlMiddleware(_req: Request, res: Response, next: NextFunction) {
    const scope = opts.privateData ? 'private' : 'public';
    res.set('Cache-Control', `${scope}, max-age=${maxAgeSeconds}`);
    next();
  };
}
