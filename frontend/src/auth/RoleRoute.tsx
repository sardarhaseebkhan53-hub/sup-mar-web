import { Navigate, Outlet } from 'react-router-dom';
import AppLoader from '../components/ui/AppLoader';
import type { UserRole } from '../types/auth';
import { useAuth } from './AuthProvider';

export default function RoleRoute({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.some((role) => user.roles.includes(role))) return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}
