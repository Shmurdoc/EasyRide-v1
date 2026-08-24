import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const mockUser = {
    id: 'u1', name: 'Test Rider', email: 'rider@easyryde.com', avatar_url: null,
    total_trips: 12, average_rating: 4.8, created_at: '2024-01-15T00:00:00Z',
  };
  const mockRide = {
    id: 'ride-123', status: 'completed', category: 'economy',
    pickup_address: '45 Selati Road, Phalaborwa', dropoff_address: 'Mall of the North',
    pickup_latitude: -23.94, pickup_longitude: 31.08, dropoff_latitude: -23.88, dropoff_longitude: 31.08,
    base_fare: 35, distance_km: 8.2, duration_minutes: 15, per_km_fare: 12, total_fare: 145,
    payment_method: 'cash', discount_amount: 0, route_polyline: null, driver_id: 'd1', driver_eta: 3,
    driver: { id: 'd1', name: 'John Driver', phone_number: '+27123456789', average_rating: 4.9, total_trips: 234, vehicle: { make: 'Toyota', model: 'Corolla', color: 'White' } },
    completed_at: '2025-01-10T10:00:00Z', cancelled_by: null, cancellation_reason: null,
  };
  return {
    ...actual,
    useAuth: jest.fn().mockReturnValue({
      user: mockUser,
      token: 'test-token',
    }),
    rides: {
      list: jest.fn().mockResolvedValue({ data: [mockRide] }),
      current: jest.fn().mockResolvedValue(null),
    },
    ErrorBoundary: ({ children }: any) => children,
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    MAP_REGION: actual.MAP_REGION,
    PHALABORWA_CENTER: actual.PHALABORWA_CENTER,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    SHADOWS: actual.SHADOWS,
    FONTS: actual.FONTS,
    formatCurrency: actual.formatCurrency,
    formatDate: actual.formatDate,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -23.94, longitude: 31.08 },
  }),
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, PROVIDER_DEFAULT: 'default', Marker: View, Polyline: View };
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

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: jest.fn(),
} as any;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the greeting with user first name', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText(/Test/)).toBeTruthy();
    });
  });

  it('displays default greeting when no user name', async () => {
    const { useAuth } = require('@easyryde/shared');
    useAuth.mockReturnValueOnce({ user: null, token: null });
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText(/Rider/)).toBeTruthy();
    });
  });

  it('renders quick service tiles', async () => {
    const { getByText, queryByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText('Ride')).toBeTruthy();
      expect(getByText('Food')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
      expect(queryByText('Parcel')).toBeNull();
    });
  });

  it('renders the search pill with "Where to?"', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText('Where to?')).toBeTruthy();
    });
  });

  it('navigates to BookRide when search pill is pressed', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      fireEvent.press(getByText('Where to?'));
      expect(mockNavigate).toHaveBeenCalledWith('BookRide');
    });
  });

  it('navigates to BookRide when Ride service tile is pressed', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      fireEvent.press(getByText('Ride'));
      expect(mockNavigate).toHaveBeenCalledWith('BookRide');
    });
  });

  it('displays user stats with total trips and rating', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText('12')).toBeTruthy();
      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('TRIPS')).toBeTruthy();
      expect(getByText('RATING')).toBeTruthy();
    });
  });

  it('shows recent destinations section', async () => {
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText('Recent destinations')).toBeTruthy();
    });
  });

  it('shows empty state when no recent trips', async () => {
    const { rides } = require('@easyryde/shared');
    rides.list.mockResolvedValueOnce({ data: [] });
    const { getByText } = renderWithNavigation(
      <HomeScreen navigation={mockNavigation} route={{} as any} />
    );
    await waitFor(() => {
      expect(getByText('No recent trips yet')).toBeTruthy();
    });
  });
});
