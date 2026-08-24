import React from 'react';
import { waitFor } from '@testing-library/react-native';
import UsersScreen from '../screens/UsersScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: jest.fn(() => ({
    users: [
      { id: 'u1', name: 'John Rider', email: 'john@test.com', phone: '+27123456789',
        role: 'rider', is_active: true, created_at: '2024-01-15T00:00:00Z', last_login_at: '2025-06-10T08:30:00Z' },
    ],
    loading: false,
    error: null,
    refreshing: false,
    refresh: jest.fn(),
    loadMore: jest.fn(),
    filter: 'all',
    setFilter: jest.fn(),
    search: '',
    setSearch: jest.fn(),
    hasMore: false,
  })),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('UsersScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders user list', async () => {
    const { getByText } = renderWithNavigation(
      <UsersScreen />
    );
    await waitFor(() => {
      expect(getByText('John Rider')).toBeTruthy();
      expect(getByText('ACTIVE')).toBeTruthy();
    });
  });

  it('renders loading state', async () => {
    const { useAdminUsers } = require('../hooks/useAdminUsers');
    useAdminUsers.mockReturnValueOnce({
      users: [], loading: true, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <UsersScreen />
    );
    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  it('renders empty state', async () => {
    const { useAdminUsers } = require('../hooks/useAdminUsers');
    useAdminUsers.mockReturnValueOnce({
      users: [], loading: false, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <UsersScreen />
    );
    await waitFor(() => {
      expect(getByText('No users found')).toBeTruthy();
    });
  });
});
