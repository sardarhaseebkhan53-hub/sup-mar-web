import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { getIdentityRepository } from '../repositories/identityRepository.js';
import { sha256 } from '../utils/security.js';

const memoryTokens = new Map<string, { userId: string; expiresAt: Date; usedAt?: Date }>();

function tokenCollection() {
  try {
    return mongoose.connection.db?.collection('password_reset_tokens') || null;
  } catch {
    return null;
  }
}

const HOURS_VALID = 2;

export async function issueServerResetToken(userId: string) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = sha256(raw);
  const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000);
  const collection = tokenCollection();
  if (collection) {
    await collection.insertOne({ hash, userId, expiresAt, createdAt: new Date() });
  } else {
    memoryTokens.set(hash, { userId, expiresAt });
  }
  // Return last 6 chars as a hint so the UI can confirm it without exposing it.
  return { token: raw, hint: raw.slice(-6), expiresAt };
}

export async function consumeServerResetToken(rawToken: string) {
  const hash = sha256(rawToken);
  const collection = tokenCollection();
  if (collection) {
    const record = await collection.findOne({ hash });
    if (!record) return null;
    if (record.usedAt) return null;
    if (new Date(record.expiresAt) <= new Date()) return null;
    await collection.updateOne({ hash }, { $set: { usedAt: new Date() } });
    return getIdentityRepository().findUserById(record.userId, { includePassword: true });
  }
  const record = memoryTokens.get(hash);
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt <= new Date()) return null;
  record.usedAt = new Date();
  return getIdentityRepository().findUserById(record.userId, { includePassword: true });
}

export async function purgeExpiredTokens() {
  const collection = tokenCollection();
  if (collection) {
    await collection.deleteMany({ expiresAt: { $lte: new Date() } });
  } else {
    for (const [key, value] of memoryTokens) {
      if (value.expiresAt <= new Date()) memoryTokens.delete(key);
    }
  }
}

void env;
