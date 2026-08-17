import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppLoader from '../components/ui/AppLoader';
import { useAuth } from './AuthProvider';

interface AuthUser { roles?: string[]; }
interface ProtectedRouteProps { roles?: string[]; }

export default function ProtectedRoute({ roles = [] }: ProtectedRouteProps) {
  const { user, loading } = useAuth() as { user: AuthUser | null; loading: boolean };
  const location = useLocation();
  if (loading) return <AppLoader />;
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace state={{ protectedAction: true }} />;
  }
  if (roles.length && !roles.some((role) => user.roles?.includes(role))) return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}
