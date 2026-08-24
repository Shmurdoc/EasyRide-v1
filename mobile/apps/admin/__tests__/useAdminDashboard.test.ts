import { renderHook, waitFor } from '@testing-library/react-native';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

const mockGetAdminDashboard = jest.fn();

jest.mock('../api/admin', () => ({
  getAdminDashboard: () => mockGetAdminDashboard(),
}));

const mockRawResponse = {
  total_users: 1250, total_drivers: 340, total_rides: 15800, active_rides: 42,
  total_revenue: 2450000, rides_today: 185, completed_today: 162, revenue_today: 28500,
  active_pool_rides: 8, total_pool_passengers: 24,
  fleet_online: 120, fleet_offline: 80, fleet_on_ride: 140,
  active_rides_list: [{ id: 'r1', passenger: 'John', pickup: 'A', dropoff: 'B', fare: 85, progress: 0.6 }],
  hourly: [{ hour: '06:00', rides: 12 }],
  top_drivers: [{ id: 'd1', name: 'Mike', trips: 145, status: 'online' }],
  recent_activity: [{ type: 'ride_completed', message: 'Ride done', time: '2m ago' }],
};

describe('useAdminDashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetAdminDashboard.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminDashboard());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches and maps dashboard data', async () => {
    mockGetAdminDashboard.mockResolvedValue(mockRawResponse);
    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totalUsers).toBe(1250);
    expect(result.current.data?.totalDrivers).toBe(340);
    expect(result.current.data?.activeRides).toBe(42);
    expect(result.current.data?.fleetStatus?.online).toBe(120);
    expect(result.current.error).toBeNull();
  });

  it('handles error state', async () => {
    mockGetAdminDashboard.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Network error');
  });

  it('sets default values for missing fields', async () => {
    mockGetAdminDashboard.mockResolvedValue({});
    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totalUsers).toBe(0);
    expect(result.current.data?.totalDrivers).toBe(0);
    expect(result.current.data?.fleetStatus?.online).toBe(0);
  });

  it('refresh refetches data', async () => {
    mockGetAdminDashboard.mockResolvedValue(mockRawResponse);
    const { result } = renderHook(() => useAdminDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetAdminDashboard.mockResolvedValue({ ...mockRawResponse, total_users: 1300 });
    result.current.refresh();
    await waitFor(() => expect(result.current.data?.totalUsers).toBe(1300));
  });
});
