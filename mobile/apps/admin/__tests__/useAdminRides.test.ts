import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAdminRides } from '../hooks/useAdminRides';

const mockGetAdminRides = jest.fn();

jest.mock('../api/admin', () => ({
  getAdminRides: (...args: any[]) => mockGetAdminRides(...args),
}));

const mockPage1 = {
  data: [{ id: 'r1', status: 'in_progress', category: 'economy', pickup_address: 'A', dropoff_address: 'B', total_fare: 100, distance_km: 5, duration_minutes: 10, created_at: '2025-01-01T00:00:00Z', completed_at: null, cancelled_at: null, rider: { id: 'r1', name: 'John', email: 'j@t.com', phone: '123' }, driver: null, payment: null, rating: null, pickup_lat: 0, pickup_lng: 0, dropoff_lat: 0, dropoff_lng: 0 }],
  current_page: 1, last_page: 2, total: 2, per_page: 15,
};

const mockPage2 = {
  data: [{ id: 'r2', status: 'completed', category: 'premium', pickup_address: 'C', dropoff_address: 'D', total_fare: 200, distance_km: 10, duration_minutes: 20, created_at: '2025-01-02T00:00:00Z', completed_at: '2025-01-02T01:00:00Z', cancelled_at: null, rider: { id: 'r2', name: 'Jane', email: 'j@t.com', phone: '456' }, driver: null, payment: null, rating: null, pickup_lat: 0, pickup_lng: 0, dropoff_lat: 0, dropoff_lng: 0 }],
  current_page: 2, last_page: 2, total: 2, per_page: 15,
};

describe('useAdminRides', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetAdminRides.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminRides());
    expect(result.current.loading).toBe(true);
    expect(result.current.rides).toEqual([]);
  });

  it('fetches rides on mount', async () => {
    mockGetAdminRides.mockResolvedValue(mockPage1);
    const { result } = renderHook(() => useAdminRides());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rides).toHaveLength(1);
    expect(result.current.rides[0].id).toBe('r1');
  });

  it('handles error', async () => {
    mockGetAdminRides.mockRejectedValue(new Error('Failed to load rides'));
    const { result } = renderHook(() => useAdminRides());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load rides');
  });

  it('loadMore appends data', async () => {
    mockGetAdminRides.mockResolvedValue(mockPage1);
    const { result } = renderHook(() => useAdminRides());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetAdminRides.mockResolvedValue(mockPage2);
    await act(async () => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.rides).toHaveLength(2));
  });

  it('refresh resets page', async () => {
    mockGetAdminRides.mockResolvedValue(mockPage1);
    const { result } = renderHook(() => useAdminRides());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetAdminRides.mockResolvedValue(mockPage1);
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });

  it('setFilter refetches', async () => {
    mockGetAdminRides.mockResolvedValue(mockPage1);
    const { result } = renderHook(() => useAdminRides());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetAdminRides.mockResolvedValue(mockPage1);
    await act(async () => { result.current.setFilter('completed'); });
    await waitFor(() => expect(result.current.filter).toBe('completed'));
  });
});
