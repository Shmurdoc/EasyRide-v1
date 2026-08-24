import React from 'react';
import { waitFor } from '@testing-library/react-native';
import SupportScreen from '../screens/SupportScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('SupportScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders help and support title', async () => {
    const { getByText } = renderWithNavigation(
      <SupportScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText('Support')).toBeTruthy();
    });
  });

  it('renders contact information', async () => {
    const { getByText } = renderWithNavigation(
      <SupportScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText(/support/)).toBeTruthy();
    });
  });
});
