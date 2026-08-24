import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAdminSettings } from '../hooks/useAdminSettings';

const mockGetAdminSettings = jest.fn();
const mockUpdateAdminSetting = jest.fn();

jest.mock('../api/admin', () => ({
  getAdminSettings: () => mockGetAdminSettings(),
  updateAdminSetting: (data: any) => mockUpdateAdminSetting(data),
}));

const mockSettings = {
  base_fare: { value: '25', type: 'number', description: null },
  per_km_rate: { value: '8', type: 'number', description: null },
  per_minute_rate: { value: '1.5', type: 'number', description: null },
  surge_multiplier: { value: '1', type: 'number', description: null },
  max_surge: { value: '2.5', type: 'number', description: null },
  push_notifications: { value: '1', type: 'boolean', description: null },
  email_notifications: { value: '0', type: 'boolean', description: null },
  sms_notifications: { value: '0', type: 'boolean', description: null },
};

describe('useAdminSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetAdminSettings.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminSettings());
    expect(result.current.loading).toBe(true);
  });

  it('fetches and maps settings', async () => {
    mockGetAdminSettings.mockResolvedValue(mockSettings);
    const { result } = renderHook(() => useAdminSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.base_fare).toBe(25);
    expect(result.current.settings.push_notifications).toBe(true);
    expect(result.current.settings.email_notifications).toBe(false);
  });

  it('handles error', async () => {
    mockGetAdminSettings.mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useAdminSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed');
  });

  it('updateSetting calls API and updates local state', async () => {
    mockGetAdminSettings.mockResolvedValue(mockSettings);
    mockUpdateAdminSetting.mockResolvedValue({ id: 's1' });
    const { result } = renderHook(() => useAdminSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.updateSetting('base_fare', 30); });
    expect(mockUpdateAdminSetting).toHaveBeenCalled();
    expect(result.current.settings.base_fare).toBe(30);
  });

  it('uses defaults for missing settings', async () => {
    mockGetAdminSettings.mockResolvedValue({});
    const { result } = renderHook(() => useAdminSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.base_fare).toBe(25);
    expect(result.current.settings.max_surge).toBe(2.5);
    expect(result.current.settings.push_notifications).toBe(false);
  });
});
