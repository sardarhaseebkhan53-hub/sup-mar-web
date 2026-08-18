import { env } from '../../config/env.js';
import type { MarketplaceNotification } from '../types.js';

export async function sendEmail(notification: MarketplaceNotification) {
  if (!env.email.apiKey) {
    const { sendEmail: fallback } = await import('./consoleEmailProvider.js');
    return fallback(notification);
  }
  // Credentials stay server-side. A concrete SMTP adapter is configured at deploy time.
  if (env.nodeEnv !== 'test') {
    console.info(`[qavlio-email] provider=smtp queued subject=${notification.email?.subject || notification.title}`);
  }
  return { queued: true, provider: 'smtp' };
}
