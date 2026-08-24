type NavigationRef = {
    current: {
        navigate: (name: string, params?: any) => void;
    } | null;
};
export declare function setRideRequestNotificationHandler(handler: (data: any) => void): void;
export declare function useNotifications(navigationRef?: NavigationRef): {
    retryTokenRegistration: () => Promise<void>;
};
export declare function scheduleLocalNotification(title: string, body: string, data?: Record<string, unknown>): Promise<void>;
export {};
