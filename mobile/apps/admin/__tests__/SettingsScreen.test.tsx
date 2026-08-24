import React from 'react';
import { waitFor } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';
import { renderWithNavigation } from './test-utils';

jest.mock('../hooks/useAdminSettings', () => ({
  useAdminSettings: jest.fn(() => ({
    settings: {
      base_fare: 25, per_km_rate: 8, per_minute_rate: 1.5,
      surge_multiplier: 1, max_surge: 2.5,
      push_notifications: true, email_notifications: true, sms_notifications: false,
    },
    loading: false,
    error: null,
    refreshing: false,
    refresh: jest.fn(),
    updateSetting: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('SettingsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders settings values', async () => {
    const { getByText } = renderWithNavigation(
      <SettingsScreen />
    );
    await waitFor(() => {
      expect(getByText('R25.00')).toBeTruthy();
      expect(getByText('R8.0')).toBeTruthy();
    });
  });

  it('renders notification settings', async () => {
    const { getByText } = renderWithNavigation(
      <SettingsScreen />
    );
    await waitFor(() => {
      expect(getByText(/Push/)).toBeTruthy();
    });
  });

  it('renders loading state', async () => {
    const { useAdminSettings } = require('../hooks/useAdminSettings');
    useAdminSettings.mockReturnValueOnce({
      settings: {}, loading: true, error: null, refreshing: false,
      refresh: jest.fn(), updateSetting: jest.fn(),
    });
    const { getByText } = renderWithNavigation(
      <SettingsScreen />
    );
    await waitFor(() => {
      expect(getByText('Loading...')).toBeTruthy();
    });
  });
});
