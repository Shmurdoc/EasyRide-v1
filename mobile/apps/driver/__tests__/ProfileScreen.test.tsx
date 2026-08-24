import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth, drivers } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('ProfileScreen', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'driver-1',
        name: 'Test Driver',
        email: 'driver@easyryde.com',
      },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
    });
  });

  it('renders profile header with driver name', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('Test Driver')).toBeTruthy();
  });

  it('renders driver email', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('driver@easyryde.com')).toBeTruthy();
  });

  it('shows online status indicator', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('Online')).toBeTruthy();
  });

  it('displays rating stats', async () => {
    const { getAllByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText(/Rating/).length).toBeGreaterThan(0);
      expect(getAllByText('4.8').length).toBeGreaterThan(0);
    });
  });

  it('displays total trips stat', async () => {
    const { getAllByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Total Trips').length).toBeGreaterThan(0);
      expect(getAllByText('1847').length).toBeGreaterThan(0);
    });
  });

  it('displays acceptance rate stat', async () => {
    const { getAllByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('Acceptance').length).toBeGreaterThan(0);
      expect(getAllByText('96%').length).toBeGreaterThan(0);
    });
  });

  it('shows rating breakdown section', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('RATING BREAKDOWN')).toBeTruthy();
  });

  it('shows documents section', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('DOCUMENTS')).toBeTruthy();
  });

  it('displays document statuses', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('Vehicle Insurance')).toBeTruthy();
    expect(getByText('Vehicle Registration')).toBeTruthy();
    expect(getByText("Driver's License")).toBeTruthy();
    expect(getByText('Profile Photo')).toBeTruthy();
  });

  it('shows verified status for documents', () => {
    const { getAllByText } = render(<ProfileScreen navigation={mockNavigation} />);
    const verifiedBadges = getAllByText('Verified');
    expect(verifiedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows account section', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('ACCOUNT')).toBeTruthy();
  });

  it('displays menu items', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('My Profile')).toBeTruthy();
    expect(getByText('Vehicle Details')).toBeTruthy();
    expect(getByText('Documents')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Help & Support')).toBeTruthy();
  });

  it('navigates to Documents screen', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Documents'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Documents');
  });

  it('navigates to Support screen', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Help & Support'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Support');
  });

  it('shows sign out button', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('shows sign out confirmation alert', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText('Sign Out'));
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure?',
      expect.any(Array)
    );
  });

  it('calls logout when confirmed', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText('Sign Out'));
    });

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmButton = alertCall[2].find((b: any) => b.text === 'Sign Out');
    confirmButton.onPress();

    expect(mockLogout).toHaveBeenCalled();
  });

  it('opens vehicle details modal', async () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText('Vehicle Details'));
    });
    await waitFor(() => {
      expect(getByText('Vehicle Info')).toBeTruthy();
    });
  });

  it('displays version text', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('EasyRyde Driver v4.0.0')).toBeTruthy();
  });

  it('shows manage badge on documents menu item', () => {
    const { getByText } = render(<ProfileScreen navigation={mockNavigation} />);
    expect(getByText('Manage')).toBeTruthy();
  });
});
