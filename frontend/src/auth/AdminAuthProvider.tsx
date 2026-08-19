import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './AuthProvider';
import { adminAuthApi, setAdminAccessToken, type AdminUser } from '../services/apiClient';
import type { AuthUser, UserRole } from '../types/auth';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  authenticated: boolean;
  permissions: string[];
  login: (credentials: { username: string; password: string; remember?: boolean }) => Promise<AdminUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AdminUser | null>;
  clearSession: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * Maps the administrator identity onto the shape existing admin screens expect from
 * `useAuth()`, so the Admin Panel reads the admin session — never the marketplace one.
 */
function asAuthUser(admin: AdminUser | null): AuthUser | null {
  if (!admin) return null;
  return {
    id: admin.id,
    name: admin.name,
    username: admin.username,
    email: admin.email ?? null,
    roles: (admin.roles || []) as UserRole[],
    status: admin.status,
    avatar: admin.avatar ?? null,
    location: { country: 'PK', province: '', city: '', area: '' },
    verification: {
      email: { status: 'not_verified' }, phone: { status: 'not_verified' }, identity: { status: 'not_verified' },
      business: { status: 'not_verified' }, trustedSeller: { status: 'not_verified' },
    },
    seller: { status: 'not_started' },
    preferences: { language: 'en', notifications: {} as AuthUser['preferences']['notifications'] },
  };
}

/**
 * Administrator authentication context.
 *
 * Wraps only /admin routes. It bootstraps from the HttpOnly admin refresh cookie and
 * keeps the short-lived admin access token in memory — it never touches the
 * marketplace session, and the marketplace session never grants admin access here.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => { setAdminAccessToken(null); setAdmin(null); setPermissions([]); }, []);

  const bootstrap = useCallback(async () => {
    try {
      const response = await adminAuthApi.refresh();
      setAdminAccessToken(response.data.accessToken);
      setAdmin(response.data.admin);
      try { setPermissions((await adminAuthApi.me()).data.permissions || []); } catch { setPermissions([]); }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const expire = () => clearSession();
    window.addEventListener('qavlio:admin-session-expired', expire);
    return () => window.removeEventListener('qavlio:admin-session-expired', expire);
  }, [clearSession]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    admin,
    loading,
    authenticated: Boolean(admin),
    permissions,
    async login(credentials) {
      const response = await adminAuthApi.login(credentials);
      setAdminAccessToken(response.data.accessToken);
      setAdmin(response.data.admin);
      try { setPermissions((await adminAuthApi.me()).data.permissions || []); } catch { setPermissions([]); }
      return response.data.admin;
    },
    async logout() { try { await adminAuthApi.logout(); } finally { clearSession(); } },
    async refresh() {
      try {
        const response = await adminAuthApi.refresh();
        setAdminAccessToken(response.data.accessToken);
        setAdmin(response.data.admin);
        return response.data.admin;
      } catch { clearSession(); return null; }
    },
    clearSession,
  }), [admin, clearSession, loading, permissions]);

  // Existing admin screens read the signed-in identity through `useAuth()`. Inside the
  // Admin Panel that identity is the administrator, so the marketplace context is
  // deliberately overridden for this subtree only.
  const compatibilityValue = useMemo(() => {
    const user = asAuthUser(admin);
    return {
      user,
      loading,
      authenticated: Boolean(user),
      isAuthenticated: Boolean(user),
      role: (user?.roles?.[0] ?? null) as UserRole | null,
      hasRole: (role: UserRole) => Boolean(user?.roles.includes(role)),
      login: () => Promise.reject(new Error('Use the admin login form at /admin/login')),
      verifyOtp: () => Promise.reject(new Error('Administrator authentication does not use OTP')),
      refreshProfile: () => Promise.reject(new Error('Admin profiles are managed through the admin API')),
      updateLocalUser: () => undefined,
      logout: value.logout,
      clearSession,
    };
  }, [admin, clearSession, loading, value.logout]);

  return (
    <AdminAuthContext.Provider value={value}>
      <AuthContext.Provider value={compatibilityValue as never}>{children}</AuthContext.Provider>
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
