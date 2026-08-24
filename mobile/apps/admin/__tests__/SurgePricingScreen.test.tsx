import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SurgePricingScreen from '../screens/SurgePricingScreen';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: (props: any) => React.createElement('LinearGradient', props) };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('../hooks/useSurgePricing', () => ({
  useSurgeZones: jest.fn(() => ({
    zones: [
      { id: 'sz-1', name: 'CBD', center_lat: -23.94, center_lng: 31.08, radius_meters: 2000, multiplier: 1.5, is_active: true },
      { id: 'sz-2', name: 'Airport', center_lat: -23.94, center_lng: 31.15, radius_meters: 1500, multiplier: 2.0, is_active: true },
    ],
    loading: false,
    error: null,
    refreshing: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('../hooks/usePeakHours', () => ({
  usePeakHours: jest.fn(() => ({
    hours: [
      { id: 'ph-1', name: 'Morning Rush', day_of_week: 1, start_time: '06:00', end_time: '09:00', multiplier: 1.3, is_active: true },
    ],
    loading: false,
    error: null,
    refreshing: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('../components/common/Card', () => {
  const React = require('react');
  return { Card: (props: any) => React.createElement('View', props, props.children) };
});

jest.mock('../components/common/LoadingSpinner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => React.createElement(Text, null, 'Loading...');
});

jest.mock('../components/common/ErrorState', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ message }: any) => React.createElement(Text, null, message);
});

describe('SurgePricingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders header title', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('Surge Pricing')).toBeTruthy();
    });
  });

  it('renders active zones count', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('2')).toBeTruthy();
    });
  });

  it('renders active peak hours count', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy();
    });
  });

  it('renders zone names', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('CBD')).toBeTruthy();
      expect(getByText('Airport')).toBeTruthy();
    });
  });

  it('renders peak hour names', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('Morning Rush')).toBeTruthy();
    });
  });

  it('renders quick action buttons', async () => {
    const { getByText } = render(<SurgePricingScreen />);
    await waitFor(() => {
      expect(getByText('Manage Surge Zones')).toBeTruthy();
      expect(getByText('Manage Peak Hours')).toBeTruthy();
    });
  });

  it('renders loading state', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: true, error: null, refreshing: false, refresh: jest.fn(),
    });
    const { getByText } = render(<SurgePricingScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders error state', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: false, error: 'Failed to load', refreshing: false, refresh: jest.fn(),
    });
    const { getByText } = render(<SurgePricingScreen />);
    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('shows empty text when no zones', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: false, error: null, refreshing: false, refresh: jest.fn(),
    });
    const { getByText } = render(<SurgePricingScreen />);
    expect(getByText('No active surge zones')).toBeTruthy();
  });
});
