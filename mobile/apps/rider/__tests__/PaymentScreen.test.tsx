import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentScreen from '../screens/PaymentScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const mockRide = {
    id: 'ride-123', status: 'in_progress', category: 'economy',
    pickup_address: '45 Selati Road, Phalaborwa', dropoff_address: 'Mall of the North',
    pickup_latitude: -23.94, pickup_longitude: 31.08, dropoff_latitude: -23.88, dropoff_longitude: 31.08,
    base_fare: 35, distance_km: 8.2, duration_minutes: 15, per_km_fare: 12, total_fare: 145,
    payment_method: 'cash', discount_amount: 0, route_polyline: null, driver_id: 'd1', driver_eta: 3,
    driver: { id: 'd1', name: 'John Driver', phone_number: '+27123456789', average_rating: 4.9, total_trips: 234, vehicle: { make: 'Toyota', model: 'Corolla', color: 'White' } },
    completed_at: null, cancelled_by: null, cancellation_reason: null,
  };
  return {
    ...actual,
    rides: {
      get: jest.fn().mockResolvedValue(mockRide),
    },
    payments: {
      processRide: jest.fn().mockResolvedValue({ success: true }),
    },
    promoCodes: {
      validate: jest.fn().mockResolvedValue({ valid: true, discount: 15 }),
    },
    wallet: {
      get: jest.fn().mockResolvedValue({ balance: 250 }),
    },
    ReconnectionBanner: ({ children }: any) => children,
    GlowButton: ({ title, onPress, ...props }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress} testID={title}><Text>{title}</Text></TouchableOpacity>;
    },
    GlassCard: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
    GradientText: ({ children, ...props }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Typography: ({ children, ...props }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
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

function renderPayment(rideId = 'ride-123') {
  return renderWithNavigation(
    <PaymentScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() } as any}
      route={{ params: { rideId } } as any}
    />
  );
}

describe('PaymentScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Payment header', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('Payment')).toBeTruthy();
    }, { timeout: 10000 });
  });

  it('displays fare summary with total', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('FARE SUMMARY')).toBeTruthy();
      expect(getByText('Total')).toBeTruthy();
      expect(getByText('R 171.57')).toBeTruthy();
    });
  });

  it('displays fare line items', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('Base fare')).toBeTruthy();
      expect(getByText('Distance')).toBeTruthy();
      expect(getByText('Time')).toBeTruthy();
      expect(getByText('Service fee')).toBeTruthy();
    });
  });

  it('shows all payment methods', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('PAYMENT METHOD')).toBeTruthy();
      expect(getByText('Cash')).toBeTruthy();
      expect(getByText('Wallet')).toBeTruthy();
      expect(getByText('PayFast')).toBeTruthy();
      expect(getByText('Ozow EFT')).toBeTruthy();
      expect(getByText('Card (Stripe)')).toBeTruthy();
    });
  });

  it('selects a payment method', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      fireEvent.press(getByText('Cash'));
      expect(getByText('Cash')).toBeTruthy();
    });
  });

  it('shows wallet balance when wallet selected', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      fireEvent.press(getByText('Wallet'));
      expect(getByText('WALLET BALANCE')).toBeTruthy();
      expect(getByText('R 250.00')).toBeTruthy();
      expect(getByText('Sufficient')).toBeTruthy();
    });
  });

  it('shows promo code section', async () => {
    const { getByText, getByPlaceholderText } = renderPayment();
    await waitFor(() => {
      expect(getByText('PROMO CODE')).toBeTruthy();
      expect(getByPlaceholderText('Enter promo code')).toBeTruthy();
      expect(getByText('Apply')).toBeTruthy();
    });
  });

  it('applies a valid promo code', async () => {
    const { promoCodes } = require('@easyryde/shared');
    const { getByText, getByPlaceholderText } = renderPayment();
    await waitFor(() => {
      expect(getByText('R 171.57')).toBeTruthy();
    });
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Enter promo code'), 'SAVE10');
      fireEvent.press(getByText('Apply'));
    });
    await waitFor(() => {
      const [code, amount] = promoCodes.validate.mock.calls[0];
      expect(code).toBe('SAVE10');
      expect(amount).toBeCloseTo(171.57, 2);
      expect(getByText('-R15.00 discount applied')).toBeTruthy();
    });
  });

  it('processes payment successfully for cash', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      fireEvent.press(getByText('Pay R 171.57'));
    });
    await waitFor(() => {
      expect(getByText('Payment Successful')).toBeTruthy();
      expect(getByText('Thank you for riding with EasyRyde')).toBeTruthy();
    });
  });

  it('processes payment successfully for card', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('Payment')).toBeTruthy();
    });
    await waitFor(() => {
      fireEvent.press(getByText('Card (Stripe)'));
    });
    await waitFor(() => {
      fireEvent.press(getByText(/Pay R/));
    });
    await waitFor(() => {
      expect(getByText('Payment Successful')).toBeTruthy();
    });
  });

  it('handles payment failure', async () => {
    const { payments } = require('@easyryde/shared');
    payments.processRide.mockRejectedValueOnce(new Error('Payment declined'));
    const { getByText } = renderPayment();
    await waitFor(() => {
      fireEvent.press(getByText(/Pay R/));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Payment Failed', 'Payment declined');
    });
  });

  it('back button calls navigation.goBack', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('Payment')).toBeTruthy();
      fireEvent.press(getByText('arrow-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('handles ride load failure gracefully', async () => {
    const { rides } = require('@easyryde/shared');
    rides.get.mockRejectedValueOnce(new Error('Not found'));
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('FARE SUMMARY')).toBeTruthy();
      expect(getByText('R 0.00')).toBeTruthy();
    });
  });

  it('shows pay button with computed total', async () => {
    const { getByText } = renderPayment();
    await waitFor(() => {
      expect(getByText('Pay R 171.57')).toBeTruthy();
    });
  });
});
