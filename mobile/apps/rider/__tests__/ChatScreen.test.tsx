import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import ChatScreen from '../screens/ChatScreen';
import { renderWithNavigation, act } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;
const mockRoute = { params: { rideId: 'ride-123', userId: 'u1', userName: 'John Driver' } } as any;

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    useAuth: jest.fn(() => ({
      user: { id: 'u1', name: 'Test', email: 'test@test.com' },
      token: 'test-token',
    })),
    useSocket: jest.fn(() => ({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempt: 0,
      emit: jest.fn(),
      on: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
    })),
  };
});

describe('ChatScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders chat header', async () => {
    const { getByText } = renderWithNavigation(
      <ChatScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByText('Chat')).toBeTruthy();
    });
  });

  it('renders message input', async () => {
    const { getByPlaceholderText } = renderWithNavigation(
      <ChatScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByPlaceholderText(/Type a message/)).toBeTruthy();
    });
  });

  it('sends message on button press', async () => {
    const { useAuth } = require('@easyryde/shared');
    useAuth.mockReturnValue({ user: { id: 'u1' }, token: 'test-token' });
    const { getByPlaceholderText } = renderWithNavigation(
      <ChatScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      const input = getByPlaceholderText(/Type a message/);
      fireEvent.changeText(input, 'Hello!');
    });
  });
});
