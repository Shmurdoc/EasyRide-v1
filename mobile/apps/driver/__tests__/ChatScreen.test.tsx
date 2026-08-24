import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import ChatScreen from '../screens/ChatScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;
const mockRoute = { params: { rideId: 'ride-123', userId: 'd1', userName: 'John Rider' } } as any;

describe('ChatScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders chat header', async () => {
    const { getByText } = renderWithNavigation(
      <ChatScreen {...({ navigation: mockNavigation, route: mockRoute } as any)} />
    );
    await waitFor(() => {
      expect(getByText('Chat')).toBeTruthy();
    });
  });

  it('renders message input', async () => {
    const { getByPlaceholderText } = renderWithNavigation(
      <ChatScreen {...({ navigation: mockNavigation, route: mockRoute } as any)} />
    );
    await waitFor(() => {
      expect(getByPlaceholderText(/Type a message/)).toBeTruthy();
    });
  });
});
