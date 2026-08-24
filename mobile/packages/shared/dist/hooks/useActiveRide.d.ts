import { type RideState } from './useRideStore';
import type { Ride, DriverLocation } from '../types';
interface UseActiveRideOptions {
    token: string;
    userId: string;
    enabled?: boolean;
}
interface UseActiveRideReturn {
    ride: Ride | null;
    status: RideState['status'];
    driverLocation: DriverLocation | null;
    searchRadiusKm: number;
    estimatedArrivalSeconds: number | null;
    cancellationRequested: boolean;
    cancellationFee: number | null;
    isConnected: boolean;
    isReconnecting: boolean;
    requestCancellation: (reason: string) => Promise<void>;
    confirmCancellation: () => Promise<void>;
    rejectCancellation: () => Promise<void>;
    refreshRide: () => Promise<void>;
}
export declare function useActiveRide({ token, userId, enabled, }: UseActiveRideOptions): UseActiveRideReturn;
export {};
