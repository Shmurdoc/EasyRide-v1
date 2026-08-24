jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockApiClient = {
  setToken: jest.fn(),
  clearToken: jest.fn(),
  setOnUnauthorized: jest.fn(),
};

const mockAuthModule = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  me: jest.fn(),
};

jest.mock('../api/client', () => ({
  api: mockApiClient,
}));

jest.mock('../api/index', () => ({
  auth: mockAuthModule,
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../hooks/useAuth';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const mockUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@easyryde.com',
  phone_number: '+27123456789',
  role: 'rider' as const,
  tenant_id: 't1',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login sets user and token', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue(null);

    mockAuthModule.login.mockResolvedValue({ user: mockUser, token: 'test-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@easyryde.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('u1');
    expect(mockApiClient.setToken).toHaveBeenCalledWith('test-token');
  });

  it('register creates account and logs in', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue(null);

    const registerData = {
      name: 'New User',
      email: 'new@easyryde.com',
      password: 'password123',
      password_confirmation: 'password123',
      phone_number: '+27123456789',
    };

    mockAuthModule.register.mockResolvedValue({ user: { ...mockUser, email: 'new@easyryde.com' }, token: 'new-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register(registerData);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('new@easyryde.com');
    expect(mockApiClient.setToken).toHaveBeenCalledWith('new-token');
  });

  it('logout clears auth state', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue(null);

    mockAuthModule.login.mockResolvedValue({ user: mockUser, token: 'test-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@easyryde.com', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);

    mockAuthModule.logout.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockApiClient.clearToken).toHaveBeenCalled();
  });

  it('refreshUser updates user data', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('stored-token');

    mockAuthModule.me.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updatedUser = { ...mockUser, name: 'Updated Name' };
    mockAuthModule.me.mockResolvedValue(updatedUser);

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user?.name).toBe('Updated Name');
  });

  it('loads stored token on mount', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('stored-token');
    mockAuthModule.me.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('stored-token');
    expect(mockApiClient.setToken).toHaveBeenCalledWith('stored-token');
  });

  it('handles invalid stored token gracefully', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue('bad-token');
    mockAuthModule.me.mockRejectedValue(new Error('Token invalid'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('throws if used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
