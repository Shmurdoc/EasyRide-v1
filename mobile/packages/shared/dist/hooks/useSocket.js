"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSocket = useSocket;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3001';
const PING_INTERVAL = 25000;
const MAX_BACKOFF = 30000;
const MAX_EVENT_HISTORY = 200;
const LATENCY_WINDOW = 10;
function useSocket({ token, enabled = true, onTokenRefresh }) {
    const socketRef = (0, react_1.useRef)(null);
    const [state, setState] = (0, react_1.useState)({
        isConnected: false,
        isReconnecting: false,
        reconnectAttempt: 0,
        latency: 0,
        avgLatency: 0,
        connectionQuality: 'unknown',
    });
    const eventQueueRef = (0, react_1.useRef)([]);
    const subscribedRoomsRef = (0, react_1.useRef)(new Set());
    const pingTimerRef = (0, react_1.useRef)(null);
    const reconnectTimerRef = (0, react_1.useRef)(null);
    const attemptRef = (0, react_1.useRef)(0);
    const enabledRef = (0, react_1.useRef)(enabled);
    const tokenRef = (0, react_1.useRef)(token);
    const onTokenRefreshRef = (0, react_1.useRef)(onTokenRefresh);
    const seenEventsRef = (0, react_1.useRef)(new Map());
    const latencyHistoryRef = (0, react_1.useRef)([]);
    const pingTimestampRef = (0, react_1.useRef)(0);
    const refreshAttemptsRef = (0, react_1.useRef)(0);
    enabledRef.current = enabled;
    tokenRef.current = token;
    onTokenRefreshRef.current = onTokenRefresh;
    const updateLatency = (0, react_1.useCallback)((newLatency) => {
        const history = latencyHistoryRef.current;
        history.push(newLatency);
        if (history.length > LATENCY_WINDOW) {
            history.splice(0, history.length - LATENCY_WINDOW);
        }
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        let quality = 'excellent';
        if (avg > 500)
            quality = 'poor';
        else if (avg > 200)
            quality = 'good';
        else if (avg > 0)
            quality = 'excellent';
        else
            quality = 'unknown';
        setState((prev) => (Object.assign(Object.assign({}, prev), { latency: newLatency, avgLatency: Math.round(avg), connectionQuality: quality })));
    }, []);
    (0, react_1.useEffect)(() => {
        if (!enabled || !token)
            return;
        attemptRef.current = 0;
        subscribedRoomsRef.current = new Set();
        eventQueueRef.current = [];
        seenEventsRef.current.clear();
        latencyHistoryRef.current = [];
        refreshAttemptsRef.current = 0;
        function calculateDelay(attempt) {
            const delay = Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF);
            return delay + Math.random() * 1000;
        }
        function startPing(socket) {
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
        function restoreSubscriptions(socket) {
            subscribedRoomsRef.current.forEach((room) => {
                socket.emit(`join:${room}`);
            });
        }
        function flushEventQueue(socket) {
            const queue = eventQueueRef.current.splice(0);
            queue.forEach(({ event, data }) => {
                socket.emit(event, data);
            });
        }
        function handleTokenExpired() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                if (!onTokenRefreshRef.current) {
                    console.warn('[Socket] No token refresh handler. Disconnecting.');
                    (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.disconnect();
                    return;
                }
                if (refreshAttemptsRef.current >= 3) {
                    console.error('[Socket] Token refresh failed 3 times. Disconnecting.');
                    refreshAttemptsRef.current = 0;
                    (_b = socketRef.current) === null || _b === void 0 ? void 0 : _b.disconnect();
                    return;
                }
                refreshAttemptsRef.current += 1;
                console.log(`[Socket] Token expired. Refresh attempt ${refreshAttemptsRef.current}/3...`);
                try {
                    const newToken = yield onTokenRefreshRef.current();
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
                    }
                    else {
                        console.error('[Socket] Token refresh returned null. Disconnecting.');
                        (_c = socketRef.current) === null || _c === void 0 ? void 0 : _c.disconnect();
                    }
                }
                catch (err) {
                    console.error('[Socket] Token refresh error:', err);
                    (_d = socketRef.current) === null || _d === void 0 ? void 0 : _d.disconnect();
                }
            });
        }
        function connect() {
            const socket = (0, socket_io_client_1.io)(SOCKET_URL, {
                auth: { token: tokenRef.current },
                transports: ['websocket', 'polling'],
                reconnection: false,
                timeout: 10000,
                forceNew: true,
            });
            socket.on('connect', () => {
                setState((prev) => (Object.assign(Object.assign({}, prev), { isConnected: true, isReconnecting: false, reconnectAttempt: 0, connectionQuality: 'unknown' })));
                attemptRef.current = 0;
                refreshAttemptsRef.current = 0;
                startPing(socket);
                restoreSubscriptions(socket);
                flushEventQueue(socket);
            });
            socket.on('disconnect', () => {
                setState((prev) => (Object.assign(Object.assign({}, prev), { isConnected: false, isReconnecting: true })));
                stopPing();
                scheduleReconnect();
            });
            socket.on('connect_error', (err) => __awaiter(this, void 0, void 0, function* () {
                const msg = (err === null || err === void 0 ? void 0 : err.message) || '';
                if (msg.includes('expired') || msg.includes('Token expired')) {
                    yield handleTokenExpired();
                    return;
                }
                setState((prev) => (Object.assign(Object.assign({}, prev), { isConnected: false, isReconnecting: true })));
                stopPing();
                scheduleReconnect();
            }));
            socket.on('client:pong', (timestamp) => {
                if (typeof timestamp === 'number') {
                    updateLatency(Date.now() - timestamp);
                }
            });
            socket.on('auth:token-expired', () => __awaiter(this, void 0, void 0, function* () {
                yield handleTokenExpired();
            }));
            socketRef.current = socket;
        }
        function scheduleReconnect() {
            if (!enabledRef.current || !tokenRef.current)
                return;
            const attempt = attemptRef.current;
            const delay = calculateDelay(attempt);
            attemptRef.current += 1;
            setState((prev) => (Object.assign(Object.assign({}, prev), { reconnectAttempt: attempt + 1 })));
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
    const emit = (0, react_1.useCallback)((event, data) => {
        var _a;
        if ((_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.connected) {
            socketRef.current.emit(event, data);
        }
        else {
            eventQueueRef.current.push({ event, data });
        }
    }, []);
    const on = (0, react_1.useCallback)((event, handler) => {
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
        function registerListener(s) {
            try {
                const wrapped = (...args) => {
                    const data = args[0];
                    const id = (data === null || data === void 0 ? void 0 : data.id) ||
                        (data === null || data === void 0 ? void 0 : data.rideId) ||
                        (data === null || data === void 0 ? void 0 : data.timestamp);
                    if (!id) {
                        handler(...args);
                        return;
                    }
                    const key = `${event}:${id}`;
                    const seen = seenEventsRef.current.get(key);
                    const now = Date.now();
                    if (seen && now - seen < 5000)
                        return;
                    seenEventsRef.current.set(key, now);
                    if (seenEventsRef.current.size > MAX_EVENT_HISTORY) {
                        const cutoff = now - 10000;
                        Array.from(seenEventsRef.current.entries()).forEach(([k, v]) => {
                            if (v < cutoff)
                                seenEventsRef.current.delete(k);
                        });
                    }
                    handler(...args);
                };
                s.on(event, wrapped);
                return () => {
                    try {
                        s.off(event, wrapped);
                    }
                    catch (_a) { }
                };
            }
            catch (_a) {
                return () => { };
            }
        }
    }, []);
    const joinRoom = (0, react_1.useCallback)((room) => {
        var _a;
        subscribedRoomsRef.current.add(room);
        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit(`join:${room}`);
    }, []);
    const leaveRoom = (0, react_1.useCallback)((room) => {
        var _a;
        subscribedRoomsRef.current.delete(room);
        (_a = socketRef.current) === null || _a === void 0 ? void 0 : _a.emit(`leave:${room}`);
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
