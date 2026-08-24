import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return { Ionicons: (props: any) => React.createElement('Ionicons', props) };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: (props: any) => React.createElement('LinearGradient', props) };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../components/common/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Card: (props: any) => React.createElement(View, props, props.children) };
});

jest.mock('../components/common/Badge', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Badge: ({ label }: any) => React.createElement(Text, null, label) };
});

jest.mock('../components/common/Avatar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Avatar: () => React.createElement(View) };
});

import { RideDetailScreen } from '../screens/RideDetailScreen';

const mockRide = {
  id: 'ride-abc-123-def',
  status: 'completed',
  pickup_address: '45 Selati Road, Phalaborwa',
  dropoff_address: 'Mall of the North',
  total_fare: '145.00',
  payment: { method: 'cash', status: 'completed' },
  rider: { name: 'John Rider', email: 'john@test.com' },
  driver: { name: 'Mike Driver', vehicle: { make: 'Toyota', model: 'Corolla', license_plate: 'ABC 123 GP' } },
  rating: { score: 5, comment: 'Great ride!' },
  created_at: '2025-01-15T10:30:00Z',
  accepted_at: '2025-01-15T10:35:00Z',
  started_at: '2025-01-15T10:42:00Z',
  completed_at: '2025-01-15T11:00:00Z',
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

describe('RideDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders ride ID', async () => {
    const { getAllByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getAllByText(/Ride/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders status badge', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText(/COMPLETED/)).toBeTruthy();
    });
  });

  it('renders pickup and dropoff addresses', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('45 Selati Road, Phalaborwa')).toBeTruthy();
      expect(getByText('Mall of the North')).toBeTruthy();
    });
  });

  it('renders rider info', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('John Rider')).toBeTruthy();
      expect(getByText('john@test.com')).toBeTruthy();
    });
  });

  it('renders driver info', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Mike Driver')).toBeTruthy();
    });
  });

  it('renders fare', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('R145.00')).toBeTruthy();
    });
  });

  it('renders payment info', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('cash')).toBeTruthy();
    });
  });

  it('renders timeline events', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Ride requested')).toBeTruthy();
      expect(getByText('Trip completed')).toBeTruthy();
    });
  });

  it('renders rating', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('5/5')).toBeTruthy();
      expect(getByText('Great ride!')).toBeTruthy();
    });
  });

  it('renders action buttons', async () => {
    const { getByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: mockRide } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Call Rider')).toBeTruthy();
    });
  });

  it('handles ride without driver', async () => {
    const rideNoDriver = { ...mockRide, driver: undefined };
    const { queryByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: rideNoDriver } }}
      />
    );
    await waitFor(() => {
      expect(queryByText('Call Driver')).toBeNull();
    });
  });

  it('handles ride without rating', async () => {
    const rideNoRating = { ...mockRide, rating: undefined };
    const { queryByText } = render(
      <RideDetailScreen
        navigation={mockNavigation}
        route={{ params: { ride: rideNoRating } }}
      />
    );
    await waitFor(() => {
      expect(queryByText('5/5')).toBeNull();
    });
  });
});
