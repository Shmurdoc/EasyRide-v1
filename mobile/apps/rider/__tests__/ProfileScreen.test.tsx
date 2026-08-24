import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../screens/ProfileScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const mockUser = {
    id: 'u1', name: 'Test Rider', email: 'rider@easyryde.com', avatar_url: null,
    total_trips: 12, average_rating: 4.8, created_at: '2024-01-15T00:00:00Z',
  };
  return {
    ...actual,
    useAuth: jest.fn().mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
    }),
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    SHADOWS: actual.SHADOWS,
    FONTS: actual.FONTS,
    ErrorBoundary: ({ children }: any) => children,
    Avatar: ({ name }: any) => {
      const { Text } = require('react-native');
      return <Text>{name?.[0] || 'R'}</Text>;
    },
  };
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

function renderProfile() {
  return renderWithNavigation(
    <ProfileScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() } as any} />
  );
}

describe('ProfileScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders user name', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Test Rider')).toBeTruthy();
    });
  });

  it('renders user email', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText(/rider@easyryde\.com/)).toBeTruthy();
    });
  });

  it('displays user rating', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('4.8')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });
  });

  it('displays total trips', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('12')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
    });
  });

  it('shows Member Since stat', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Member Since')).toBeTruthy();
    });
  });

  it('renders all menu items', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Personal Info')).toBeTruthy();
      expect(getByText('Payment Methods')).toBeTruthy();
      expect(getByText('Saved Places')).toBeTruthy();
      expect(getByText('Ride History')).toBeTruthy();
      expect(getByText('Promo Codes')).toBeTruthy();
      expect(getByText('Notifications')).toBeTruthy();
      expect(getByText('Help & Support')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
    });
  });

  it('navigates to Support on Support menu press', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      fireEvent.press(getByText('Help & Support'));
      expect(mockNavigate).toHaveBeenCalledWith('Support');
    });
  });

  it('navigates to PromoCode on Promo Codes press', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      fireEvent.press(getByText('Promo Codes'));
      expect(mockNavigate).toHaveBeenCalledWith('PromoCode');
    });
  });

  it('navigates to RideHistory on Ride History press', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      fireEvent.press(getByText('Ride History'));
      expect(mockNavigate).toHaveBeenCalledWith('RideHistory');
    });
  });

  it('shows Settings alert', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      fireEvent.press(getByText('Settings'));
    });
    const { Alert } = require('react-native');
    expect(Alert.alert).toHaveBeenCalledWith('Settings', expect.any(String));
  });

  it('shows Earn by Driving button', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Earn by Driving')).toBeTruthy();
    });
  });

  it('shows Sign Out button', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Sign Out')).toBeTruthy();
    });
  });

  it('sign out shows confirmation alert', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      fireEvent.press(getByText('Sign Out'));
    });
    const { Alert } = require('react-native');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });

  it('shows version number', async () => {
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('EasyRyde v1.0.0')).toBeTruthy();
    });
  });

  it('handles null user gracefully', async () => {
    const { useAuth } = require('@easyryde/shared');
    useAuth.mockReturnValueOnce({ user: null, logout: jest.fn() });
    const { getByText } = renderProfile();
    await waitFor(() => {
      expect(getByText('Rider')).toBeTruthy();
    });
  });
});
