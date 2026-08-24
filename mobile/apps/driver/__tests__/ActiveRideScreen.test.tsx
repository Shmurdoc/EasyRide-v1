import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, ActivityIndicator } from 'react-native';
import ActiveRideScreen from '../screens/ActiveRideScreen';
import { rides, useSocket } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockRoute = { params: { rideId: 'ride-1', riderId: 'rider-1' } } as any;
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('ActiveRideScreen', () => {
  const mockEmit = jest.fn();
  let socketHandlers: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    socketHandlers = {};
    (rides.get as jest.Mock).mockResolvedValue({
      id: 'ride-1',
      status: 'to_pickup',
      pickup_address: '123 Main St',
      dropoff_address: '456 Oak Ave',
      pickup_latitude: -23.9,
      pickup_longitude: 29.4,
      dropoff_latitude: -23.95,
      dropoff_longitude: 29.45,
      distance_km: 5.2,
      duration_minutes: 15,
      total_fare: 85,
      route_polyline: '',
      rider: { name: 'Jane Rider', rating: 4.9 },
    });
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      emit: mockEmit,
      on: jest.fn((event: string, cb: Function) => {
        socketHandlers[event] = cb;
        return jest.fn();
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading state initially', () => {
    const { UNSAFE_getByType } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('loads ride details on mount', async () => {
    render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(rides.get).toHaveBeenCalledWith('ride-1');
    });
  });

  it('renders to_pickup phase with passenger info', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Head to pickup')).toBeTruthy();
      expect(getByText('Jane Rider')).toBeTruthy();
      expect(getByText("I've Arrived")).toBeTruthy();
    });
  });

  it('shows pickup and dropoff addresses', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('123 Main St')).toBeTruthy();
      expect(getByText('456 Oak Ave')).toBeTruthy();
    });
  });

  it('transitions to arrived phase when I Arrived is pressed', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText("I've Arrived")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await waitFor(() => {
      expect(getByText("You've Arrived!")).toBeTruthy();
      expect(getByText("Start Trip")).toBeTruthy();
    });
  });

  it('emits driver:arrived when arrived is pressed', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText("I've Arrived")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("I've Arrived"));
    });

    expect(mockEmit).toHaveBeenCalledWith('driver:arrived', {
      rideId: 'ride-1',
      riderId: 'rider-1',
    });
  });

  it('transitions to in_progress phase when Start Trip is pressed', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText("I've Arrived")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await act(async () => {
      fireEvent.press(getByText("Start Trip"));
    });

    await waitFor(() => {
      expect(getByText('TRIP IN PROGRESS')).toBeTruthy();
      expect(getByText('Complete Trip')).toBeTruthy();
    });
  });

  it('emits ride:start when Start Trip is pressed', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await act(async () => {
      fireEvent.press(getByText("Start Trip"));
    });

    expect(mockEmit).toHaveBeenCalledWith('ride:start', {
      rideId: 'ride-1',
      otherUserId: 'rider-1',
    });
  });

  it('completes trip and shows alert', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await act(async () => {
      fireEvent.press(getByText("Start Trip"));
    });

    await act(async () => {
      fireEvent.press(getByText("Complete Trip"));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Ride Completed', 'Great job!', expect.any(Array));
    });
  });

  it('emits ride:complete when Complete Trip is pressed', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await act(async () => {
      fireEvent.press(getByText("Start Trip"));
    });

    await act(async () => {
      fireEvent.press(getByText("Complete Trip"));
    });

    expect(mockEmit).toHaveBeenCalledWith('ride:complete', {
      rideId: 'ride-1',
      otherUserId: 'rider-1',
      fare: 85,
    });
  });

  it('shows SOS button', async () => {
    const { getByTestId } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByTestId('sos-button')).toBeTruthy();
    });
  });

  it('triggers SOS with confirmation', async () => {
    const { getByTestId } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByTestId('sos-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('sos-button'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Emergency SOS',
      'This will alert emergency services and share your location. Are you sure?',
      expect.any(Array)
    );
  });

  it('shows error state when ride fails to load', async () => {
    (rides.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Failed to load ride details')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('retries loading when retry button pressed', async () => {
    (rides.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Retry'));
    });

    await waitFor(() => {
      expect(rides.get).toHaveBeenCalledTimes(2);
    });
  });

  it('shows cancel ride option in arrived phase', async () => {
    const { getByText } = render(<ActiveRideScreen route={mockRoute} navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText("I've Arrived"));
    });

    await waitFor(() => {
      expect(getByText('Cancel Ride')).toBeTruthy();
    });
  });
});
