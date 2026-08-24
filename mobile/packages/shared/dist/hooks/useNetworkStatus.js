"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNetworkStatus = useNetworkStatus;
const react_1 = require("react");
const react_native_1 = require("react-native");
let listeners = [];
let currentState = { isConnected: true, isInternetReachable: true };
let unsubscribeNetInfo = null;
function notifyAll(state) {
    currentState = state;
    listeners.forEach((l) => l(state));
}
function ensureNetInfo() {
    if (unsubscribeNetInfo)
        return;
    try {
        const NetInfo = require('@react-native-community/netinfo');
        unsubscribeNetInfo = NetInfo.addEventListener((state) => {
            var _a, _b;
            notifyAll({
                isConnected: (_a = state.isConnected) !== null && _a !== void 0 ? _a : false,
                isInternetReachable: (_b = state.isInternetReachable) !== null && _b !== void 0 ? _b : false,
            });
        });
    }
    catch (_a) {
        if (__DEV__)
            console.warn('[NetworkStatus] NetInfo unavailable, using AppState fallback');
        const sub = react_native_1.AppState.addEventListener('change', () => {
            notifyAll({ isConnected: true, isInternetReachable: true });
        });
        unsubscribeNetInfo = () => sub.remove();
    }
}
function subscribe(fn) {
    listeners.push(fn);
    ensureNetInfo();
    fn(currentState);
    return () => {
        listeners = listeners.filter((l) => l !== fn);
        if (listeners.length === 0 && unsubscribeNetInfo) {
            unsubscribeNetInfo();
            unsubscribeNetInfo = null;
        }
    };
}
function useNetworkStatus() {
    const [isOnline, setIsOnline] = (0, react_1.useState)(true);
    const [wasOffline, setWasOffline] = (0, react_1.useState)(false);
    const prevRef = (0, react_1.useRef)(true);
    (0, react_1.useEffect)(() => {
        const unsub = subscribe((state) => {
            const online = state.isConnected === true;
            setIsOnline(online);
            if (prevRef.current && !online)
                setWasOffline(true);
            prevRef.current = online;
        });
        return unsub;
    }, []);
    const clearWasOffline = (0, react_1.useCallback)(() => setWasOffline(false), []);
    return { isOnline, wasOffline, clearWasOffline };
}
