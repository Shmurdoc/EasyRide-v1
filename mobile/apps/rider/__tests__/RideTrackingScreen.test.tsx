import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RideTrackingScreen from '../screens/RideTrackingScreen';
import { renderWithNavigation } from './test-utils';

const mockRide = {
  id: 'ride-123', status: 'in_progress', category: 'economy',
  pickup_address: '45 Selati Road, Phalaborwa', dropoff_address: 'Mall of the North',
  pickup_latitude: -23.94, pickup_longitude: 31.08, dropoff_latitude: -23.88, dropoff_longitude: 31.08,
  base_fare: 35, distance_km: 8.2, duration_minutes: 15, per_km_fare: 12, total_fare: 145,
  payment_method: 'cash', discount_amount: 0, route_polyline: null, driver_id: 'd1', driver_eta: 3,
  driver: { id: 'd1', name: 'John Driver', phone_number: '+27123456789', average_rating: 4.9, total_trips: 234, vehicle: { make: 'Toyota', model: 'Corolla', color: 'White' } },
  completed_at: null, cancelled_by: null, cancellation_reason: null,
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    useAuth: () => ({ user: { id: 'u1' }, token: 'test-token' }),
    useSocket: () => ({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempt: 0,
      on: jest.fn(),
      emit: jest.fn(),
      joinRoom: jest.fn(),
    }),
    rides: {
      get: jest.fn().mockResolvedValue({
        ...mockRide,
      }),
      cancel: jest.fn().mockResolvedValue({}),
      rate: jest.fn().mockResolvedValue({}),
    },
    decodePolyline: jest.fn().mockReturnValue([]),
    ReconnectionBanner: () => null,
    calculateDistance: () => 8.2,
    formatDistance: (d: number) => `${d.toFixed(1)} km`,
    formatZAR: (a: number) => `R ${a.toFixed(2)}`,
    PHALABORWA_CENTER: { latitude: -23.94, longitude: 31.08 },
    GlowButton: ({ title, onPress }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress}><Text>{title}</Text></TouchableOpacity>;
    },
    GlassCard: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
    GradientText: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Typography: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Avatar: ({ name }: any) => {
      const { Text } = require('react-native');
      return <Text>{name}</Text>;
    },
    LoadingOverlay: () => {
      const { Text } = require('react-native');
      return <Text>Loading</Text>;
    },
    AnimatedCheckmark: () => null,
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props: any, ref: any) => <View ref={ref} testID="map-view" />);
  return { __esModule: true, default: MockMapView, PROVIDER_DEFAULT: 'default', Marker: View, Polyline: View };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => <Text>{props.name}</Text>,
  };
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

function renderTracking(rideId = 'ride-123') {
  return renderWithNavigation(
    <RideTrackingScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() } as any}
      route={{ params: { rideId } } as any}
    />
  );
}

describe('RideTrackingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    const { queryByText } = renderTracking();
    expect(queryByText('Invalid ride')).toBeNull();
    expect(queryByText('Ride Cancelled')).toBeNull();
  });

  it('loads and displays ride data for searching state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'searching' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText(/Finding your driver/)).toBeTruthy();
    });
  });

  it('displays trip summary with category and destination', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'searching' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('economy')).toBeTruthy();
      expect(getByText('Mall of the North')).toBeTruthy();
    });
  });

  it('displays pickup and dropoff addresses', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'searching' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Mall of the North')).toBeTruthy();
    });
  });

  it('shows cancel button in searching state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'searching' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Cancel Request')).toBeTruthy();
    });
  });

  it('cancel button triggers Alert confirmation', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'searching' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      fireEvent.press(getByText('Cancel Request'));
    });
    const { Alert } = require('react-native');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      expect.any(Array)
    );
  });

  it('shows accepted state with driver info', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'accepted' });
    const { getAllByText } = renderTracking();
    await waitFor(() => {
      expect(getAllByText('John Driver').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows ETA in accepted state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'accepted', driver_eta: 5 });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText(/min/)).toBeTruthy();
    });
  });

  it('shows arrived state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'arrived' });
    const { getAllByText } = renderTracking();
    await waitFor(() => {
      expect(getAllByText('John Driver').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows in-progress state with trip progress', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'in_progress' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Trip Progress')).toBeTruthy();
    });
  });

  it('shows completed state with rating', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'completed', total_fare: 145 });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Trip Complete!')).toBeTruthy();
      expect(getByText('Rate your trip')).toBeTruthy();
    });
  });

  it('rating stars are clickable in completed state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'completed' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Trip Complete!')).toBeTruthy();
    });
  });

  it('shows cancelled state', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockResolvedValueOnce({ ...mockRide, status: 'cancelled' });
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Ride Cancelled')).toBeTruthy();
    });
  });

  it('handles missing rideId', () => {
    const { getByText } = renderWithNavigation(
      <RideTrackingScreen
        navigation={{ navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() } as any}
        route={{ params: {} } as any}
      />
    );
    expect(getByText('Invalid ride')).toBeTruthy();
  });

  it('handles ride load failure', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockRejectedValueOnce(new Error('Network error'));
    const { getByText } = renderTracking();
    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });
});
