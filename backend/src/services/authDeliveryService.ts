import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const developmentOutbox = new Map();
const keyFor = (target, purpose) => `${purpose}:${target}`;

export async function deliverAuthenticationSecret({ channel, target, purpose, secret, expiresAt, link }) {
  if (env.nodeEnv === 'production') {
    // Provider adapters (email/SMS) are intentionally configured by deployment, never by the browser.
    throw new AppError(503, `${channel === 'sms' ? 'SMS' : 'Email'} delivery is not configured`, 'DELIVERY_NOT_CONFIGURED');
  }
  developmentOutbox.set(keyFor(target, purpose), { secret, expiresAt, link });
  if (env.nodeEnv !== 'test') console.info(`[auth-delivery:development] ${channel} ${purpose} for ${target}: ${secret}${link ? ` (${link})` : ''}`);
}

export function peekDevelopmentSecret(target, purpose) {
  return developmentOutbox.get(keyFor(target, purpose)) || null;
}

export function clearDevelopmentOutbox() { developmentOutbox.clear(); }
