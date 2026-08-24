import React from 'react';
import { waitFor } from '@testing-library/react-native';
import NotificationScreen from '../screens/NotificationScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('NotificationScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders notifications screen', async () => {
    const { getByText } = renderWithNavigation(
      <NotificationScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText(/Notification/)).toBeTruthy();
    });
  });
});
