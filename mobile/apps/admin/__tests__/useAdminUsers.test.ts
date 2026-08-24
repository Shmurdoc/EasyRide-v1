import { renderHook, waitFor } from '@testing-library/react-native';
import { useAdminUsers } from '../hooks/useAdminUsers';

const mockGetAdminUsers = jest.fn();

jest.mock('../api/admin', () => ({
  getAdminUsers: (...args: any[]) => mockGetAdminUsers(...args),
}));

const mockResponse = {
  data: [{ id: 'u1', name: 'John Rider', email: 'john@test.com', phone: '+27123456789', role: 'rider', is_active: true, created_at: '2024-01-15T00:00:00Z', last_login_at: null }],
  current_page: 1, last_page: 1, total: 1, per_page: 15,
};

describe('useAdminUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns loading initially', () => {
    mockGetAdminUsers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminUsers());
    expect(result.current.loading).toBe(true);
  });

  it('fetches users on mount', async () => {
    mockGetAdminUsers.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].name).toBe('John Rider');
  });

  it('handles error', async () => {
    mockGetAdminUsers.mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('API error');
  });

  it('handles empty response', async () => {
    mockGetAdminUsers.mockResolvedValue({ data: [], current_page: 1, last_page: 0, total: 0, per_page: 15 });
    const { result } = renderHook(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toEqual([]);
  });
});
