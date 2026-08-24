export interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean;
    clearWasOffline: () => void;
}
export declare function useNetworkStatus(): NetworkStatus;
