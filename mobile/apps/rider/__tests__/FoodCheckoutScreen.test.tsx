import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import FoodCheckoutScreen from '../screens/FoodCheckoutScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    foodDelivery: {
      createOrder: jest.fn().mockResolvedValue({ id: 'order-123' }),
    },
    wallet: {
      get: jest.fn().mockResolvedValue({ balance: 500 }),
    },
    places: {
      search: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Test Place', lat: -23.9, lng: 29.4 }]),
    },
    PAYMENT_METHODS: [
      { id: 'cash', name: 'Cash' },
      { id: 'card', name: 'Credit Card' },
      { id: 'wallet', name: 'Wallet' },
    ],
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    GlowButton: ({ title, onPress, disabled }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress} disabled={disabled} testID={title}><Text>{title}</Text></TouchableOpacity>;
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
    Input: ({ value, onChangeText, placeholder, ...props }: any) => {
      const { TextInput } = require('react-native');
      return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} {...props} />;
    },
    Badge: ({ label }: any) => {
      const { Text } = require('react-native');
      return <Text>{label}</Text>;
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

const testCart = [
  { menuItem: { id: 'item-1', name: 'Margherita', price: 89 }, quantity: 2, specialInstructions: '' },
  { menuItem: { id: 'item-2', name: 'Pepperoni', price: 109 }, quantity: 1, specialInstructions: 'Extra cheese' },
];

function renderCheckout(cart = testCart) {
  return renderWithNavigation(
    <FoodCheckoutScreen
      navigation={{ navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() } as any}
      route={{
        params: {
          restaurantId: 'rest-1',
          restaurantName: 'Pizza Palace',
          cart,
          subtotal: 287,
          deliveryFee: 15,
        },
      } as any}
    />
  );
}

describe('FoodCheckoutScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Checkout header', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Checkout')).toBeTruthy();
    });
  });

  it('displays restaurant name', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
    });
  });

  it('shows order summary with items', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Order Summary')).toBeTruthy();
      expect(getByText('2x Margherita')).toBeTruthy();
      expect(getByText('1x Pepperoni')).toBeTruthy();
    });
  });

  it('shows delivery address input', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Delivery Address')).toBeTruthy();
    });
  });

  it('shows payment method options', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Payment Method')).toBeTruthy();
      expect(getByText('Cash')).toBeTruthy();
      expect(getByText('Credit Card')).toBeTruthy();
      expect(getByText('Wallet')).toBeTruthy();
    });
  });

  it('shows tip section with options', async () => {
    const { getAllByText, getByText } = renderCheckout();
    await waitFor(() => {
      expect(getAllByText('Tip').length).toBeGreaterThanOrEqual(1);
      expect(getByText('No Tip')).toBeTruthy();
      expect(getByText('R10')).toBeTruthy();
      expect(getByText('R20')).toBeTruthy();
      expect(getByText('R30')).toBeTruthy();
    });
  });

  it('displays price breakdown', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Subtotal')).toBeTruthy();
      expect(getByText('Delivery')).toBeTruthy();
      expect(getByText('Service')).toBeTruthy();
    });
  });

  it('validates missing delivery address', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      fireEvent.press(getByText('Place Order'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Missing Address', 'Please enter a delivery address');
    });
  });

  it('places order successfully with address', async () => {
    const { getByText, getByPlaceholderText } = renderCheckout();
    await waitFor(() => {
      const addressInput = getByPlaceholderText('Enter your delivery address');
      fireEvent.changeText(addressInput, '45 Selati Road');
      fireEvent.press(getByText('Place Order'));
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('FoodOrderTracking', { orderId: 'order-123' });
    });
  });

  it('handles order placement failure', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.createOrder.mockRejectedValueOnce(new Error('Restaurant closed'));
    const { getByText, getByPlaceholderText } = renderCheckout();
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Enter your delivery address'), '45 Selati Road');
      fireEvent.press(getByText('Place Order'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Restaurant closed');
    });
  });

  it('selects a tip amount', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      fireEvent.press(getByText('R20'));
    });
  });

  it('can change payment method', async () => {
    const { getByText } = renderCheckout();
    await waitFor(() => {
      fireEvent.press(getByText('Credit Card'));
    });
  });

  it('shows insufficient wallet balance alert', async () => {
    const { wallet } = require('@easyryde/shared');
    wallet.get.mockResolvedValueOnce({ balance: 10 });
    const { getByText, getByPlaceholderText } = renderCheckout();
    await waitFor(() => {
      expect(getByText('Payment Method')).toBeTruthy();
    });
    await waitFor(() => {
      fireEvent.press(getByText('Wallet'));
    });
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Enter your delivery address'), '45 Selati Road');
      fireEvent.press(getByText('Place Order'));
    });
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Insufficient Balance', expect.any(String));
    });
  });

  it('shows delivery notes input', async () => {
    const { getByPlaceholderText } = renderCheckout();
    await waitFor(() => {
      expect(getByPlaceholderText('Delivery notes (optional)')).toBeTruthy();
    });
  });
});
