import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import { renderWithNavigation } from './test-utils';

const mockLogin = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  const { useAuth } = require('@easyryde/shared');
  useAuth.mockReturnValue({
    user: null, token: null, isAuthenticated: false, isLoading: false,
    login: mockLogin, logout: jest.fn(), register: jest.fn(),
    refreshUser: jest.fn(), refreshToken: jest.fn(),
  });
});

describe('LoginScreen', () => {
  it('renders login form', async () => {
    const { getByText, findByText } = renderWithNavigation(
      <LoginScreen />
    );
    expect(await findByText('EasyRyde')).toBeTruthy();
    expect(await findByText('Manage your fleet')).toBeTruthy();
  });

  it('shows error on empty fields', async () => {
    const { findAllByText, getByPlaceholderText } = renderWithNavigation(
      <LoginScreen />
    );
    fireEvent.changeText(getByPlaceholderText(/admin@easyryde/), '');
    fireEvent.changeText(getByPlaceholderText(/Enter password/), '');
    const signInButtons = await findAllByText('Sign In');
    fireEvent.press(signInButtons[signInButtons.length - 1]);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter email and password');
    });
  });

  it('calls login with credentials', async () => {
    const { getByPlaceholderText, findAllByText } = renderWithNavigation(
      <LoginScreen />
    );
    const emailInput = getByPlaceholderText(/admin@easyryde/);
    const passwordInput = getByPlaceholderText(/Enter password/);
    fireEvent.changeText(emailInput, 'admin@easyryde.com');
    fireEvent.changeText(passwordInput, 'password123');
    const buttons = await findAllByText('Sign In');
    fireEvent.press(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@easyryde.com', 'password123');
    });
  });
});
