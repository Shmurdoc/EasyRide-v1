jest.mock('@react-native-community/netinfo', () => {
  const listeners: Array<(state: { isConnected: boolean }) => void> = [];
  return {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean }) => void) => {
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }),
  };
});

import { renderHook, act } from '@testing-library/react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns online initially', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('detects going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      const listeners = jest.requireMock('@react-native-community/netinfo').addEventListener.mock.calls;
      if (listeners.length > 0) {
        const cb = listeners[listeners.length - 1][0];
        cb({ isConnected: false });
      }
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it('tracks reconnection and clears wasOffline', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      const listeners = jest.requireMock('@react-native-community/netinfo').addEventListener.mock.calls;
      const cb = listeners[listeners.length - 1][0];
      cb({ isConnected: false });
    });
    expect(result.current.wasOffline).toBe(true);
    act(() => {
      result.current.clearWasOffline();
    });
    expect(result.current.wasOffline).toBe(false);
  });

  it('updates isOnline on connectivity change', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      const listeners = jest.requireMock('@react-native-community/netinfo').addEventListener.mock.calls;
      const cb = listeners[listeners.length - 1][0];
      cb({ isConnected: true });
    });
    expect(result.current.isOnline).toBe(true);
  });
});
