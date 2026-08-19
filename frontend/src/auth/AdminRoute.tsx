import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppLoader from '../components/ui/AppLoader';
import { useAdminAuth } from './AdminAuthProvider';

/**
 * Admin Panel route guard.
 *
 * Logged out administrators go to /admin/login?returnTo=… — never to the
 * marketplace /login route, which prevents the previous redirect loop.
 */
export default function AdminRoute() {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) return <AppLoader />;
  if (!admin) {
    const returnTo = `${location.pathname}${location.search}`;
    const query = returnTo && returnTo !== '/admin/dashboard' ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    return <Navigate to={`/admin/login${query}`} replace />;
  }
  return <Outlet />;
}
