jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    removeAllListeners: jest.fn(),
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSocket } from '../hooks/useSocket';

describe('useSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with disconnected state', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.reconnectAttempt).toBe(0);
  });

  it('does not connect when disabled', () => {
    const { io } = require('socket.io-client');
    renderHook(() => useSocket({ token: 'test-token', enabled: false }));
    expect(io).not.toHaveBeenCalled();
  });

  it('does not connect without token', () => {
    const { io } = require('socket.io-client');
    renderHook(() => useSocket({ token: '', enabled: true }));
    expect(io).not.toHaveBeenCalled();
  });

  it('connects when token and enabled provided', () => {
    const { io } = require('socket.io-client');
    renderHook(() => useSocket({ token: 'test-token', enabled: true }));
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'test-token' } })
    );
  });

  it('emit queues events when disconnected', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    act(() => {
      result.current.emit('test:event', { data: 'hello' });
    });
    const socket = jest.requireMock('socket.io-client').io();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('emit sends directly when connected', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    const socket = jest.requireMock('socket.io-client').io();
    act(() => {
      const connectHandler = socket.on.mock.calls.find(
        (c: [string, Function]) => c[0] === 'connect'
      );
      if (connectHandler) connectHandler[1]();
    });
    act(() => {
      result.current.emit('test:event', { data: 'hello' });
    });
    expect(socket.emit).toHaveBeenCalledWith('test:event', { data: 'hello' });
  });

  it('on registers event listener', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    const handler = jest.fn();
    act(() => {
      result.current.on('ride:status_changed', handler);
    });
    const socket = jest.requireMock('socket.io-client').io();
    const registered = socket.on.mock.calls.find(
      (c: [string, Function]) => c[0] === 'ride:status_changed'
    );
    expect(registered).toBeDefined();
  });

  it('joinRoom emits join event', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    const socket = jest.requireMock('socket.io-client').io();
    act(() => {
      const connectHandler = socket.on.mock.calls.find(
        (c: [string, Function]) => c[0] === 'connect'
      );
      if (connectHandler) connectHandler[1]();
    });
    act(() => {
      result.current.joinRoom('ride:123');
    });
    expect(socket.emit).toHaveBeenCalledWith('join:ride:123');
  });

  it('leaveRoom emits leave event', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    const socket = jest.requireMock('socket.io-client').io();
    act(() => {
      const connectHandler = socket.on.mock.calls.find(
        (c: [string, Function]) => c[0] === 'connect'
      );
      if (connectHandler) connectHandler[1]();
    });
    act(() => {
      result.current.leaveRoom('ride:123');
    });
    expect(socket.emit).toHaveBeenCalledWith('leave:ride:123');
  });

  it('disconnects on unmount', () => {
    const socket = jest.requireMock('socket.io-client').io();
    const { unmount } = renderHook(() => useSocket({ token: 'test-token' }));
    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.removeAllListeners).toHaveBeenCalled();
  });

  it('provides connection state updates', () => {
    const { result } = renderHook(() => useSocket({ token: 'test-token' }));
    const socket = jest.requireMock('socket.io-client').io();
    act(() => {
      const connectHandler = socket.on.mock.calls.find(
        (c: [string, Function]) => c[0] === 'connect'
      );
      if (connectHandler) connectHandler[1]();
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);

    act(() => {
      const disconnectHandler = socket.on.mock.calls.find(
        (c: [string, Function]) => c[0] === 'disconnect'
      );
      if (disconnectHandler) disconnectHandler[1]();
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);
  });
});
