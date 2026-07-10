type QueueItem = {
  request: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};

let queue: QueueItem[] = [];
let flushing = false;

export function enqueueOfflineRequest(request: () => Promise<unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    queue.push({ request, resolve, reject });
  });
}

export function getOfflineQueueLength(): number {
  return queue.length;
}

export function hasPendingMutations(): boolean {
  return queue.length > 0;
}

export async function flushOfflineQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  const items = queue.splice(0);
  for (const item of items) {
    try {
      const result = await item.request();
      item.resolve(result);
    } catch (e) {
      item.reject(e);
    }
  }
  flushing = false;
}
