import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import WalletScreen from '../screens/WalletScreen';
import { renderWithNavigation } from './test-utils';
import { mockTransactions } from './mocks';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert = { alert: jest.fn(), prompt: jest.fn() };
  RN.Modal = ({ visible, children }: any) => visible ? children : null;
  return RN;
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const { mockTransactions } = require('./mocks');
  return {
    ...actual,
    useAuth: jest.fn().mockReturnValue({ user: { id: 'u1' }, token: 'test-token' }),
    wallet: {
      get: jest.fn().mockResolvedValue({ balance: 250 }),
      transactions: jest.fn().mockResolvedValue({ data: mockTransactions }),
      deposit: jest.fn().mockResolvedValue({ success: true }),
    },
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    SHADOWS: actual.SHADOWS,
    formatZAR: actual.formatZAR,
    ReconnectionBanner: () => null,
    GlowButton: ({ title, onPress, disabled }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress} disabled={disabled}><Text>{title}</Text></TouchableOpacity>;
    },
    GlassCard: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
    GradientText: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Typography: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Avatar: () => null,
    LoadingOverlay: () => {
      const { Text } = require('react-native');
      return <Text>Loading</Text>;
    },
    DriverNav: {},
    RiderNav: {},
  };
});

describe('WalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { wallet, useAuth } = require('@easyryde/shared');
    useAuth.mockReturnValue({ user: { id: 'u1' }, token: 'test-token' });
    wallet.get.mockResolvedValue({ balance: 250 });
    wallet.transactions.mockResolvedValue({ data: mockTransactions });
    wallet.deposit.mockResolvedValue({ success: true });
  });

  it('renders Wallet header', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('Wallet')).toBeTruthy();
    });
  });

  it('displays wallet balance', async () => {
    const { getByText, getAllByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('Total Balance')).toBeTruthy();
      expect(getAllByText('R 250.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Add Funds button', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('Add Funds')).toBeTruthy();
    });
  });

  it('shows recent transactions section', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('Recent Transactions')).toBeTruthy();
      expect(getByText('Wallet top-up')).toBeTruthy();
      expect(getByText('Ride to Mall')).toBeTruthy();
    });
  });

  it('shows empty state when no transactions', async () => {
    const { wallet } = require('@easyryde/shared');
    wallet.transactions.mockResolvedValueOnce({ data: [] });
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('No transactions yet')).toBeTruthy();
    });
  });

  it('opens deposit modal on Add Funds press', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Add Funds'));
      expect(getByText('Enter amount to deposit to your wallet')).toBeTruthy();
    });
  });

  it('shows quick amount buttons in deposit modal', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Add Funds'));
      expect(getByText('R50')).toBeTruthy();
      expect(getByText('R100')).toBeTruthy();
      expect(getByText('R200')).toBeTruthy();
      expect(getByText('R500')).toBeTruthy();
    });
  });

  it('processes valid top up', async () => {
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Add Funds'));
    });
    await waitFor(() => {
      fireEvent.press(getByText('R100'));
    });
    await waitFor(() => {
      fireEvent.press(getByText(/Deposit R100/));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Deposit Initiated', expect.any(String));
    });
  });

  it('handles top up failure', async () => {
    const { wallet } = require('@easyryde/shared');
    wallet.deposit.mockRejectedValueOnce(new Error('Card declined'));
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Add Funds'));
    });
    await waitFor(() => {
      fireEvent.press(getByText('R100'));
    });
    await waitFor(() => {
      fireEvent.press(getByText(/Deposit R100/));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Deposit Failed', 'Card declined');
    });
  });

  it('shows loading state initially', async () => {
    const { wallet } = require('@easyryde/shared');
    wallet.get.mockImplementation(() => new Promise(() => {}));
    const { queryByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(queryByText('Total Balance')).toBeNull();
    });
  });

  it('shows error state when fetch fails', async () => {
    const { wallet } = require('@easyryde/shared');
    wallet.get.mockRejectedValueOnce(new Error('Server down'));
    const { getByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      expect(getByText('Server down')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('closes deposit modal on close', async () => {
    const { getByText, queryByText } = renderWithNavigation(<WalletScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Add Funds'));
      expect(getByText('Enter amount to deposit to your wallet')).toBeTruthy();
    });
    fireEvent.press(getByText('close'));
    await waitFor(() => {
      expect(queryByText('Enter amount to deposit to your wallet')).toBeNull();
    });
  });
});
