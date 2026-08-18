export const RECENTLY_VIEWED_LIMIT = 20;
export const RECENT_SEARCH_LIMIT = 20;
export const FAVORITE_PAGE_LIMIT = 24;
export const ALERT_DAILY_CAP = 20;
export const ALERT_FREQUENCIES = ['instant', 'daily', 'weekly'] as const;
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];
export const NOTIFICATION_PREF_KEYS = [
  'inApp', 'email', 'push', 'sms', 'security', 'marketing', 'messages', 'listingUpdates', 'account', 'promotions', 'announcements',
  'savedSearchAlerts', 'priceAlerts', 'sellerUpdates', 'listingAvailability', 'payments',
] as const;
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  inApp: true, email: true, push: false, sms: true, security: true, marketing: false, messages: true, listingUpdates: true,
  account: true, promotions: false, announcements: true, savedSearchAlerts: true, priceAlerts: true, sellerUpdates: true,
  listingAvailability: true, payments: true,
};
