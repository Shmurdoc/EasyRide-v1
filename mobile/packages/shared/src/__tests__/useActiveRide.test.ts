jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    removeAllListeners: jest.fn(),
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockRide = {
  id: 'ride-123',
  status: 'in_progress',
  tenant_id: 't1',
  rider_id: 'r1',
  category: 'economy',
  pickup_address: '123 St',
  dropoff_address: '456 Ave',
  pickup_latitude: -23.94,
  pickup_longitude: 31.08,
  dropoff_latitude: -23.88,
  dropoff_longitude: 31.08,
  surge_multiplier: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('../api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useActiveRide } from '../hooks/useActiveRide';

describe('useActiveRide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useRideStore } = require('../hooks/useRideStore');
    useRideStore.getState().reset();
  });

  it('fetches active ride on mount', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1', enabled: true })
    );
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/rides/current');
    });
  });

  it('does not fetch when disabled', () => {
    renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1', enabled: false })
    );
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('does not fetch without token', () => {
    renderHook(() =>
      useActiveRide({ token: '', userId: 'r1', enabled: true })
    );
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('sets ride data from API', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride?.id).toBe('ride-123');
      expect(result.current.status).toBe('in_progress');
    });
  });

  it('handles API error gracefully', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride).toBeNull();
    });
  });

  it('refreshRide refetches data', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride?.id).toBe('ride-123');
    });
    const updatedRide = { ...mockRide, status: 'completed' };
    mockApiGet.mockResolvedValue(updatedRide);
    await act(async () => {
      await result.current.refreshRide();
    });
    expect(result.current.status).toBe('completed');
  });

  it('requestCancellation calls API and emits', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    mockApiPost.mockResolvedValue({});
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride?.id).toBe('ride-123');
    });
    await act(async () => {
      await result.current.requestCancellation('Too long');
    });
    expect(mockApiPost).toHaveBeenCalledWith('/rides/ride-123/cancel', { reason: 'Too long' });
  });

  it('confirmCancellation calls API', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    mockApiPost.mockResolvedValue({});
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride?.id).toBe('ride-123');
    });
    await act(async () => {
      await result.current.confirmCancellation();
    });
    expect(mockApiPost).toHaveBeenCalledWith('/rides/ride-123/cancel/confirm');
  });

  it('rejectCancellation calls API', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    mockApiPost.mockResolvedValue({});
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    await waitFor(() => {
      expect(result.current.ride?.id).toBe('ride-123');
    });
    await act(async () => {
      await result.current.rejectCancellation();
    });
    expect(mockApiPost).toHaveBeenCalledWith('/rides/ride-123/cancel/reject');
  });

  it('provides socket connection state', async () => {
    mockApiGet.mockResolvedValue(mockRide);
    const { result } = renderHook(() =>
      useActiveRide({ token: 'test-token', userId: 'r1' })
    );
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
  });
});
