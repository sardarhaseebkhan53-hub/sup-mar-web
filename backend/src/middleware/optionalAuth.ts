import { authenticate } from './auth.js';
export function optionalAuthenticate(req, res, next) { if (!req.get('authorization')) return next(); return authenticate(req, res, next); }
