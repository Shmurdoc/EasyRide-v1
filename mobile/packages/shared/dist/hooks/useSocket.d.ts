import { Socket } from 'socket.io-client';
interface UseSocketOptions {
    token: string;
    enabled?: boolean;
    onTokenRefresh?: () => Promise<string | null>;
}
export declare function useSocket({ token, enabled, onTokenRefresh }: UseSocketOptions): {
    socket: Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap>;
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempt: number;
    latency: number;
    avgLatency: number;
    connectionQuality: "excellent" | "good" | "poor" | "unknown";
    emit: (event: string, data?: unknown) => void;
    on: (event: string, handler: (...args: unknown[]) => void) => () => void;
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
};
export {};
