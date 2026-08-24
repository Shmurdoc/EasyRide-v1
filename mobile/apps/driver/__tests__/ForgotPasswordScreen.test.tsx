import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    auth: {
      forgotPassword: jest.fn().mockResolvedValue(undefined),
    },
    useAuth: jest.fn(() => ({
      user: null, token: null, isAuthenticated: false, isLoading: false,
      login: jest.fn(), logout: jest.fn(), register: jest.fn(),
      refreshUser: jest.fn(), refreshToken: jest.fn(),
    })),
  };
});

describe('ForgotPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders forgot password form', async () => {
    const { getAllByText } = renderWithNavigation(
      <ForgotPasswordScreen {...({ navigation: mockNavigation, route: {} } as any)} />
    );
    await waitFor(() => {
      expect(getAllByText(/Reset Password/).length).toBeGreaterThan(0);
    });
  });
});
