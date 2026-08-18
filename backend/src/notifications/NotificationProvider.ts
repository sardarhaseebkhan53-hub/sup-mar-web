import { env } from '../config/env.js';
import { createSystemNotification } from '../services/messagingService.js';
import type { MarketplaceNotification } from './types.js';

async function emailAdapter() {
  if (env.email.provider === 'smtp') return import('./providers/smtpEmailProvider.js');
  return import('./providers/consoleEmailProvider.js');
}

export async function sendInApp(notification: MarketplaceNotification) {
  return createSystemNotification(notification.userId, {
    type: notification.type,
    title: notification.title,
    body: notification.body,
    relatedId: notification.relatedId,
    relatedType: notification.relatedType,
  });
}

export async function sendEmail(notification: MarketplaceNotification) {
  const adapter = await emailAdapter();
  return adapter.sendEmail(notification);
}

export async function deliverNotification(notification: MarketplaceNotification, options: { inApp?: boolean; email?: boolean } = {}) {
  const results: { inApp?: unknown; email?: unknown } = {};
  if (options.inApp !== false) results.inApp = await sendInApp(notification);
  if (options.email) results.email = await sendEmail(notification);
  return results;
}
