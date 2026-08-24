"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.api = exports.ApiError = void 0;
const SecureStore = __importStar(require("expo-secure-store"));
const constants_1 = require("../constants");
const offlineQueue_1 = require("./offlineQueue");
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
const API_VERSION = 'v1';
const TOKEN_KEY = 'auth_token';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const CACHE_PREFIX = '@easyryde_cache:';
const CACHE_TTL_MS = 5 * 60 * 1000;
const _isLocalhost = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');
let _isOnline = _isLocalhost;
const _onlineListeners = [];
function tryInitNetInfo() {
    if (_isLocalhost)
        return;
    try {
        const NetInfo = require('@react-native-community/netinfo');
        NetInfo.addEventListener((state) => {
            const online = state.isConnected === true;
            if (online && !_isOnline) {
                (0, offlineQueue_1.flushOfflineQueue)().catch(() => { });
            }
            _isOnline = online;
            _onlineListeners.forEach((l) => l(online));
        });
    }
    catch (_a) { }
}
tryInitNetInfo();
function onOnlineStatusChange(fn) {
    _onlineListeners.push(fn);
    return () => {
        const idx = _onlineListeners.indexOf(fn);
        if (idx >= 0)
            _onlineListeners.splice(idx, 1);
    };
}
function getCacheKey(path, params) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const key = CACHE_PREFIX + path + (params ? JSON.stringify(params) : '');
            const raw = yield AsyncStorage.getItem(key);
            if (!raw)
                return null;
            const { data, timestamp } = JSON.parse(raw);
            if (Date.now() - timestamp > CACHE_TTL_MS) {
                AsyncStorage.removeItem(key).catch(() => { });
                return null;
            }
            return data;
        }
        catch (_a) {
            return null;
        }
    });
}
function setCache(path, params, data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const key = CACHE_PREFIX + path + (params ? JSON.stringify(params) : '');
            yield AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        }
        catch (_a) { }
    });
}
function clearAllCache() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const keys = yield AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
            if (cacheKeys.length > 0) {
                yield AsyncStorage.multiRemove(cacheKeys);
            }
        }
        catch (_a) { }
    });
}
class ApiClient {
    constructor() {
        this._token = null;
        this._tokenPromise = null;
        this.onOnlineStatusChange = onOnlineStatusChange;
        this.clearCache = clearAllCache;
        this.baseUrl = `${API_BASE}/${API_VERSION}`;
    }
    get isOnline() { return _isOnline; }
    setToken(token) {
        this._token = token;
        this._tokenPromise = null;
        if (token) {
            SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {
                if (__DEV__)
                    console.warn('ApiClient: Failed to persist token to SecureStore');
            });
        }
        else {
            SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {
                if (__DEV__)
                    console.warn('ApiClient: Failed to remove token from SecureStore');
            });
        }
    }
    clearToken() {
        this._token = null;
        this._tokenPromise = null;
        SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {
            if (__DEV__)
                console.warn('ApiClient: Failed to remove token from SecureStore');
        });
    }
    setOnUnauthorized(callback) {
        this.onUnauthorized = callback;
    }
    loadToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._token)
                return this._token;
            if (this._tokenPromise)
                return this._tokenPromise;
            this._tokenPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const token = yield SecureStore.getItemAsync(TOKEN_KEY);
                    this._token = token;
                    return token;
                }
                catch (_a) {
                    return null;
                }
            }))();
            return this._tokenPromise;
        });
    }
    request(method_1, path_1, body_1, options_1) {
        return __awaiter(this, arguments, void 0, function* (method, path, body, options, retries = 0) {
            var _a;
            const isGet = method === 'GET';
            if (!_isOnline) {
                if (isGet) {
                    const cached = yield getCacheKey(path, options === null || options === void 0 ? void 0 : options.params);
                    if (cached)
                        return JSON.parse(cached);
                }
                if (body) {
                    return (0, offlineQueue_1.enqueueOfflineRequest)(() => this.request(method, path, body, options, 0));
                }
                throw new ApiError('You are offline. Please check your connection.', 0);
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), constants_1.API_TIMEOUT);
            try {
                const token = yield this.loadToken();
                let url = `${this.baseUrl}${path}`;
                if (options === null || options === void 0 ? void 0 : options.params) {
                    const query = new URLSearchParams(options.params).toString();
                    url += `?${query}`;
                }
                const headers = {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                };
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                const response = yield fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (response.status === 401) {
                    (_a = this.onUnauthorized) === null || _a === void 0 ? void 0 : _a.call(this);
                    throw new ApiError('Unauthorized', 401);
                }
                if (response.status === 204) {
                    return undefined;
                }
                const data = yield response.json();
                const hasEnvelope = 'success' in data && 'data' in data;
                if (hasEnvelope) {
                    if (data.success === false) {
                        throw new ApiError(data.message || 'Request failed', response.status, data);
                    }
                    const result = data.data;
                    if (isGet && response.ok) {
                        setCache(path, options === null || options === void 0 ? void 0 : options.params, JSON.stringify(result)).catch(() => { });
                    }
                    return result;
                }
                if (!response.ok) {
                    throw new ApiError(data.message || 'Request failed', response.status, data);
                }
                if (isGet && response.ok) {
                    setCache(path, options === null || options === void 0 ? void 0 : options.params, JSON.stringify(data)).catch(() => { });
                }
                return data;
            }
            catch (err) {
                clearTimeout(timeoutId);
                if (retries < MAX_RETRIES && (err instanceof TypeError || err.name === 'AbortError')) {
                    yield new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
                    return this.request(method, path, body, options, retries + 1);
                }
                if (isGet && (err instanceof TypeError || err.name === 'AbortError')) {
                    const cached = yield getCacheKey(path, options === null || options === void 0 ? void 0 : options.params);
                    if (cached)
                        return JSON.parse(cached);
                }
                throw err;
            }
        });
    }
    get(path, params) {
        return this.request('GET', path, undefined, { params });
    }
    post(path, body) {
        return this.request('POST', path, body);
    }
    put(path, body) {
        return this.request('PUT', path, body);
    }
    patch(path, body) {
        return this.request('PATCH', path, body);
    }
    delete(path) {
        return this.request('DELETE', path);
    }
}
class ApiError {
    constructor(message, status, data) {
        this.name = 'ApiError';
        this.message = message;
        this.status = status;
        this.data = data;
    }
}
exports.ApiError = ApiError;
exports.api = new ApiClient();
