import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function assertStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(422, 'Use at least 10 characters with uppercase, lowercase, and a number', 'PASSWORD_WEAK');
  }
}

export function hashPassword(password) {
  assertStrongPassword(password);
  return bcrypt.hash(password, env.nodeEnv === 'test' ? 4 : 12);
}

export function verifyPassword(password, passwordHash) { return bcrypt.compare(password, passwordHash); }
