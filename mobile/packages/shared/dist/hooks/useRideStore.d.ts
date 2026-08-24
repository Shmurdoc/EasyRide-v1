import type { Ride, RideStatus, DriverLocation } from '../types';
export interface RideState {
    ride: Ride | null;
    status: RideStatus | null;
    driverLocation: DriverLocation | null;
    searchRadiusKm: number;
    estimatedArrivalSeconds: number | null;
    cancellationRequested: boolean;
    cancellationFee: number | null;
    lastUpdated: number;
}
interface RideStore extends RideState {
    setRide: (ride: Ride | null) => void;
    updateStatus: (status: RideStatus) => void;
    updateDriverLocation: (location: DriverLocation) => void;
    setSearchRadius: (km: number) => void;
    setEstimatedArrival: (seconds: number | null) => void;
    setCancellationRequested: (requested: boolean) => void;
    setCancellationFee: (fee: number | null) => void;
    updatePartial: (updates: Partial<RideState>) => void;
    reset: () => void;
}
export declare const useRideStore: import("zustand").UseBoundStore<import("zustand").StoreApi<RideStore>>;
export {};
