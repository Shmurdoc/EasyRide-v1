import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockDefaultLogin = jest.fn().mockResolvedValue({ user: { id: 'u1', name: 'Test Rider' } });

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    useAuth: jest.fn().mockReturnValue({
      login: mockDefaultLogin,
    }),
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

function renderLogin() {
  return renderWithNavigation(
    <LoginScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() } as any} />
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDefaultLogin.mockResolvedValue({ user: { id: 'u1', name: 'Test Rider' } });
    const { useAuth } = require('@easyryde/shared');
    useAuth.mockReturnValue({ login: mockDefaultLogin });
  });

  it('renders the rider login title', () => {
    const { getByText } = renderLogin();
    expect(getByText('Rider Login')).toBeTruthy();
  });

  it('starts with empty email and password fields', () => {
    const { getByTestId } = renderLogin();
    expect(getByTestId('email-input').props.value).toBe('');
    expect(getByTestId('password-input').props.value).toBe('');
  });

  it('renders email and password labels', () => {
    const { getAllByText } = renderLogin();
    expect(getAllByText('Email').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Password').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sign in button', () => {
    const { getByText } = renderLogin();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows Forgot Password link', () => {
    const { getByText } = renderLogin();
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('shows Sign Up link', () => {
    const { getByText } = renderLogin();
    expect(getByText(/Don't have an account/)).toBeTruthy();
  });

  it('Sign Up link navigates to Register', () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText('Sign Up'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('successful login calls login with entered credentials', async () => {
    const { getByTestId, getByText } = renderLogin();
    fireEvent.changeText(getByTestId('email-input'), 'rider@easyryde.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockDefaultLogin).toHaveBeenCalledWith('rider@easyryde.com', 'password');
    });
  });

  it('login failure shows error alert', async () => {
    mockDefaultLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { getByTestId, getByText } = renderLogin();
    fireEvent.changeText(getByTestId('email-input'), 'rider@easyryde.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('validates empty fields', async () => {
    const { getByText, getByTestId } = renderLogin();
    fireEvent.changeText(getByTestId('email-input'), '');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('back button returns to role selection', () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText('< Back'));
    expect(getByText('EasyRyde')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('role selection shows all roles', () => {
    const { getByText } = renderLogin();
    fireEvent.press(getByText('< Back'));
    expect(getByText('Rider')).toBeTruthy();
    expect(getByText('Driver')).toBeTruthy();
    expect(getByText('Admin')).toBeTruthy();
  });
});