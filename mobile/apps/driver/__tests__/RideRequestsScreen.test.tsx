import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import RideRequestsScreen from '../screens/RideRequestsScreen';
import { drivers, useSocket, scheduleLocalNotification } from '@easyryde/shared';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('RideRequestsScreen', () => {
  const mockEmit = jest.fn();
  let socketHandlers: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    socketHandlers = {};
    (useSocket as jest.Mock).mockReturnValue({
      isConnected: true,
      emit: mockEmit,
      on: jest.fn((event: string, cb: Function) => {
        socketHandlers[event] = cb;
        return jest.fn();
      }),
    });
    (drivers.trips as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'trip-1',
          pickup_address: '123 Main St',
          dropoff_address: '456 Oak Ave',
          total_fare: 85,
          distance_km: 5.2,
          created_at: '2025-01-15T10:30:00Z',
          status: 'completed',
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders ride requests header', () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    expect(getByText('Ride Requests')).toBeTruthy();
  });

  it('shows requests tab by default', () => {
    const { getAllByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    expect(getAllByText(/Requests/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no requests', () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    expect(getByText('No pending requests')).toBeTruthy();
    expect(getByText('Go online to start receiving ride requests')).toBeTruthy();
  });

  it('switches to history tab', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText(/History/));
    });
    await waitFor(() => {
      expect(getByText("Today's Rides")).toBeTruthy();
    });
  });

  it('loads trips on mount', async () => {
    render(<RideRequestsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(drivers.trips).toHaveBeenCalled();
    });
  });

  it('displays trip data after loading', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText(/History/));
    });
    await waitFor(() => {
      expect(getByText('R85')).toBeTruthy();
    });
  });

  it('shows requests count in header subtitle', () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    expect(getByText('0 pending requests')).toBeTruthy();
  });

  it('handles ride request via socket', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);

    await act(async () => {
      if (socketHandlers['ride:request']) {
        socketHandlers['ride:request']({
          rideId: 'ride-123',
          riderId: 'rider-123',
          category: 'EasyRyde',
          price: 95,
          distance: 3.2,
          duration: 12,
          pickupName: 'Mall',
          pickupAddress: 'Shopping Mall',
          destName: 'Home',
          destAddress: '123 Street',
          riderName: 'Alice',
          riderRating: 4.7,
        });
      }
    });

    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('R95')).toBeTruthy();
    });
  });

  it('accepts a ride request', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);

    await act(async () => {
      if (socketHandlers['ride:request']) {
        socketHandlers['ride:request']({
          rideId: 'ride-456',
          riderId: 'rider-456',
          category: 'EasyRyde',
          price: 120,
          distance: 4.0,
          duration: 15,
          pickupName: 'Airport',
          pickupAddress: 'Airport Terminal',
          destName: 'Hotel',
          destAddress: 'Grand Hotel',
          riderName: 'Bob',
          riderRating: 4.9,
        });
      }
    });

    await waitFor(() => {
      expect(getByText('Accept')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Accept'));
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('driver:accept-ride', {
        rideId: 'ride-456',
        riderId: 'rider-456',
      });
    });
  });

  it('declines a ride request', async () => {
    const { getByText, queryByText } = render(<RideRequestsScreen navigation={mockNavigation} />);

    await act(async () => {
      if (socketHandlers['ride:request']) {
        socketHandlers['ride:request']({
          rideId: 'ride-789',
          riderId: 'rider-789',
          category: 'EasyRyde',
          price: 75,
          distance: 2.0,
          duration: 10,
          pickupName: 'Station',
          pickupAddress: 'Train Station',
          destName: 'Office',
          destAddress: 'Business Park',
          riderName: 'Carol',
          riderRating: 4.5,
        });
      }
    });

    await act(async () => {
      fireEvent.press(getByText('Decline'));
    });

    await waitFor(() => {
      expect(queryByText('Carol')).toBeNull();
    });
  });

  it('renders trip history items', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText(/History/));
    });
    await waitFor(() => {
      expect(getByText('123 Main St')).toBeTruthy();
      expect(getByText('456 Oak Ave')).toBeTruthy();
    });
  });

  it('shows trip completed badge in history', async () => {
    const { getByText } = render(<RideRequestsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText(/History/));
    });
    await waitFor(() => {
      expect(getByText('Completed')).toBeTruthy();
    });
  });
});
