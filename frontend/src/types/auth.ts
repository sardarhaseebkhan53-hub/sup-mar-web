export type UserRole = 'customer' | 'seller' | 'admin' | 'super_admin' | 'support' | 'moderator' | 'finance';
export type VerificationState = 'not_verified' | 'pending' | 'verified' | 'rejected' | 'expired';

export interface VerificationItem { status: VerificationState; verifiedAt?: string | null; reason?: string; }
export interface UserLocation { country: string; province: string; city: string; area: string; }
export interface NotificationPreferences {
  inApp: boolean; email: boolean; push: boolean; sms: boolean; security: boolean; marketing: boolean;
  messages: boolean; listingUpdates: boolean; account: boolean; promotions: boolean; announcements: boolean;
  savedSearchAlerts: boolean; priceAlerts: boolean; sellerUpdates: boolean; listingAvailability: boolean; payments: boolean;
}
export interface PrivacyPreferences { profileVisibility: 'public' | 'registered' | 'private'; contactPreference: 'chat' | 'chat_and_call' | 'call'; }
export interface AuthUser {
  id: string; name: string; username: string; email?: string | null; phone?: string | null; roles: UserRole[]; status: string;
  avatar?: string | null; about?: string; createdAt?: string; location: UserLocation;
  verification: { email: VerificationItem; phone: VerificationItem; identity: VerificationItem; business: VerificationItem; trustedSeller: VerificationItem };
  seller: { status: 'not_started' | 'onboarding' | 'active' | 'paused'; accountType?: 'individual' | 'business'; businessName?: string; responseRate?: number | null };
  preferences: { language: 'en' | 'ur'; privacy?: PrivacyPreferences; notifications: NotificationPreferences };
}
export interface SessionPreview { id: string; device: string; browser: string; platform: string; approximateLocation: string; loginAt: string; lastActiveAt: string; expiresAt: string; current: boolean; }
export interface SellerProfile {
  id: string; userId: string; displayName: string; description: string; avatar?: string | null; location: UserLocation;
  contactPreference: 'chat' | 'chat_and_call' | 'call'; verificationStatus: VerificationState; rating: number; reviewCount: number;
  activeListingCount: number; soldListingCount: number; responseRate?: number | null; responseTimeMinutes?: number | null;
  accountType: 'individual' | 'business'; memberSince?: string; updatedAt?: string;
}
export interface ApiEnvelope<T> { success: true; data: T; message?: string; meta?: Record<string, unknown>; }
export interface ApiErrorShape { status: number; code: string; message: string; details?: unknown; requestId?: string; }
export interface LoginInput { identifier: string; password: string; remember: boolean; }
