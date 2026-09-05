import * as SecureStore from 'expo-secure-store';
import { API_TIMEOUT } from '../constants';
import { enqueueOfflineRequest, flushOfflineQueue, hasPendingMutations } from './offlineQueue';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.0.20:3082/api';
const API_VERSION = 'v1';
const TOKEN_KEY = 'auth_token';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_PREFIX = '@easyryde_cache:';
const CACHE_TTL_MS = 5 * 60 * 1000;

const _isLocalhost = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');
let _isOnline = _isLocalhost;
const _onlineListeners: Array<(online: boolean) => void> = [];

function tryInitNetInfo() {
  if (_isLocalhost) return;
  try {
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.addEventListener((state: any) => {
      const online = state.isConnected === true;
      if (online && !_isOnline) {
        flushOfflineQueue().catch(() => {});
      }
      _isOnline = online;
      _onlineListeners.forEach((l) => l(online));
    });
  } catch {}
}

tryInitNetInfo();

function onOnlineStatusChange(fn: (online: boolean) => void) {
  _onlineListeners.push(fn);
  return () => {
    const idx = _onlineListeners.indexOf(fn);
    if (idx >= 0) _onlineListeners.splice(idx, 1);
  };
}

async function getCacheKey(path: string, params?: Record<string, string>): Promise<string | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const key = CACHE_PREFIX + path + (params ? JSON.stringify(params) : '');
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function setCache(path: string, params: Record<string, string> | undefined, data: string) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const key = CACHE_PREFIX + path + (params ? JSON.stringify(params) : '');
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

async function clearAllCache() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k: string) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {}
}

class ApiClient {
  private baseUrl: string;
  private _token: string | null = null;
  private _tokenPromise: Promise<string | null> | null = null;
  private onUnauthorized?: () => void;

  constructor() {
    this.baseUrl = `${API_BASE}/${API_VERSION}`;
  }

  get isOnline() { return _isOnline; }

  onOnlineStatusChange = onOnlineStatusChange;

  clearCache = clearAllCache;

  setToken(token: string | null) {
    this._token = token;
    this._tokenPromise = null;
    if (token) {
      SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {
        if (__DEV__) console.warn('ApiClient: Failed to persist token to SecureStore');
      });
    } else {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {
        if (__DEV__) console.warn('ApiClient: Failed to remove token from SecureStore');
      });
    }
  }

  clearToken() {
    this._token = null;
    this._tokenPromise = null;
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {
      if (__DEV__) console.warn('ApiClient: Failed to remove token from SecureStore');
    });
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async loadToken(): Promise<string | null> {
    if (this._token) return this._token;
    if (this._tokenPromise) return this._tokenPromise;
    this._tokenPromise = (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        this._token = token;
        return token;
      } catch {
        return null;
      }
    })();
    return this._tokenPromise;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { params?: Record<string, string> },
    retries = 0,
  ): Promise<T> {
    const isGet = method === 'GET';

    if (!_isOnline) {
      if (isGet) {
        const cached = await getCacheKey(path, options?.params);
        if (cached) return JSON.parse(cached) as T;
      }
      if (body) {
        return enqueueOfflineRequest(() => this.request<T>(method, path, body, options, 0)) as Promise<T>;
      }
      throw new ApiError('You are offline. Please check your connection.', 0);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const token = await this.loadToken();

      let url = `${this.baseUrl}${path}`;
      if (options?.params) {
        const query = new URLSearchParams(options.params).toString();
        url += `?${query}`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        this.onUnauthorized?.();
        throw new ApiError('Unauthorized', 401);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const data: Record<string, unknown> = await response.json();

      const hasEnvelope = 'success' in data && 'data' in data;

      if (hasEnvelope) {
        if (data.success === false) {
          throw new ApiError(
            (data.message as string) || 'Request failed',
            response.status,
            data,
          );
        }
        const result = (data.data as unknown) as T;
        if (isGet && response.ok) {
          setCache(path, options?.params, JSON.stringify(result)).catch(() => {});
        }
        return result;
      }

      if (!response.ok) {
        throw new ApiError((data.message as string) || 'Request failed', response.status, data);
      }

      if (isGet && response.ok) {
        setCache(path, options?.params, JSON.stringify(data)).catch(() => {});
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (retries < MAX_RETRIES && (err instanceof TypeError || (err as Error).name === 'AbortError')) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return this.request<T>(method, path, body, options, retries + 1);
      }
      if (isGet && (err instanceof TypeError || (err as Error).name === 'AbortError')) {
        const cached = await getCacheKey(path, options?.params);
        if (cached) return JSON.parse(cached) as T;
      }
      throw err;
    }
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>('GET', path, undefined, { params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export class ApiError {
  name = 'ApiError';
  message: string;
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    this.message = message;
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();
