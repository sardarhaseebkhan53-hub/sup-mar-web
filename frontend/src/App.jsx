import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import SellerRoute from './auth/SellerRoute';
import AppLoader from './components/ui/AppLoader';
import { I18nProvider } from './i18n';
import AccountLayout from './layouts/AccountLayout';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ListingDetailsPage = lazy(() => import('./pages/ListingDetailsPage'));
const PostListingPage = lazy(() => import('./pages/PostListingPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
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
const AdminDashboardPage = lazy(() => import('./pages/dashboards/AdminDashboardPage'));
const DashboardFeaturePage = lazy(() => import('./pages/dashboards/DashboardFeaturePage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const feature = (role, title, description, planned) => <DashboardFeaturePage role={role} title={title} description={description} planned={planned} />;

export default function App() {
  return <I18nProvider><AuthProvider><Suspense fallback={<AppLoader />}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<CategoryPage />} />
      <Route path="/category/:categorySlug" element={<CategoryPage />} />
      <Route path="/listing/:listingId/:slug" element={<ListingDetailsPage />} />
      <Route path="/help" element={<HelpPage />} />
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

    <Route element={<ProtectedRoute roles={['customer', 'seller', 'admin', 'super_admin', 'support', 'moderator']} />}>
      <Route element={<PublicLayout />}>
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/messages" element={<MessagesPage />} />
      </Route>
      <Route element={<AccountLayout />}>
        <Route path="/account/profile" element={<ProfilePage />} />
        <Route path="/account/verification" element={<VerificationCenterPage />} />
        <Route path="/account/security" element={<SecurityPage />} />
        <Route path="/account/notifications" element={<NotificationPreferencesPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
      </Route>
      <Route path="/dashboard" element={<CustomerDashboardPage />} />
      <Route path="/dashboard/saved-searches" element={feature('customer', 'Saved searches', 'Get notified when matching items are listed.', ['Named search criteria', 'Alert cadence', 'Pause and delete controls'])} />
      <Route path="/dashboard/recent" element={feature('customer', 'Recently viewed', 'A private history of listings you recently explored.', ['Private viewing history', 'Clear history', 'Cross-device synchronization'])} />
      <Route path="/dashboard/reports" element={feature('customer', 'My reports', 'Track the status of listing and profile safety reports.', ['Report status', 'Moderation updates', 'Support escalation'])} />
      <Route path="/seller/onboarding" element={<SellerOnboardingPage />} />
    </Route>

    <Route element={<SellerRoute />}>
      <Route element={<PublicLayout />}><Route path="/sell" element={<PostListingPage />} /></Route>
      <Route path="/seller" element={<SellerDashboardPage />} />
      <Route path="/seller/listings" element={feature('seller', 'My listings', 'Manage active marketplace inventory.', ['Listing status', 'Edit and archive', 'Mark as sold'])} />
      <Route path="/seller/drafts" element={feature('seller', 'Draft listings', 'Continue securely saved listing drafts.', ['Autosave revisions', 'Category validation', 'Submit for review'])} />
      <Route path="/seller/sold" element={feature('seller', 'Sold items', 'Review items marked as sold.', ['Sale outcome', 'Review eligibility', 'Relist controls'])} />
      <Route path="/seller/analytics" element={feature('seller', 'Listing analytics', 'Understand qualified views and buyer interest.', ['Views and saves', 'Inquiries', 'Promotion performance'])} />
      <Route path="/seller/promotions" element={feature('seller', 'Promotions', 'Purchase transparent, time-bound listing visibility.', ['Server pricing quotes', 'Featured placement', 'Entitlement history'])} />
      <Route path="/seller/payments" element={feature('seller', 'Payments', 'View receipts and marketplace payment history.', ['Payment attempts', 'Receipts', 'Refund status'])} />
    </Route>

    <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
      <Route path="/admin/listings" element={feature('admin', 'Listing operations', 'Review marketplace inventory and account ownership.', ['Search and filters', 'Status history', 'Audited actions'])} />
      <Route path="/admin/moderation" element={feature('admin', 'Moderation queue', 'Resolve user and system-generated trust cases.', ['Priority queue', 'Evidence controls', 'Appeals and audit'])} />
      <Route path="/admin/revenue" element={feature('admin', 'Revenue', 'Financial truth will come from the immutable ledger.', ['Listing fees', 'Promotions', 'Advertising'])} />
      <Route path="/admin/analytics" element={feature('admin', 'Platform analytics', 'Monitor identity, supply, safety, and commercial health.', ['Account growth', 'Verification conversion', 'Security trends'])} />
      <Route path="/admin/settings" element={feature('admin', 'System settings', 'Publish versioned marketplace configuration.', ['Feature flags', 'Pricing policies', 'Language settings'])} />
    </Route>
    <Route path="/access-denied" element={<AccessDeniedPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></AuthProvider></I18nProvider>;
}
