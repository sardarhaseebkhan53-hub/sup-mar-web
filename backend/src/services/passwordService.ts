import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function assertStrongPassword(password: string) {
  const strong = typeof password === 'string'
    && password.length >= env.security.passwordMinLength
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
  if (!strong) throw new AppError(422, `Use at least ${env.security.passwordMinLength} characters with uppercase, lowercase, a number, and a special character`, 'PASSWORD_WEAK');
}

export function hashPassword(password: string) {
  assertStrongPassword(password);
  return bcrypt.hash(password, env.nodeEnv === 'test' ? 4 : 12);
}

export function verifyPassword(password: string, passwordHash: string) { return bcrypt.compare(password, passwordHash); }
