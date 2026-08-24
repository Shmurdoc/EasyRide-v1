let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const CACHE_PREFIX = '@easyryde/cache/';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class StorageCache {
  async get<T>(key: string): Promise<T | null> {
    if (!AsyncStorage) return null;
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMs: number = 900000): Promise<void> {
    if (!AsyncStorage) return;
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {}
  }

  async remove(key: string): Promise<void> {
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch {}
  }

  async clear(): Promise<void> {
    if (!AsyncStorage) return;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {}
  }
}

export const storageCache = new StorageCache();
