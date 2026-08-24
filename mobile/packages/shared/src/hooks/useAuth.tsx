import React, { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, auth } from '../api';
import type { User } from '../types';

const TOKEN_KEY = 'auth_token';
const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const TOKEN_EXPIRY_MS = 120 * 60 * 1000;

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    name: string; email: string; password: string;
    password_confirmation: string; phone_number: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.setOnUnauthorized(() => {
      api.clearToken();
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      clearRefreshTimer();
    });
    loadStoredAuth();
    return () => clearRefreshTimer();
  }, []);

  function clearRefreshTimer() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  function scheduleTokenRefresh(tokenCreatedAt: number) {
    clearRefreshTimer();
    const elapsed = Date.now() - tokenCreatedAt;
    const msUntilRefresh = Math.max(TOKEN_EXPIRY_MS - TOKEN_REFRESH_MARGIN_MS - elapsed, 60_000);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const newToken = await auth.refresh();
        if (newToken) {
          api.setToken(newToken);
          await SecureStore.setItemAsync(TOKEN_KEY, newToken);
          const user = await auth.me();
          setState((prev) => ({ ...prev, token: newToken, user }));
          scheduleTokenRefresh(Date.now());
        }
      } catch {
        api.clearToken();
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    }, msUntilRefresh);
  }

  async function loadStoredAuth() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        api.setToken(token);
        const user = await auth.me();
        setState({ user, token, isLoading: false, isAuthenticated: true });
        scheduleTokenRefresh(Date.now() - TOKEN_EXPIRY_MS + TOKEN_REFRESH_MARGIN_MS + 60_000);
      } else {
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    } catch (err: unknown) {
      api.clearToken();
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await auth.login(email, password);
    api.setToken(token);
    setState({ user, token, isLoading: false, isAuthenticated: true });
    scheduleTokenRefresh(Date.now());
    return user;
  }, []);

  const register = useCallback(async (data: {
    name: string; email: string; password: string;
    password_confirmation: string; phone_number: string;
  }) => {
    const { user, token } = await auth.register(data);
    api.setToken(token);
    setState({ user, token, isLoading: false, isAuthenticated: true });
    scheduleTokenRefresh(Date.now());
    return user;
  }, []);

  const logout = useCallback(async () => {
    clearRefreshTimer();
    try { await auth.logout(); } catch {}
    api.clearToken();
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await auth.me();
      setState((prev) => ({ ...prev, user }));
    } catch {}
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const newToken = await auth.refresh();
      if (newToken) {
        api.setToken(newToken);
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        const user = await auth.me();
        setState({ user, token: newToken, isLoading: false, isAuthenticated: true });
        scheduleTokenRefresh(Date.now());
        return newToken;
      }
      return null;
    } catch {
      api.clearToken();
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
