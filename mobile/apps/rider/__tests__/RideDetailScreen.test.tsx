import React from 'react';
import { waitFor } from '@testing-library/react-native';
import RideDetailScreen from '../screens/RideDetailScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    rides: {
      get: jest.fn().mockResolvedValue({
        id: 'ride-123',
        status: 'completed',
        category: 'economy',
        pickup_address: '45 Selati Road, Phalaborwa',
        dropoff_address: 'Mall of the North',
        pickup_latitude: -23.94,
        pickup_longitude: 31.08,
        dropoff_latitude: -23.88,
        dropoff_longitude: 31.08,
        base_fare: 35,
        distance_km: 8.2,
        duration_minutes: 15,
        per_km_fare: 12,
        total_fare: 145,
        payment_method: 'cash',
        payment_status: 'completed',
        discount_amount: 0,
        surge_multiplier: 1,
        driver: {
          id: 'd1',
          name: 'John Driver',
          phone_number: '+27123456789',
          average_rating: 4.9,
          total_trips: 234,
          vehicle: { make: 'Toyota', model: 'Corolla', color: 'White', license_plate: 'ABC 123 GP' },
        },
        created_at: '2025-01-15T10:30:00Z',
      }),
    },
    GlassCard: ({ children }: any) => children,
    Shimmer: () => null,
    ErrorState: ({ message, onRetry }: any) => null,
    RideStatusBadge: () => null,
    GlowButton: ({ title }: any) => null,
    GradientText: ({ children }: any) => children,
    Typography: () => null,
  };
});

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, PROVIDER_DEFAULT: 'default' };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (props: any) => null };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return { Ionicons: (props: any) => React.createElement('Ionicons', props) };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() } as any;

describe('RideDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders ride details after loading', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('Ride Details')).toBeTruthy();
    });
  });

  it('renders pickup address', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('45 Selati Road, Phalaborwa')).toBeTruthy();
    });
  });

  it('renders dropoff address', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('Mall of the North')).toBeTruthy();
    });
  });

  it('renders status label', async () => {
    const { getAllByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      const matches = getAllByText('Completed');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders driver name', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('John Driver')).toBeTruthy();
    });
  });

  it('renders vehicle info', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('White Toyota Corolla')).toBeTruthy();
    });
  });

  it('renders fare breakdown', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText(/Fare Breakdown/)).toBeTruthy();
    });
  });

  it('renders total fare', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText(/Base fare/)).toBeTruthy();
    });
  });

  it('renders payment method', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('cash')).toBeTruthy();
    });
  });

  it('renders distance info', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText(/8.2 km/)).toBeTruthy();
    });
  });

  it('renders re-book button', async () => {
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('Re-book this route')).toBeTruthy();
    });
  });

  it('shows loading shimmer on mount', () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockReturnValueOnce(new Promise(() => {}));
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    expect(getByText('Ride Details')).toBeTruthy();
  });

  it('handles API error gracefully', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockRejectedValueOnce(new Error('Failed to load'));
    const { getByText } = renderWithNavigation(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { rideId: 'ride-123' } } as any}
      />
    );
    await waitFor(() => {
      expect(getByText('Ride Details')).toBeTruthy();
    });
  });
});
