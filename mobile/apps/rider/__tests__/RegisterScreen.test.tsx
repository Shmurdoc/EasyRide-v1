import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../screens/RegisterScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    useAuth: jest.fn().mockReturnValue({
      register: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
    }),
    Input: ({ label, value, onChangeText, placeholder, ...props }: any) => {
      const { Text, TextInput, View } = require('react-native');
      return (
        <View>
          {label ? <Text>{label}</Text> : null}
          <TextInput value={value} onChangeText={onChangeText} placeholder={label || placeholder} {...props} />
        </View>
      );
    },
    Typography: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    GradientText: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    LoadingOverlay: () => {
      const { Text } = require('react-native');
      return <Text>Loading</Text>;
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

function renderRegister() {
  return renderWithNavigation(
    <RegisterScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack } as any} />
  );
}

function pressSubmitButton(getAllByText: any) {
  const allCreateAccount = getAllByText('Create Account');
  fireEvent.press(allCreateAccount[allCreateAccount.length - 1]);
}

describe('RegisterScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Create Account header', async () => {
    const { getAllByText } = renderRegister();
    await waitFor(() => {
      const matches = getAllByText('Create Account');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders tagline', async () => {
    const { getByText } = renderRegister();
    await waitFor(() => {
      expect(getByText('Join EasyRyde and start riding today')).toBeTruthy();
    });
  });

  it('shows all form fields', async () => {
    const { getByText } = renderRegister();
    await waitFor(() => {
      expect(getByText('Full Name')).toBeTruthy();
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Phone Number')).toBeTruthy();
    });
  });

  it('shows terms checkbox', async () => {
    const { getByText } = renderRegister();
    await waitFor(() => {
      expect(getByText(/I agree to the/)).toBeTruthy();
    });
  });

  it('shows Sign In link', async () => {
    const { getByText } = renderRegister();
    await waitFor(() => {
      expect(getByText('Sign In')).toBeTruthy();
    });
  });

  it('Sign In link goes back to Login', async () => {
    const { getByText } = renderRegister();
    await waitFor(() => {
      fireEvent.press(getByText('Sign In'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('validates empty name', async () => {
    const { getByText, getAllByText } = renderRegister();
    await waitFor(() => {
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Full name is required')).toBeTruthy();
    });
  });

  it('validates empty email', async () => {
    const { getByText, getAllByText } = renderRegister();
    await waitFor(() => {
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });
  });

  it('validates empty phone', async () => {
    const { getByText, getAllByText } = renderRegister();
    await waitFor(() => {
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Phone number is required')).toBeTruthy();
    });
  });

  it('validates short phone number', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
      fireEvent.changeText(getByPlaceholderText('Phone Number'), '123');
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Enter a valid phone number (min 10 digits)')).toBeTruthy();
    });
  });

  it('validates empty password', async () => {
    const { getByText, getAllByText } = renderRegister();
    await waitFor(() => {
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('validates short password', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Password'), 'short');
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('validates empty confirm password', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Password'), 'ValidPass1');
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Please confirm your password')).toBeTruthy();
    });
  });

  it('validates password mismatch', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Password'), 'ValidPass1');
      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'DifferentPass1');
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('validates terms not agreed', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
      fireEvent.changeText(getByPlaceholderText('Phone Number'), '0712345678');
      fireEvent.changeText(getByPlaceholderText('Password'), 'ValidPass1');
      fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'ValidPass1');
      pressSubmitButton(getAllByText);
    });
    await waitFor(() => {
      expect(getByText('You must agree to the terms')).toBeTruthy();
    });
  });

  it('successful registration calls register', async () => {
    const { useAuth } = require('@easyryde/shared');
    const mockRegister = jest.fn().mockResolvedValue({ user: { id: 'u1' } });
    useAuth.mockReturnValue({ register: mockRegister });
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Phone Number'), '0712345678');
    fireEvent.changeText(getByPlaceholderText('Password'), 'ValidPass1');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'ValidPass1');
    fireEvent.press(getByText(/I agree to the/));
    pressSubmitButton(getAllByText);
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@test.com',
        phone_number: '0712345678',
        password: 'ValidPass1',
        password_confirmation: 'ValidPass1',
      });
    });
  });

  it('registration failure shows error alert', async () => {
    const { useAuth } = require('@easyryde/shared');
    const mockRegister = jest.fn().mockRejectedValue(new Error('Email already exists'));
    useAuth.mockReturnValue({ register: mockRegister });
    const { getByText, getAllByText, getByPlaceholderText } = renderRegister();
    await waitFor(() => {
      expect(getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.changeText(getByPlaceholderText('Full Name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Phone Number'), '0712345678');
    fireEvent.changeText(getByPlaceholderText('Password'), 'ValidPass1');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'ValidPass1');
    fireEvent.press(getByText(/I agree to the/));
    pressSubmitButton(getAllByText);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Registration Failed', 'Email already exists');
    });
  });
});
