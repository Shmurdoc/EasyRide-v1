import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSurgeZones } from '../hooks/useSurgePricing';

const mockGetSurgeZones = jest.fn();
const mockCreateSurgeZone = jest.fn();
const mockUpdateSurgeZone = jest.fn();
const mockDeleteSurgeZone = jest.fn();
const mockToggleSurgeZone = jest.fn();

jest.mock('../api/admin', () => ({
  getSurgeZones: (...args: any[]) => mockGetSurgeZones(...args),
  createSurgeZone: (...args: any[]) => mockCreateSurgeZone(...args),
  updateSurgeZone: (...args: any[]) => mockUpdateSurgeZone(...args),
  deleteSurgeZone: (...args: any[]) => mockDeleteSurgeZone(...args),
  toggleSurgeZone: (...args: any[]) => mockToggleSurgeZone(...args),
}));

const mockZone = {
  id: 'sz-1', tenant_id: null, name: 'CBD Zone', center_lat: -23.94, center_lng: 31.08,
  radius_meters: 2000, multiplier: 1.5, is_active: true,
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
};

describe('useSurgeZones', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetSurgeZones.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSurgeZones());
    expect(result.current.loading).toBe(true);
  });

  it('fetches zones on mount', async () => {
    mockGetSurgeZones.mockResolvedValue({ data: [mockZone], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    const { result } = renderHook(() => useSurgeZones());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.zones).toHaveLength(1);
    expect(result.current.zones[0].name).toBe('CBD Zone');
  });

  it('add creates and prepends zone', async () => {
    mockGetSurgeZones.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 50 });
    mockCreateSurgeZone.mockResolvedValue(mockZone);
    const { result } = renderHook(() => useSurgeZones());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.add({ name: 'CBD Zone', center_lat: -23.94, center_lng: 31.08, radius_meters: 2000, multiplier: 1.5 }); });
    expect(result.current.zones).toHaveLength(1);
  });

  it('remove deletes zone from list', async () => {
    mockGetSurgeZones.mockResolvedValue({ data: [mockZone], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    mockDeleteSurgeZone.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSurgeZones());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.remove('sz-1'); });
    expect(result.current.zones).toHaveLength(0);
  });

  it('toggle updates zone in list', async () => {
    mockGetSurgeZones.mockResolvedValue({ data: [mockZone], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    mockToggleSurgeZone.mockResolvedValue({ ...mockZone, is_active: false });
    const { result } = renderHook(() => useSurgeZones());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.toggle('sz-1'); });
    expect(result.current.zones[0].is_active).toBe(false);
  });
});
