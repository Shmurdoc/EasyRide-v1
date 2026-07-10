let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const QUEUE_KEY = '@easyryde/offline_queue';

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];

  async init(): Promise<void> {
    if (!AsyncStorage) return;
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) this.queue = JSON.parse(stored);
    } catch {}
  }

  async enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const entry: QueuedRequest = {
      ...request,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(entry);
    await this.persist();
  }

  async dequeue(id: string): Promise<void> {
    this.queue = this.queue.filter((r) => r.id !== id);
    await this.persist();
  }

  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  private async persist(): Promise<void> {
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {}
  }

  async clear(): Promise<void> {
    this.queue = [];
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch {}
  }
}

export const offlineQueue = new OfflineQueue();
