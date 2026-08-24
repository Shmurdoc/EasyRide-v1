import React from 'react';
import { waitFor } from '@testing-library/react-native';
import DriversScreen from '../screens/DriversScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('../hooks/useAdminDrivers', () => ({
  useAdminDrivers: jest.fn(() => ({
    drivers: [
      {
        id: 'd1', name: 'Mike Driver', email: 'mike@test.com', phone: '+27987654321',
        is_online: true, created_at: '2024-06-01T00:00:00Z',
        driverProfile: {
          id: 'dp1', is_approved: true, is_verified: true, rating: 4.8,
          total_trips: 234, total_earnings: 45000,
        },
        vehicle: { make: 'Toyota', model: 'Corolla', year: 2023, color: 'White', license_plate: 'ABC 123 GP', vehicle_type: 'sedan' },
      },
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

describe('DriversScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders driver list', async () => {
    const { getByText } = renderWithNavigation(
      <DriversScreen />
    );
    await waitFor(() => {
      expect(getByText('Mike Driver')).toBeTruthy();
    });
  });

  it('renders vehicle info', async () => {
    const { getByText } = renderWithNavigation(
      <DriversScreen />
    );
    await waitFor(() => {
      expect(getByText(/Toyota Corolla/)).toBeTruthy();
    });
  });

  it('renders loading state', async () => {
    const { useAdminDrivers } = require('../hooks/useAdminDrivers');
    useAdminDrivers.mockReturnValueOnce({
      drivers: [], loading: true, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <DriversScreen />
    );
    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  it('renders empty state', async () => {
    const { useAdminDrivers } = require('../hooks/useAdminDrivers');
    useAdminDrivers.mockReturnValueOnce({
      drivers: [], loading: false, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <DriversScreen />
    );
    await waitFor(() => {
      expect(getByText('No drivers found')).toBeTruthy();
    });
  });
});
