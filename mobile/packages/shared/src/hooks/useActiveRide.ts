import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useRideStore, type RideState } from './useRideStore';
import { api } from '../api/client';
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

export function useActiveRide({
  token,
  userId,
  enabled = true,
}: UseActiveRideOptions): UseActiveRideReturn {
  const store = useRideStore();
  const rideRef = useRef<Ride | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isConnected, isReconnecting, on, joinRoom, leaveRoom, emit } =
    useSocket({ token, enabled });

  const fetchActiveRide = useCallback(async () => {
    try {
      const ride = await api.get<Ride>('/rides/current');
      rideRef.current = ride;
      store.setRide(ride);

      if (ride?.id) {
        joinRoom(`ride:${ride.id}`);
        if (ride.driver_id) {
          joinRoom(`driver:${ride.driver_id}`);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[useActiveRide] Failed to fetch active ride:', err);
      if (rideRef.current) {
        store.setRide(null);
        rideRef.current = null;
      }
    }
  }, [joinRoom, store]);

  const refreshRide = useCallback(async () => {
    await fetchActiveRide();
  }, [fetchActiveRide]);

  useEffect(() => {
    if (!enabled || !token) return;

    fetchActiveRide();

    pollRef.current = setInterval(() => {
      if (!isConnected) {
        fetchActiveRide();
      }
    }, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (rideRef.current?.id) {
        leaveRoom(`ride:${rideRef.current.id}`);
        if (rideRef.current.driver_id) {
          leaveRoom(`driver:${rideRef.current.driver_id}`);
        }
      }
    };
  }, [enabled, token, isConnected, fetchActiveRide, leaveRoom]);

  useEffect(() => {
    if (!isConnected || !rideRef.current?.id) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      on('ride:status_changed', (data: { ride_id: string; status: Ride['status'] }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.updateStatus(data.status);
        }
      }),
    );

    unsubs.push(
      on('driver:location_update', (data: DriverLocation) => {
        store.updateDriverLocation(data);
      }),
    );

    unsubs.push(
      on('ride:eta_update', (data: { ride_id: string; eta_seconds: number }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.setEstimatedArrival(data.eta_seconds);
        }
      }),
    );

    unsubs.push(
      on('ride:radius_expanded', (data: { ride_id: string; radius_km: number }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.setSearchRadius(data.radius_km);
        }
      }),
    );

    unsubs.push(
      on('ride:cancellation_requested', (data: { ride_id: string; cancellation_fee: number }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.setCancellationRequested(true);
          store.setCancellationFee(data.cancellation_fee);
        }
      }),
    );

    unsubs.push(
      on('ride:cancellation_confirmed', (data: { ride_id: string }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.updateStatus('cancelled');
          store.setCancellationRequested(false);
        }
      }),
    );

    unsubs.push(
      on('ride:completed', (data: { ride_id: string }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.updateStatus('completed');
        }
      }),
    );

    unsubs.push(
      on('ride:driver_arrived', (data: { ride_id: string }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.updateStatus('arrived');
        }
      }),
    );

    unsubs.push(
      on('ride:near_dropoff', (data: { ride_id: string }) => {
        if (data.ride_id === rideRef.current?.id) {
          store.updateStatus('near_drop_off');
        }
      }),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [isConnected, on, store]);

  const requestCancellation = useCallback(
    async (reason: string) => {
      if (!rideRef.current?.id) return;
      await api.post(`/rides/${rideRef.current.id}/cancel`, { reason });
      store.setCancellationRequested(true);
      emit('ride:cancel_request', { ride_id: rideRef.current.id, reason });
    },
    [emit, store],
  );

  const confirmCancellation = useCallback(async () => {
    if (!rideRef.current?.id) return;
    await api.post(`/rides/${rideRef.current.id}/cancel/confirm`);
    store.updateStatus('cancelled');
    store.setCancellationRequested(false);
  }, [store]);

  const rejectCancellation = useCallback(async () => {
    if (!rideRef.current?.id) return;
    await api.post(`/rides/${rideRef.current.id}/cancel/reject`);
    store.setCancellationRequested(false);
    store.setCancellationFee(null);
  }, [store]);

  return {
    ride: store.ride,
    status: store.status,
    driverLocation: store.driverLocation,
    searchRadiusKm: store.searchRadiusKm,
    estimatedArrivalSeconds: store.estimatedArrivalSeconds,
    cancellationRequested: store.cancellationRequested,
    cancellationFee: store.cancellationFee,
    isConnected,
    isReconnecting,
    requestCancellation,
    confirmCancellation,
    rejectCancellation,
    refreshRide,
  };
}
