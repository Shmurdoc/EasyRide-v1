import { enqueueOfflineRequest, getOfflineQueueLength, hasPendingMutations, flushOfflineQueue } from '../api/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    // Reset module state between tests
    jest.resetModules();
  });

  it('starts empty', () => {
    expect(hasPendingMutations()).toBe(false);
    expect(getOfflineQueueLength()).toBe(0);
  });

  it('enqueues request and returns promise', async () => {
    const promise = enqueueOfflineRequest(() => Promise.resolve('result'));
    expect(hasPendingMutations()).toBe(true);
    expect(getOfflineQueueLength()).toBe(1);
  });

  it('flushes queue and resolves pending promises', async () => {
    const handler = jest.fn().mockResolvedValue('done');
    const promise = enqueueOfflineRequest(handler);
    await flushOfflineQueue();
    await expect(promise).resolves.toBe('done');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(hasPendingMutations()).toBe(false);
  });

  it('rejects failed requests', async () => {
    const error = new Error('Network error');
    const promise = enqueueOfflineRequest(() => Promise.reject(error));
    await flushOfflineQueue();
    await expect(promise).rejects.toThrow('Network error');
  });

  it('processes items sequentially', async () => {
    const results: number[] = [];
    const p1 = enqueueOfflineRequest(async () => { results.push(1); });
    const p2 = enqueueOfflineRequest(async () => { results.push(2); });
    expect(getOfflineQueueLength()).toBe(2);
    await flushOfflineQueue();
    expect(results).toEqual([1, 2]);
    await p1;
    await p2;
  });

  it('prevents concurrent flushing', async () => {
    enqueueOfflineRequest(() => new Promise(() => {}));
    const first = flushOfflineQueue();
    const second = flushOfflineQueue();
    // second should return immediately without deadlock
    await expect(second).resolves.toBeUndefined();
  });
});
