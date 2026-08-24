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
  return { Avatar: ({ name }: any) => React.createElement(View) };
});

import { UserDetailScreen } from '../screens/UserDetailScreen';

const mockUser = {
  id: 'u1',
  name: 'John Rider',
  email: 'john@test.com',
  phone: '+27123456789',
  role: 'rider',
  is_active: true,
  created_at: '2024-01-15T00:00:00Z',
  last_login_at: '2025-06-10T08:30:00Z',
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };

describe('UserDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders user name', async () => {
    const { getAllByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getAllByText('John Rider').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders active badge', async () => {
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('ACTIVE')).toBeTruthy();
    });
  });

  it('renders personal information', async () => {
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('john@test.com')).toBeTruthy();
      expect(getByText('+27123456789')).toBeTruthy();
      expect(getByText('rider')).toBeTruthy();
    });
  });

  it('renders ride summary section', async () => {
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('247')).toBeTruthy();
      expect(getByText('239 (96.8%)')).toBeTruthy();
    });
  });

  it('renders spending section', async () => {
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('R18,450')).toBeTruthy();
      expect(getByText('R1,250')).toBeTruthy();
    });
  });

  it('renders action buttons', async () => {
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: mockUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('Call')).toBeTruthy();
      expect(getByText('Message')).toBeTruthy();
    });
  });

  it('shows inactive badge when user inactive', async () => {
    const inactiveUser = { ...mockUser, is_active: false };
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: inactiveUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('INACTIVE')).toBeTruthy();
    });
  });

  it('shows phone placeholder when missing', async () => {
    const noPhoneUser = { ...mockUser, phone: undefined };
    const { getByText } = render(
      <UserDetailScreen
        navigation={mockNavigation}
        route={{ params: { user: noPhoneUser } }}
      />
    );
    await waitFor(() => {
      expect(getByText('—')).toBeTruthy();
    });
  });
});
