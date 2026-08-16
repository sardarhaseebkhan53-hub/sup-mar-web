import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setAccessToken, userApi } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const response = await authApi.refresh();
      if (response?.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
      } else setUser(null);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const value = useMemo(() => ({
    user,
    loading,
    authenticated: Boolean(user),
    hasRole: (role) => Boolean(user?.roles?.includes(role)),
    async login(credentials) {
      const response = await authApi.login(credentials);
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      return response.data.user;
    },
    async verifyOtp(payload) {
      const response = await authApi.verifyOtp(payload);
      if (response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
      }
      return response.data;
    },
    async refreshProfile() {
      const response = await userApi.me();
      setUser(response.data);
      return response.data;
    },
    updateLocalUser(nextUser) { setUser(nextUser); },
    async logout() {
      try { await authApi.logout(); } finally { setAccessToken(null); setUser(null); }
    },
    clearSession() { setAccessToken(null); setUser(null); },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export { AuthContext };
