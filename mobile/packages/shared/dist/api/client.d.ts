declare function onOnlineStatusChange(fn: (online: boolean) => void): () => void;
declare function clearAllCache(): Promise<void>;
declare class ApiClient {
    private baseUrl;
    private _token;
    private _tokenPromise;
    private onUnauthorized?;
    constructor();
    get isOnline(): boolean;
    onOnlineStatusChange: typeof onOnlineStatusChange;
    clearCache: typeof clearAllCache;
    setToken(token: string | null): void;
    clearToken(): void;
    setOnUnauthorized(callback: () => void): void;
    private loadToken;
    private request;
    get<T>(path: string, params?: Record<string, string>): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
}
export declare class ApiError {
    name: string;
    message: string;
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown);
}
export declare const api: ApiClient;
export {};
