import React, { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, auth } from '../api';
import type { User } from '../types';

const TOKEN_KEY = 'auth_token';

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

  useEffect(() => {
    api.setOnUnauthorized(() => {
      api.clearToken();
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
    });
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        api.setToken(token);
        const user = await auth.me();
        setState({ user, token, isLoading: false, isAuthenticated: true });
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
    return user;
  }, []);

  const register = useCallback(async (data: {
    name: string; email: string; password: string;
    password_confirmation: string; phone_number: string;
  }) => {
    const { user, token } = await auth.register(data);
    api.setToken(token);
    setState({ user, token, isLoading: false, isAuthenticated: true });
    return user;
  }, []);

  const logout = useCallback(async () => {
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
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!stored) {
        setState((prev) => ({ ...prev, token: null, isAuthenticated: false }));
        return null;
      }

      api.setToken(stored);
      await auth.me();
      return stored;
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
