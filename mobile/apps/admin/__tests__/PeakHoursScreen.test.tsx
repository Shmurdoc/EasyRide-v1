import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PeakHoursScreen from '../screens/PeakHoursScreen';

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

jest.mock('../hooks/usePeakHours', () => ({
  usePeakHours: jest.fn(() => ({
    hours: [
      { id: 'ph-1', name: 'Morning Rush', day_of_week: 1, start_time: '06:00', end_time: '09:00', multiplier: 1.3, is_active: true },
      { id: 'ph-2', name: 'Evening Peak', day_of_week: 5, start_time: '16:00', end_time: '19:00', multiplier: 1.5, is_active: false },
    ],
    loading: false,
    error: null,
    refreshing: false,
    refresh: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    dayFilter: undefined,
    setDayFilter: jest.fn(),
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

describe('PeakHoursScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders header title', async () => {
    const { getByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      expect(getByText('Peak Hours')).toBeTruthy();
    });
  });

  it('renders peak hour names', async () => {
    const { getByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      expect(getByText('Morning Rush')).toBeTruthy();
      expect(getByText('Evening Peak')).toBeTruthy();
    });
  });

  it('renders day filter tabs', async () => {
    const { getByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Mon')).toBeTruthy();
      expect(getByText('Fri')).toBeTruthy();
    });
  });

  it('renders time ranges for each hour', async () => {
    const { getByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      expect(getByText('06:00 - 09:00')).toBeTruthy();
      expect(getByText('16:00 - 19:00')).toBeTruthy();
    });
  });

  it('renders day names', async () => {
    const { getByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      expect(getByText('Monday')).toBeTruthy();
      expect(getByText('Friday')).toBeTruthy();
    });
  });

  it('renders loading state', () => {
    const { usePeakHours } = require('../hooks/usePeakHours');
    usePeakHours.mockReturnValueOnce({
      hours: [], loading: true, error: null, refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
      dayFilter: undefined, setDayFilter: jest.fn(),
    });
    const { getByText } = render(<PeakHoursScreen />);
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders error state', () => {
    const { usePeakHours } = require('../hooks/usePeakHours');
    usePeakHours.mockReturnValueOnce({
      hours: [], loading: false, error: 'Failed to load', refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
      dayFilter: undefined, setDayFilter: jest.fn(),
    });
    const { getByText } = render(<PeakHoursScreen />);
    expect(getByText('Failed to load')).toBeTruthy();
  });

  it('renders empty state when no hours', () => {
    const { usePeakHours } = require('../hooks/usePeakHours');
    usePeakHours.mockReturnValueOnce({
      hours: [], loading: false, error: null, refreshing: false, refresh: jest.fn(),
      add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(),
      dayFilter: undefined, setDayFilter: jest.fn(),
    });
    const { getByText } = render(<PeakHoursScreen />);
    expect(getByText('No peak hours')).toBeTruthy();
  });

  it('renders multiplier badges', async () => {
    const { getAllByText } = render(<PeakHoursScreen />);
    await waitFor(() => {
      const badges = getAllByText(/1\.3x|1\.5x/);
      expect(badges.length).toBe(2);
    });
  });
});
