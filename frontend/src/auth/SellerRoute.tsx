import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppLoader from '../components/ui/AppLoader';
import { useAuth } from './AuthProvider';

export default function SellerRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  if (!user.roles.includes('seller')) return <Navigate to={`/seller/onboarding?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />;
  return <Outlet />;
}
