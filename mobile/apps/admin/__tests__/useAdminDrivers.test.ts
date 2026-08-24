import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAdminDrivers } from '../hooks/useAdminDrivers';

const mockGetAdminDrivers = jest.fn();

jest.mock('../api/admin', () => ({
  getAdminDrivers: (...args: any[]) => mockGetAdminDrivers(...args),
}));

const mockResponse = {
  data: [{ id: 'd1', name: 'Mike Driver', email: 'mike@test.com', phone: '+27987654321', is_online: true, created_at: '2024-06-01T00:00:00Z', driverProfile: { id: 'dp1', is_approved: true, is_verified: true, rating: 4.8, total_trips: 234, total_earnings: 45000, license_number: 'DL123456', license_expiry: '2027-01-01', background_check: true, approved_at: null, approved_by: null, latitude: null, longitude: null, current_zone: null }, vehicle: { id: 'v1', make: 'Toyota', model: 'Corolla', year: 2023, color: 'White', license_plate: 'ABC 123 GP', vehicle_type: 'sedan' } }],
  current_page: 1, last_page: 1, total: 1, per_page: 15,
};

describe('useAdminDrivers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetAdminDrivers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminDrivers());
    expect(result.current.loading).toBe(true);
  });

  it('fetches drivers on mount', async () => {
    mockGetAdminDrivers.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useAdminDrivers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drivers).toHaveLength(1);
    expect(result.current.drivers[0].name).toBe('Mike Driver');
  });

  it('handles error', async () => {
    mockGetAdminDrivers.mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useAdminDrivers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('API error');
  });

  it('handles empty response', async () => {
    mockGetAdminDrivers.mockResolvedValue({ data: [], current_page: 1, last_page: 0, total: 0, per_page: 15 });
    const { result } = renderHook(() => useAdminDrivers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.drivers).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('refresh resets data', async () => {
    mockGetAdminDrivers.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useAdminDrivers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetAdminDrivers.mockResolvedValue(mockResponse);
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });
});
