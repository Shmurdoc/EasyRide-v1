import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import SurgeZonesScreen from '../screens/SurgeZonesScreen';

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

const mockToggle = jest.fn();
const mockRemove = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../hooks/useSurgePricing', () => ({
  useSurgeZones: jest.fn(() => ({
    zones: [
      { id: 'sz-1', name: 'CBD Zone', center_lat: -23.94, center_lng: 31.08, radius_meters: 2000, multiplier: 1.5, is_active: true },
      { id: 'sz-2', name: 'Airport Zone', center_lat: -23.95, center_lng: 31.15, radius_meters: 1500, multiplier: 2.0, is_active: false },
    ],
    loading: false,
    error: null,
    refreshing: false,
    refresh: mockRefresh,
    add: jest.fn(),
    update: jest.fn(),
    remove: mockRemove,
    toggle: mockToggle,
  })),
}));

jest.mock('../components/common/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Card: (props: any) => React.createElement(View, props, props.children) };
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

jest.mock('../components/common/EmptyState', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return ({ message, subtitle }: any) => React.createElement(View, null,
    React.createElement(Text, null, message),
    subtitle ? React.createElement(Text, null, subtitle) : null
  );
});

describe('SurgeZonesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders header title', async () => {
    const { getByText } = render(<SurgeZonesScreen />);
    await waitFor(() => {
      expect(getByText('Surge Zones')).toBeTruthy();
    });
  });

  it('renders zone names', async () => {
    const { getByText } = render(<SurgeZonesScreen />);
    await waitFor(() => {
      expect(getByText('CBD Zone')).toBeTruthy();
      expect(getByText('Airport Zone')).toBeTruthy();
    });
  });

  it('renders multiplier badges', async () => {
    const { getAllByText } = render(<SurgeZonesScreen />);
    await waitFor(() => {
      const badges = getAllByText(/1\.5x|2\.0x/);
      expect(badges.length).toBe(2);
    });
  });

  it('renders loading state', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: true, error: null, refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
    });
    const { getByText } = render(<SurgeZonesScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders error state', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: false, error: 'Failed to load', refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
    });
    const { getByText } = render(<SurgeZonesScreen />);
    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('renders empty state when no zones', () => {
    const { useSurgeZones } = require('../hooks/useSurgePricing');
    useSurgeZones.mockReturnValueOnce({
      zones: [], loading: false, error: null, refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
    });
    const { getByText } = render(<SurgeZonesScreen />);
    expect(getByText('No surge zones')).toBeTruthy();
  });

  it('shows coordinates for each zone', async () => {
    const { getByText } = render(<SurgeZonesScreen />);
    await waitFor(() => {
      expect(getByText(/-23\.94.*31\.08/)).toBeTruthy();
    });
  });
});
