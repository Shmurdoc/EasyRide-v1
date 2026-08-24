export declare function enqueueOfflineRequest(request: () => Promise<unknown>): Promise<unknown>;
export declare function getOfflineQueueLength(): number;
export declare function hasPendingMutations(): boolean;
export declare function flushOfflineQueue(): Promise<void>;
