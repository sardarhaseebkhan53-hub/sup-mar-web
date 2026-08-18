export type NotificationChannel = 'in-app' | 'email' | 'push';

export type MarketplaceNotification = {
  userId: string;
  type: 'message' | 'favorite' | 'listing' | 'system' | 'saved_search' | 'price_alert' | 'seller_update' | 'listing_status';
  title: string;
  body: string;
  relatedId?: string;
  relatedType?: 'conversation' | 'listing' | 'system' | 'search' | 'seller';
  email?: { to?: string; subject?: string };
};
