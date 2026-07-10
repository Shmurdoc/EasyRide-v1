import { create } from 'zustand';
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

const initialState: RideState = {
  ride: null,
  status: null,
  driverLocation: null,
  searchRadiusKm: 5,
  estimatedArrivalSeconds: null,
  cancellationRequested: false,
  cancellationFee: null,
  lastUpdated: 0,
};

export const useRideStore = create<RideStore>((set) => ({
  ...initialState,

  setRide: (ride) =>
    set({
      ride,
      status: ride?.status ?? null,
      lastUpdated: Date.now(),
    }),

  updateStatus: (status) =>
    set((state) => ({
      status,
      ride: state.ride ? { ...state.ride, status } : null,
      lastUpdated: Date.now(),
    })),

  updateDriverLocation: (location) =>
    set({ driverLocation: location, lastUpdated: Date.now() }),

  setSearchRadius: (km) =>
    set({ searchRadiusKm: km, lastUpdated: Date.now() }),

  setEstimatedArrival: (seconds) =>
    set({ estimatedArrivalSeconds: seconds, lastUpdated: Date.now() }),

  setCancellationRequested: (requested) =>
    set({ cancellationRequested: requested, lastUpdated: Date.now() }),

  setCancellationFee: (fee) =>
    set({ cancellationFee: fee, lastUpdated: Date.now() }),

  updatePartial: (updates) =>
    set((state) => ({ ...state, ...updates, lastUpdated: Date.now() })),

  reset: () => set({ ...initialState, lastUpdated: Date.now() }),
}));
