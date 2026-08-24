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

import { DriverDetailScreen } from '../screens/DriverDetailScreen';

const mockDriver = {
  id: 'd1',
  name: 'Mike Driver',
  email: 'mike@test.com',
  phone: '+27123456789',
  is_online: true,
  created_at: '2024-06-01T00:00:00Z',
  driverProfile: {
    id: 'dp1',
    rating: 4.8,
    total_trips: 234,
    total_earnings: 45000,
    is_approved: true,
    is_verified: true,
    background_check: true,
    approved_at: '2024-06-15T00:00:00Z',
  },
  vehicle: {
    make: 'Toyota', model: 'Corolla', year: 2023, color: 'White',
    license_plate: 'ABC 123 GP', vehicle_type: 'sedan',
  },
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

describe('DriverDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders driver name', async () => {
    const { getAllByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getAllByText('Mike Driver').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders status badge', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('ONLINE')).toBeTruthy();
    });
  });

  it('renders personal information', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('mike@test.com')).toBeTruthy();
      expect(getByText('+27123456789')).toBeTruthy();
    });
  });

  it('renders vehicle information', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Toyota Corolla (2023)')).toBeTruthy();
      expect(getByText('White')).toBeTruthy();
    });
  });

  it('renders license plate', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('ABC 123 GP')).toBeTruthy();
    });
  });

  it('renders stats: rating, trips, earnings', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('234')).toBeTruthy();
      expect(getByText('R45,000')).toBeTruthy();
    });
  });

  it('renders verification info', async () => {
    const { getAllByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getAllByText('Yes').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders action buttons', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { driver: mockDriver } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Call')).toBeTruthy();
      expect(getByText('Message')).toBeTruthy();
    });
  });

  it('renders loading state when no driver param and id provided', () => {
    jest.mock('../../../packages/shared/src/api/index', () => ({
      api: { get: jest.fn().mockReturnValue(new Promise(() => {})) },
    }));
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: { id: 'd1' } }}
      />
    );
    expect(getByText('Driver')).toBeTruthy();
  });

  it('renders error state when no driver and no id', async () => {
    const { getByText } = render(
      <DriverDetailScreen
        navigation={mockNavigation}
        route={{ params: {} }}
      />
    );
    await waitFor(() => {
      expect(getByText('No driver ID provided')).toBeTruthy();
    });
  });
});
