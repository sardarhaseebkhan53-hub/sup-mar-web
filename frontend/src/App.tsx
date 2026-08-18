import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { AiAssistantProvider } from './ai/AiAssistantProvider';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import SellerRoute from './auth/SellerRoute';
import AppLoader from './components/ui/AppLoader';
import { I18nProvider } from './i18n';
import AccountLayout from './layouts/AccountLayout';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/HomePage';
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const ListingDetailsPage = lazy(() => import('./pages/ListingDetailsPage'));
const PostListingPage = lazy(() => import('./pages/PostListingPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const SavedSearchesPage = lazy(() => import('./pages/SavedSearchesPage'));
const FollowingPage = lazy(() => import('./pages/FollowingPage'));
const RecentlyViewedPage = lazy(() => import('./pages/RecentlyViewedPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SafetyCenterPage = lazy(() => import('./pages/SafetyCenterPage'));
const MyReviewsPage = lazy(() => import('./pages/account/MyReviewsPage'));
const MyReportsPage = lazy(() => import('./pages/account/MyReportsPage'));
const SellerReviewsPage = lazy(() => import('./pages/seller/SellerReviewsPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminRiskPage = lazy(() => import('./pages/admin/AdminRiskPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage'));
const SellerAiAssistantPage = lazy(() => import('./pages/seller/SellerAiAssistantPage'));
const AdminAiSettingsPage = lazy(() => import('./pages/admin/AdminAiSettingsPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const PhoneLoginPage = lazy(() => import('./pages/auth/PhoneLoginPage'));
const OtpVerificationPage = lazy(() => import('./pages/auth/OtpVerificationPage'));
const EmailVerificationPage = lazy(() => import('./pages/auth/EmailVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const VerificationCenterPage = lazy(() => import('./pages/account/VerificationCenterPage'));
const SecurityPage = lazy(() => import('./pages/account/SecurityPage'));
const NotificationPreferencesPage = lazy(() => import('./pages/account/NotificationPreferencesPage'));
const AccountSettingsPage = lazy(() => import('./pages/account/AccountSettingsPage'));
const SellerOnboardingPage = lazy(() => import('./pages/account/SellerOnboardingPage'));
const CustomerDashboardPage = lazy(() => import('./pages/dashboards/CustomerDashboardPage'));
const SellerDashboardPage = lazy(() => import('./pages/dashboards/SellerDashboardPage'));
const SellerProfilePage = lazy(() => import('./pages/seller/SellerProfilePage'));
const SellerListingsPage = lazy(() => import('./pages/seller/SellerListingsPage'));
const SellerListingDetailPage = lazy(() => import('./pages/seller/SellerListingDetailPage'));
const PublicSellerPage = lazy(() => import('./pages/seller/PublicSellerPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const SellerBillingPage = lazy(() => import('./pages/seller/SellerBillingPage'));
const PaymentDetailPage = lazy(() => import('./pages/seller/PaymentDetailPage'));
const PromoteListingPage = lazy(() => import('./pages/seller/PromoteListingPage'));
const SellerPromotionsPage = lazy(() => import('./pages/seller/SellerPromotionsPage'));
const SellerPackagesPage = lazy(() => import('./pages/seller/SellerPackagesPage'));
const SellerAnalyticsPage = lazy(() => import('./pages/seller/SellerAnalyticsPage'));
const AdminRevenuePage = lazy(() => import('./pages/admin/AdminRevenuePage'));
const AdminMonetizationSettingsPage = lazy(() => import('./pages/admin/AdminMonetizationSettingsPage'));
const AdminDashboardPage = lazy(() => import('./pages/dashboards/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AdminAdvertisementsPage = lazy(() => import('./pages/admin/AdminAdvertisementsPage'));
const AdAnalyticsPage = lazy(() => import('./pages/admin/AdAnalyticsPage'));
const AdminSellersPage = lazy(() => import('./pages/admin/AdminSellersPage'));
const AdminListingsPage = lazy(() => import('./pages/admin/AdminListingsPage'));
const AdminListingDetailPage = lazy(() => import('./pages/admin/AdminListingDetailPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminReportDetailPage = lazy(() => import('./pages/admin/AdminReportDetailPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminPaymentDetailPage = lazy(() => import('./pages/admin/AdminPaymentDetailPage'));
const AdminPromotionsPage = lazy(() => import('./pages/admin/AdminPromotionsPage'));
const AdminMarketplaceAnalyticsPage = lazy(() => import('./pages/admin/AdminMarketplaceAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminPackagesPage = lazy(() => import('./pages/admin/AdminPackagesPage'));
const AdminTrustSafetyPage = lazy(() => import('./pages/admin/AdminTrustSafetyPage'));
const AdminSupportPage = lazy(() => import('./pages/admin/AdminSupportPage'));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AdminSearchPage = lazy(() => import('./pages/admin/AdminSearchPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

export default function App() {
  return <QueryClientProvider client={queryClient}><I18nProvider><AuthProvider><AiAssistantProvider><Suspense fallback={<AppLoader />}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/marketplace" element={<CategoryPage />} />
      <Route path="/marketplace/:categorySlug" element={<CategoryPage />} />
      <Route path="/search" element={<CategoryPage />} />
      <Route path="/browse" element={<CategoryPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/category/:categorySlug" element={<CategoryPage />} />
      <Route path="/listing/:slug" element={<ListingDetailsPage />} />
      <Route path="/listing/:listingId/:slug" element={<ListingDetailsPage />} />
      <Route path="/seller/:username" element={<PublicSellerPage />} />
      <Route path="/about" element={<InfoPage kind="about" />} />
      <Route path="/contact" element={<InfoPage kind="contact" />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/ai-assistant" element={<AiAssistantPage />} />
      <Route path="/safety" element={<SafetyCenterPage />} />
      <Route path="/safety/:slug" element={<SafetyCenterPage />} />
      <Route path="/terms" element={<InfoPage kind="terms" />} />
      <Route path="/privacy" element={<InfoPage kind="privacy" />} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/phone" element={<PhoneLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    <Route element={<ProtectedRoute roles={['customer', 'seller', 'admin', 'super_admin', 'support', 'moderator', 'finance']} />}>
      <Route element={<PublicLayout />}><Route path="/saved" element={<SavedPage />} /><Route path="/favorites" element={<SavedPage />} /><Route path="/wishlist" element={<SavedPage />} /><Route path="/saved-searches" element={<SavedSearchesPage />} /><Route path="/following" element={<FollowingPage />} /><Route path="/messages" element={<MessagesPage />} /><Route path="/messages/:conversationId" element={<MessagesPage />} /><Route path="/notifications" element={<NotificationsPage />} /></Route>
      <Route element={<AccountLayout />}><Route path="/account/profile" element={<ProfilePage />} /><Route path="/account/verification" element={<VerificationCenterPage />} /><Route path="/account/security" element={<SecurityPage />} /><Route path="/account/notifications" element={<NotificationPreferencesPage />} /><Route path="/settings/notifications" element={<NotificationPreferencesPage />} /><Route path="/account/settings" element={<AccountSettingsPage />} /></Route>
      <Route path="/account" element={<CustomerDashboardPage />} />
      <Route path="/dashboard" element={<CustomerDashboardPage />} />
      <Route path="/dashboard/saved-searches" element={<SavedSearchesPage />} />
      <Route path="/dashboard/recent" element={<RecentlyViewedPage />} />
      <Route path="/dashboard/reports" element={<MyReportsPage />} />
      <Route path="/dashboard/reviews" element={<MyReviewsPage />} />
      <Route path="/seller/onboarding" element={<SellerOnboardingPage />} />
    </Route>

    <Route element={<SellerRoute />}>
      <Route path="/sell" element={<PostListingPage />} />
      <Route path="/seller" element={<SellerDashboardPage />} />
      <Route path="/seller/listings" element={<SellerListingsPage />} />
      <Route path="/seller/listings/new" element={<PostListingPage />} />
      <Route path="/seller/listings/:id" element={<SellerListingDetailPage />} />
      <Route path="/seller/listings/:id/edit" element={<PostListingPage />} />
      <Route path="/seller/listings/:id/promote" element={<PromoteListingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} /><Route path="/checkout/listing" element={<CheckoutPage />} />
      <Route path="/seller/payments" element={<SellerBillingPage />} /><Route path="/seller/payments/:id" element={<PaymentDetailPage />} />
      <Route path="/seller/transactions" element={<SellerBillingPage />} /><Route path="/seller/transactions/:id" element={<PaymentDetailPage />} />
      <Route path="/seller/promotions" element={<SellerPromotionsPage />} /><Route path="/seller/packages" element={<SellerPackagesPage />} />
      <Route path="/seller/drafts" element={<SellerListingsPage forcedStatus="draft" />} />
      <Route path="/seller/sold" element={<SellerListingsPage forcedStatus="sold" />} />
      <Route path="/seller/ai-assistant" element={<SellerAiAssistantPage />} />
      <Route path="/seller/profile" element={<SellerProfilePage />} />
      <Route path="/seller/settings" element={<SellerProfilePage settings />} />
      <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
      <Route path="/seller/reviews" element={<SellerReviewsPage />} />
    </Route>

    <Route element={<ProtectedRoute roles={['admin', 'super_admin', 'moderator', 'support', 'finance']} />}>
      <Route path="/admin" element={<AdminDashboardPage />} /><Route path="/admin/dashboard" element={<AdminDashboardPage />} /><Route path="/admin/users" element={<AdminUsersPage />} /><Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
      <Route path="/admin/sellers" element={<AdminSellersPage />} /><Route path="/admin/listings" element={<AdminListingsPage />} /><Route path="/admin/listings/:id" element={<AdminListingDetailPage />} /><Route path="/admin/categories" element={<AdminCategoriesPage />} />
      <Route path="/admin/reports" element={<AdminReportsPage />} /><Route path="/admin/reports/:id" element={<AdminReportDetailPage />} /><Route path="/admin/moderation" element={<AdminReportsPage moderation />} />
      <Route path="/admin/reviews" element={<AdminReviewsPage />} /><Route path="/admin/risk" element={<AdminRiskPage />} />
      <Route path="/admin/payments" element={<AdminPaymentsPage />} /><Route path="/admin/payments/:id" element={<AdminPaymentDetailPage />} /><Route path="/admin/promotions" element={<AdminPromotionsPage />} />
      <Route path="/admin/advertisements" element={<AdminAdvertisementsPage />} /><Route path="/admin/ads" element={<AdminAdvertisementsPage />} /><Route path="/admin/advertisements/analytics" element={<AdAnalyticsPage />} /><Route path="/admin/ads/analytics" element={<AdAnalyticsPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} /><Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} /><Route path="/admin/packages" element={<AdminPackagesPage />} />
      <Route path="/admin/trust-safety" element={<AdminTrustSafetyPage />} /><Route path="/admin/support" element={<AdminSupportPage />} /><Route path="/admin/support/:id" element={<AdminSupportPage />} /><Route path="/admin/notifications" element={<AdminNotificationsPage />} /><Route path="/admin/search" element={<AdminSearchPage />} />
      <Route path="/admin/ai" element={<AdminAiSettingsPage />} /><Route path="/admin/analytics" element={<AdminMarketplaceAnalyticsPage />} /><Route path="/admin/revenue" element={<AdminRevenuePage />} /><Route path="/admin/settings" element={<AdminSettingsPage />} /><Route path="/admin/settings/monetization" element={<AdminMonetizationSettingsPage />} /><Route path="/admin/settings/ai" element={<AdminAiSettingsPage />} /><Route path="/admin/activity" element={<AdminActivityPage />} /><Route path="/admin/audit-logs" element={<AdminActivityPage />} />
    </Route>
    <Route path="/access-denied" element={<AccessDeniedPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></AiAssistantProvider></AuthProvider></I18nProvider></QueryClientProvider>;
}
