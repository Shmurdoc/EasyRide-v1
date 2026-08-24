import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePeakHours } from '../hooks/usePeakHours';

const mockGetPeakHours = jest.fn();
const mockCreatePeakHour = jest.fn();
const mockUpdatePeakHour = jest.fn();
const mockDeletePeakHour = jest.fn();
const mockTogglePeakHour = jest.fn();

jest.mock('../api/admin', () => ({
  getPeakHours: (...args: any[]) => mockGetPeakHours(...args),
  createPeakHour: (...args: any[]) => mockCreatePeakHour(...args),
  updatePeakHour: (...args: any[]) => mockUpdatePeakHour(...args),
  deletePeakHour: (...args: any[]) => mockDeletePeakHour(...args),
  togglePeakHour: (...args: any[]) => mockTogglePeakHour(...args),
}));

const mockHour = {
  id: 'ph-1', tenant_id: null, name: 'Morning Rush', day_of_week: 1,
  start_time: '06:00', end_time: '09:00', multiplier: 1.3, is_active: true,
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
};

describe('usePeakHours', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetPeakHours.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePeakHours());
    expect(result.current.loading).toBe(true);
  });

  it('fetches peak hours on mount', async () => {
    mockGetPeakHours.mockResolvedValue({ data: [mockHour], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    const { result } = renderHook(() => usePeakHours());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hours).toHaveLength(1);
    expect(result.current.hours[0].name).toBe('Morning Rush');
  });

  it('setDayFilter refetches', async () => {
    mockGetPeakHours.mockResolvedValue({ data: [mockHour], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    const { result } = renderHook(() => usePeakHours());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetPeakHours.mockResolvedValue({ data: [], current_page: 1, last_page: 0, total: 0, per_page: 50 });
    await act(async () => { result.current.setDayFilter(2); });
    await waitFor(() => expect(result.current.hours).toHaveLength(0));
    expect(result.current.dayFilter).toBe(2);
  });

  it('add creates and prepends', async () => {
    mockGetPeakHours.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 50 });
    mockCreatePeakHour.mockResolvedValue(mockHour);
    const { result } = renderHook(() => usePeakHours());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.add({ name: 'Morning Rush', day_of_week: 1, start_time: '06:00', end_time: '09:00', multiplier: 1.3 }); });
    expect(result.current.hours).toHaveLength(1);
  });

  it('remove deletes from list', async () => {
    mockGetPeakHours.mockResolvedValue({ data: [mockHour], current_page: 1, last_page: 1, total: 1, per_page: 50 });
    mockDeletePeakHour.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePeakHours());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.remove('ph-1'); });
    expect(result.current.hours).toHaveLength(0);
  });
});
