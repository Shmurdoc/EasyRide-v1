import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3001';
const PING_INTERVAL = 25000;
const MAX_BACKOFF = 30000;
const MAX_EVENT_HISTORY = 200;
const LATENCY_WINDOW = 10;

interface UseSocketOptions {
  token: string;
  enabled?: boolean;
  onTokenRefresh?: () => Promise<string | null>;
}

interface QueuedEvent {
  event: string;
  data?: unknown;
}

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  latency: number;
  avgLatency: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

export function useSocket({ token, enabled = true, onTokenRefresh }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempt: 0,
    latency: 0,
    avgLatency: 0,
    connectionQuality: 'unknown',
  });
  const eventQueueRef = useRef<QueuedEvent[]>([]);
  const subscribedRoomsRef = useRef<Set<string>>(new Set());
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const enabledRef = useRef(enabled);
  const tokenRef = useRef(token);
  const onTokenRefreshRef = useRef(onTokenRefresh);
  const seenEventsRef = useRef<Map<string, number>>(new Map());
  const latencyHistoryRef = useRef<number[]>([]);
  const pingTimestampRef = useRef<number>(0);
  const refreshAttemptsRef = useRef(0);

  enabledRef.current = enabled;
  tokenRef.current = token;
  onTokenRefreshRef.current = onTokenRefresh;

  const updateLatency = useCallback((newLatency: number) => {
    const history = latencyHistoryRef.current;
    history.push(newLatency);
    if (history.length > LATENCY_WINDOW) {
      history.splice(0, history.length - LATENCY_WINDOW);
    }
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    let quality: ConnectionState['connectionQuality'] = 'excellent';
    if (avg > 500) quality = 'poor';
    else if (avg > 200) quality = 'good';
    else if (avg > 0) quality = 'excellent';
    else quality = 'unknown';

    setState((prev) => ({
      ...prev,
      latency: newLatency,
      avgLatency: Math.round(avg),
      connectionQuality: quality,
    }));
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;

    attemptRef.current = 0;
    subscribedRoomsRef.current = new Set();
    eventQueueRef.current = [];
    seenEventsRef.current.clear();
    latencyHistoryRef.current = [];
    refreshAttemptsRef.current = 0;

    function calculateDelay(attempt: number): number {
      const delay = Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF);
      return delay + Math.random() * 1000;
    }

    function startPing(socket: Socket) {
      stopPing();
      pingTimerRef.current = setInterval(() => {
        if (socket.connected) {
          pingTimestampRef.current = Date.now();
          socket.emit('client:ping', pingTimestampRef.current);
        }
      }, PING_INTERVAL);
    }

    function stopPing() {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    }

    function restoreSubscriptions(socket: Socket) {
      subscribedRoomsRef.current.forEach((room) => {
        socket.emit(`join:${room}`);
      });
    }

    function flushEventQueue(socket: Socket) {
      const queue = eventQueueRef.current.splice(0);
      queue.forEach(({ event, data }) => {
        socket.emit(event, data);
      });
    }

    async function handleTokenExpired() {
      if (!onTokenRefreshRef.current) {
        console.warn('[Socket] No token refresh handler. Disconnecting.');
        socketRef.current?.disconnect();
        return;
      }

      if (refreshAttemptsRef.current >= 3) {
        console.error('[Socket] Token refresh failed 3 times. Disconnecting.');
        refreshAttemptsRef.current = 0;
        socketRef.current?.disconnect();
        return;
      }

      refreshAttemptsRef.current += 1;
      console.log(`[Socket] Token expired. Refresh attempt ${refreshAttemptsRef.current}/3...`);

      try {
        const newToken = await onTokenRefreshRef.current();
        if (newToken) {
          tokenRef.current = newToken;
          refreshAttemptsRef.current = 0;
          console.log('[Socket] Token refreshed. Reconnecting...');
          if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          connect();
        } else {
          console.error('[Socket] Token refresh returned null. Disconnecting.');
          socketRef.current?.disconnect();
        }
      } catch (err) {
        console.error('[Socket] Token refresh error:', err);
        socketRef.current?.disconnect();
      }
    }

    function connect() {
      const socket = io(SOCKET_URL, {
        auth: { token: tokenRef.current },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
        forceNew: true,
      });

      socket.on('connect', () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          reconnectAttempt: 0,
          connectionQuality: 'unknown',
        }));
        attemptRef.current = 0;
        refreshAttemptsRef.current = 0;
        startPing(socket);
        restoreSubscriptions(socket);
        flushEventQueue(socket);
      });

      socket.on('disconnect', () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isReconnecting: true,
        }));
        stopPing();
        scheduleReconnect();
      });

      socket.on('connect_error', async (err) => {
        const msg = err?.message || '';
        if (msg.includes('expired') || msg.includes('Token expired')) {
          await handleTokenExpired();
          return;
        }
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isReconnecting: true,
        }));
        stopPing();
        scheduleReconnect();
      });

      socket.on('client:pong', (timestamp: number) => {
        if (typeof timestamp === 'number') {
          updateLatency(Date.now() - timestamp);
        }
      });

      socket.on('auth:token-expired', async () => {
        await handleTokenExpired();
      });

      socketRef.current = socket;
    }

    function scheduleReconnect() {
      if (!enabledRef.current || !tokenRef.current) return;
      const attempt = attemptRef.current;
      const delay = calculateDelay(attempt);
      attemptRef.current += 1;
      setState((prev) => ({
        ...prev,
        reconnectAttempt: attempt + 1,
      }));

      reconnectTimerRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        connect();
      }, delay);
    }

    connect();

    return () => {
      stopPing();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setState({
        isConnected: false,
        isReconnecting: false,
        reconnectAttempt: 0,
        latency: 0,
        avgLatency: 0,
        connectionQuality: 'unknown',
      });
    };
  }, [token, enabled, updateLatency]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      eventQueueRef.current.push({ event, data });
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    let activeSocket = socketRef.current;
    if (!activeSocket) {
      const checkInterval = setInterval(() => {
        if (socketRef.current && !activeSocket) {
          activeSocket = socketRef.current;
          clearInterval(checkInterval);
          registerListener(activeSocket);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
    return registerListener(activeSocket);

    function registerListener(s: Socket) {
      try {
        const wrapped = (...args: unknown[]) => {
          const data = args[0];
          const id = (data as Record<string, unknown>)?.id ||
                     (data as Record<string, unknown>)?.rideId ||
                     (data as Record<string, unknown>)?.timestamp;
          if (!id) {
            handler(...args);
            return;
          }
          const key = `${event}:${id}`;
          const seen = seenEventsRef.current.get(key);
          const now = Date.now();
          if (seen && now - seen < 5000) return;
          seenEventsRef.current.set(key, now);
          if (seenEventsRef.current.size > MAX_EVENT_HISTORY) {
            const cutoff = now - 10000;
            Array.from(seenEventsRef.current.entries()).forEach(([k, v]) => {
              if (v < cutoff) seenEventsRef.current.delete(k);
            });
          }
          handler(...args);
        };
        s.on(event, wrapped);
        return () => {
          try { s.off(event, wrapped); } catch {}
        };
      } catch (err) {
        if (__DEV__) console.warn('[useSocket] Failed to subscribe to event:', event, err);
        return () => {};
      }
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    subscribedRoomsRef.current.add(room);
    socketRef.current?.emit(`join:${room}`);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    subscribedRoomsRef.current.delete(room);
    socketRef.current?.emit(`leave:${room}`);
  }, []);

  return {
    socket: socketRef.current,
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    reconnectAttempt: state.reconnectAttempt,
    latency: state.latency,
    avgLatency: state.avgLatency,
    connectionQuality: state.connectionQuality,
    emit,
    on,
    joinRoom,
    leaveRoom,
  };
}
