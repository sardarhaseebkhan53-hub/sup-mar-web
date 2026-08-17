import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, setAccessToken, userApi } from '../services/apiClient';
import type { AuthUser, LoginInput, UserRole } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  hasRole: (role: UserRole) => boolean;
  login: (credentials: LoginInput) => Promise<AuthUser>;
  verifyOtp: (payload: unknown) => Promise<{ user: AuthUser; accessToken?: string; verified?: boolean }>;
  refreshProfile: () => Promise<AuthUser>;
  updateLocalUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const primaryRole = (user: AuthUser | null): UserRole | null => {
  if (!user) return null;
  return user.roles.find((role) => ['super_admin', 'admin', 'seller', 'customer'].includes(role)) || user.roles[0] || null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const clearSession = useCallback(() => { setAccessToken(null); setUser(null); }, []);

  const bootstrap = useCallback(async () => {
    try {
      const response = await authApi.refresh();
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
    } catch { clearSession(); }
    finally { setLoading(false); }
  }, [clearSession]);
  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const expire = () => clearSession();
    window.addEventListener('qavlio:session-expired', expire);
    return () => window.removeEventListener('qavlio:session-expired', expire);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, authenticated: Boolean(user), isAuthenticated: Boolean(user), role: primaryRole(user),
    hasRole: (role) => Boolean(user?.roles.includes(role)),
    async login(credentials) { const response = await authApi.login(credentials); setAccessToken(response.data.accessToken); setUser(response.data.user); return response.data.user; },
    async verifyOtp(payload) { const response = await authApi.verifyOtp(payload); if (response.data.accessToken) { setAccessToken(response.data.accessToken); setUser(response.data.user); } return response.data; },
    async refreshProfile() { const response = await userApi.me(); setUser(response.data); return response.data; },
    updateLocalUser(nextUser) { setUser(nextUser); },
    async logout() { try { await authApi.logout(); } finally { clearSession(); } },
    clearSession,
  }), [clearSession, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
export { AuthContext };
