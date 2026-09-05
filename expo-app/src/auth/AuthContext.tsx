import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setToken , get, post } from '../api/client';
import { getStoredToken, setStoredToken } from '../api/storage';
import type { User } from '../types';

type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const persistToken = useCallback(async (t: string | null) => {
    setToken(t);
    setTokenState(t);
    await setStoredToken(t);
  }, []);

  // Restore session on startup.
  useEffect(() => {
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        setStatus('guest');
        return;
      }
      setToken(stored);
      setTokenState(stored);
      try {
        const res = await get<{ user: User | null }>('/api/auth/me');
        if (res.user) {
          setUserState(res.user);
          setStatus('authed');
        } else {
          await persistToken(null);
          setStatus('guest');
        }
      } catch {
        setStatus('guest');
      }
    })();
  }, [persistToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await post<{ message: string; user: User; token?: string }>(
        '/api/auth/login',
        { email, password }
      );
      const t = res.token ?? null;
      await persistToken(t);
      setUserState(res.user);
      setStatus('authed');
      return res.user;
    },
    [persistToken]
  );

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      confirmPassword: string;
    }) => {
      const res = await post<{ message: string; user: User; token?: string }>(
        '/api/auth/register',
        data
      );
      const t = res.token ?? null;
      await persistToken(t);
      setUserState(res.user);
      setStatus('authed');
      return res.user;
    },
    [persistToken]
  );

  const logout = useCallback(async () => {
    try {
      await post('/api/auth/logout', undefined, true);
    } catch {
      // ignore — still clear local session
    }
    await persistToken(null);
    setUserState(null);
    setStatus('guest');
  }, [persistToken]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await get<{ user: User | null }>('/api/auth/me');
      if (res.user) {
        setUserState(res.user);
        return res.user;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      login,
      register,
      logout,
      refreshUser,
      setUser: setUserState,
    }),
    [status, user, token, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}