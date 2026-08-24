import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import RidesScreen from '../screens/RidesScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('../hooks/useAdminRides', () => ({
  useAdminRides: jest.fn(() => ({
    rides: [
      {
        id: 'ride-1', status: 'in_progress', category: 'economy',
        pickup_address: '45 Selati Road', dropoff_address: 'Mall of the North',
        total_fare: 145, distance_km: 8.2, duration_minutes: 15,
        created_at: '2025-01-15T10:30:00Z', completed_at: null, cancelled_at: null,
        rider: { name: 'John Rider' },
        driver: { name: 'Mike Driver', vehicle: { make: 'Toyota', model: 'Corolla' } },
        payment: { method: 'cash', status: 'pending', amount: 145 },
        rating: null,
        pickup_lat: -23.94, pickup_lng: 31.08, dropoff_lat: -23.88, dropoff_lng: 31.08,
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

describe('RidesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders ride list', async () => {
    const { getByText } = renderWithNavigation(
      <RidesScreen />
    );
    await waitFor(() => {
      expect(getByText('45 Selati Road')).toBeTruthy();
    });
  });

  it('renders loading state', async () => {
    const { useAdminRides } = require('../hooks/useAdminRides');
    useAdminRides.mockReturnValueOnce({
      rides: [], loading: true, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <RidesScreen />
    );
    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  it('renders empty state', async () => {
    const { useAdminRides } = require('../hooks/useAdminRides');
    useAdminRides.mockReturnValueOnce({
      rides: [], loading: false, error: null, refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <RidesScreen />
    );
    await waitFor(() => {
      expect(getByText('No rides found')).toBeTruthy();
    });
  });

  it('renders error state', async () => {
    const { useAdminRides } = require('../hooks/useAdminRides');
    useAdminRides.mockReturnValueOnce({
      rides: [], loading: false, error: 'Failed to load rides', refreshing: false,
      refresh: jest.fn(), loadMore: jest.fn(), filter: 'all', setFilter: jest.fn(),
      search: '', setSearch: jest.fn(), hasMore: false,
    });
    const { getByText } = renderWithNavigation(
      <RidesScreen />
    );
    await waitFor(() => {
      expect(getByText(/Failed/)).toBeTruthy();
    });
  });
});
