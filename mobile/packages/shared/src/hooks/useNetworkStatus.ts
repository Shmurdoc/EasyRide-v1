import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  clearWasOffline: () => void;
}

type NetInfoState = { isConnected: boolean | null; isInternetReachable: boolean | null };
type Listener = (state: NetInfoState) => void;

let listeners: Listener[] = [];
let currentState: NetInfoState = { isConnected: true, isInternetReachable: true };
let unsubscribeNetInfo: (() => void) | null = null;

function notifyAll(state: NetInfoState) {
  currentState = state;
  listeners.forEach((l) => l(state));
}

function ensureNetInfo() {
  if (unsubscribeNetInfo) return;
  try {
    const NetInfo = require('@react-native-community/netinfo');
    unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
      notifyAll({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
      });
    });
  } catch {
    if (__DEV__) console.warn('[NetworkStatus] NetInfo unavailable, using AppState fallback');
    const sub = AppState.addEventListener('change', () => {
      notifyAll({ isConnected: true, isInternetReachable: true });
    });
    unsubscribeNetInfo = () => sub.remove();
  }
}

function subscribe(fn: Listener): () => void {
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

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const prevRef = useRef(true);

  useEffect(() => {
    const unsub = subscribe((state) => {
      const online = state.isConnected === true;
      setIsOnline(online);
      if (prevRef.current && !online) setWasOffline(true);
      prevRef.current = online;
    });
    return unsub;
  }, []);

  const clearWasOffline = useCallback(() => setWasOffline(false), []);

  return { isOnline, wasOffline, clearWasOffline };
}
