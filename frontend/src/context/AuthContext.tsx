import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshAccessToken, setSessionExpiredHandler, tokenStore } from '../api/client';
import type { AuthResponse, User } from '../api/types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  /** True until the silent refresh-on-load attempt settles. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startSession = useCallback((data: AuthResponse) => {
    tokenStore.set(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.set(null);
    setAccessToken(null);
    setUser(null);
    queryClient.clear(); // never show one user's cached data to the next
  }, [queryClient]);

  // Silent refresh on mount: the httpOnly cookie re-establishes the session, which is what
  // makes sessions persist across reloads/tabs without re-login (Plan §13, B3).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await refreshAccessToken();
        const { data } = await api.get<User>('/auth/me');
        if (!cancelled) {
          setAccessToken(token);
          setUser({ id: data.id, name: data.name, email: data.email });
        }
      } catch {
        if (!cancelled) tokenStore.set(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When a mid-session refresh fails, drop the session → ProtectedRoute sends us to /login.
  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      return startSession(data);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>('/auth/register', input);
      return startSession(data);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, isLoading, login, register, logout }),
    [user, accessToken, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
