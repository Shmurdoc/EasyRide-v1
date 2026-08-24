import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: jest.fn(),
    });
  });

  it('renders login form with email and password inputs', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('displays app title and tagline', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('EasyRyde Driver')).toBeTruthy();
    expect(getByText('Start Earning Today')).toBeTruthy();
  });

  it('starts with empty email field', () => {
    const { getByTestId } = render(<LoginScreen />);
    const emailInput = getByTestId('email-input');
    expect(emailInput.props.value).toBe('');
  });

  it('starts with empty password field', () => {
    const { getByTestId } = render(<LoginScreen />);
    const passwordInput = getByTestId('password-input');
    expect(passwordInput.props.value).toBe('');
  });

  it('shows error alert when email is empty', async () => {
    const { getByTestId } = render(<LoginScreen />);
    const emailInput = getByTestId('email-input');
    fireEvent.changeText(emailInput, '');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error alert when password is empty', async () => {
    const { getByTestId } = render(<LoginScreen />);
    const passwordInput = getByTestId('password-input');
    fireEvent.changeText(passwordInput, '');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@driver.com');
    fireEvent.changeText(getByTestId('password-input'), 'mypassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@driver.com', 'mypassword');
    });
  });

  it('shows loading state while logging in', async () => {
    let resolveLogin: () => void;
    mockLogin.mockReturnValueOnce(new Promise<void>((r) => { resolveLogin = r; }));

    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('email-input'), 'test@driver.com');
    fireEvent.changeText(getByTestId('password-input'), 'mypassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Signing In...')).toBeTruthy();
    });

    resolveLogin!();
  });

  it('disables login button while loading', async () => {
    mockLogin.mockReturnValueOnce(new Promise<void>(() => {}));
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@driver.com');
    fireEvent.changeText(getByTestId('password-input'), 'mypassword');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(getByTestId('login-button').props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  it('shows alert on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@driver.com');
    fireEvent.changeText(getByTestId('password-input'), 'mypassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('shows default error message when login fails without message', async () => {
    mockLogin.mockRejectedValueOnce({});
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@driver.com');
    fireEvent.changeText(getByTestId('password-input'), 'mypassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('displays version text', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText(/EasyRyde Driver v4.0.0/)).toBeTruthy();
  });

  it('displays forgot password link', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('displays register link', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText(/Don't have an account/)).toBeTruthy();
  });
});
