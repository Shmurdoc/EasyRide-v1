import React from 'react';
import { waitFor } from '@testing-library/react-native';
import ConsentScreen from '../screens/ConsentScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

describe('ConsentScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders consent screen', async () => {
    const { getByText } = renderWithNavigation(
      <ConsentScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getByText(/Consent/)).toBeTruthy();
    });
  });
});
