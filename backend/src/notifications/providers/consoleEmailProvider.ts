import { env } from '../../config/env.js';
import type { MarketplaceNotification } from '../types.js';

export async function sendEmail(notification: MarketplaceNotification) {
  if (!notification.email?.to && env.nodeEnv === 'test') return { queued: false, provider: 'console' };
  const target = notification.email?.to ? notification.email.to.replace(/(^.).*(@.*$)/, '$1***$2') : 'unknown';
  if (env.nodeEnv !== 'test') {
    console.info(`[qavlio-email] provider=console to=${target} subject=${notification.email?.subject || notification.title}`);
  }
  return { queued: true, provider: 'console' };
}
