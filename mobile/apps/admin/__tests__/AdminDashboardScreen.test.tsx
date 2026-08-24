import React from 'react';
import { waitFor } from '@testing-library/react-native';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('../hooks/useAdminDashboard', () => ({
  useAdminDashboard: jest.fn(() => ({
    data: {
      totalUsers: 1250,
      totalDrivers: 340,
      totalRides: 15800,
      activeRides: 42,
      totalRevenue: 2450000,
      ridesToday: 185,
      completedToday: 162,
      revenueToday: 28500,
      activePoolRides: 8,
      totalPoolPassengers: 24,
      fleetStatus: { online: 120, offline: 80, onRide: 140, total: 340 },
      activeRidesList: [
        { id: 'r1', passenger: 'John', pickup: 'A', dropoff: 'B', fare: 85, progress: 0.6 },
      ],
      hourly: [{ hour: '06:00', rides: 12 }, { hour: '07:00', rides: 28 }],
      topDrivers: [{ id: 'd1', name: 'Mike', trips: 145, status: 'online' }],
      recentActivity: [{ type: 'ride', message: 'Ride completed', time: '2m ago' }],
    },
    loading: false,
    refreshing: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('AdminDashboardScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders dashboard header', async () => {
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  it('renders total rides metric', async () => {
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('Total Rides')).toBeTruthy();
    });
  });

  it('renders revenue today', async () => {
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('R28,500')).toBeTruthy();
    });
  });

  it('renders loading state', async () => {
    const { useAdminDashboard } = require('../hooks/useAdminDashboard');
    useAdminDashboard.mockReturnValueOnce({
      data: null, loading: true, refreshing: false, error: null, refresh: jest.fn(),
    });
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  it('renders error state', async () => {
    const { useAdminDashboard } = require('../hooks/useAdminDashboard');
    useAdminDashboard.mockReturnValueOnce({
      data: null, loading: false, refreshing: false, error: 'Failed to load', refresh: jest.fn(),
    });
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  it('renders dashboard sections', async () => {
    const { getByText } = renderWithNavigation(
      <AdminDashboardScreen />
    );
    await waitFor(() => {
      expect(getByText('Fleet Status')).toBeTruthy();
      expect(getByText('Active Rides')).toBeTruthy();
      expect(getByText('Top Drivers Today')).toBeTruthy();
    });
  });
});
