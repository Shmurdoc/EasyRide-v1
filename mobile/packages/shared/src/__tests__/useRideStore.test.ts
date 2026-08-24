import { useRideStore } from '../hooks/useRideStore';

const mockRide = {
  id: 'ride-123',
  tenant_id: 't1',
  rider_id: 'r1',
  driver_id: 'd1',
  status: 'in_progress' as const,
  category: 'economy' as const,
  pickup_address: '45 Selati Road',
  dropoff_address: 'Mall of the North',
  pickup_latitude: -23.94,
  pickup_longitude: 31.08,
  dropoff_latitude: -23.88,
  dropoff_longitude: 31.08,
  surge_multiplier: 1,
  created_at: '2025-01-10T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
};

describe('useRideStore', () => {
  beforeEach(() => {
    useRideStore.getState().reset();
  });

  it('initializes with default state', () => {
    const state = useRideStore.getState();
    expect(state.ride).toBeNull();
    expect(state.status).toBeNull();
    expect(state.driverLocation).toBeNull();
    expect(state.searchRadiusKm).toBe(5);
    expect(state.estimatedArrivalSeconds).toBeNull();
    expect(state.cancellationRequested).toBe(false);
  });

  it('setRide updates ride and status', () => {
    useRideStore.getState().setRide(mockRide);
    const state = useRideStore.getState();
    expect(state.ride?.id).toBe('ride-123');
    expect(state.status).toBe('in_progress');
  });

  it('setRide with null clears everything', () => {
    useRideStore.getState().setRide(mockRide);
    useRideStore.getState().setRide(null);
    const state = useRideStore.getState();
    expect(state.ride).toBeNull();
    expect(state.status).toBeNull();
  });

  it('updateStatus changes both status and ride.status', () => {
    useRideStore.getState().setRide(mockRide);
    useRideStore.getState().updateStatus('completed');
    const state = useRideStore.getState();
    expect(state.status).toBe('completed');
    expect(state.ride?.status).toBe('completed');
  });

  it('updateDriverLocation updates location', () => {
    const location = { driverId: 'd1', latitude: -23.93, longitude: 31.09 };
    useRideStore.getState().updateDriverLocation(location);
    expect(useRideStore.getState().driverLocation).toEqual(location);
  });

  it('setSearchRadius changes radius', () => {
    useRideStore.getState().setSearchRadius(10);
    expect(useRideStore.getState().searchRadiusKm).toBe(10);
  });

  it('setEstimatedArrival sets seconds', () => {
    useRideStore.getState().setEstimatedArrival(300);
    expect(useRideStore.getState().estimatedArrivalSeconds).toBe(300);
  });

  it('setCancellationRequested tracks state', () => {
    useRideStore.getState().setCancellationRequested(true);
    expect(useRideStore.getState().cancellationRequested).toBe(true);
  });

  it('setCancellationFee tracks fee', () => {
    useRideStore.getState().setCancellationFee(50);
    expect(useRideStore.getState().cancellationFee).toBe(50);
  });

  it('updatePartial merges updates', () => {
    useRideStore.getState().setRide(mockRide);
    useRideStore.getState().updatePartial({ searchRadiusKm: 8, estimatedArrivalSeconds: 180 });
    const state = useRideStore.getState();
    expect(state.searchRadiusKm).toBe(8);
    expect(state.estimatedArrivalSeconds).toBe(180);
    expect(state.ride?.id).toBe('ride-123');
  });

  it('reset restores initial state', () => {
    useRideStore.getState().setRide(mockRide);
    useRideStore.getState().updateStatus('completed');
    useRideStore.getState().reset();
    const state = useRideStore.getState();
    expect(state.ride).toBeNull();
    expect(state.status).toBeNull();
    expect(state.searchRadiusKm).toBe(5);
  });
});
