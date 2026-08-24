import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RestaurantMenuScreen from '../screens/RestaurantMenuScreen';
import { renderWithNavigation } from './test-utils';

const mockRestaurant = {
  id: 'rest-1', name: 'Pizza Palace', cuisine_type: 'Italian', rating: 4.5,
  estimated_delivery_minutes: 30, delivery_fee: 15,
  categories: [{ id: 'cat-1', name: 'Pizzas', items: [
    { id: 'item-1', name: 'Margherita', description: 'Classic tomato and mozzarella', price: 89, is_vegetarian: true, is_vegan: false, spice_level: 0 },
    { id: 'item-2', name: 'Pepperoni', description: 'Spicy pepperoni with cheese', price: 109, is_vegetarian: false, is_vegan: false, spice_level: 2 },
  ] }],
};

const mockNavigate = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const React = require('react');
  const { View } = require('react-native');
  return {
    ...actual,
    useBusinessTheme: jest.fn(() => ({
      brand: { primaryColor: '#0A7C4E' },
      gradient: ['#0B3B2A', '#0A7C4E'],
    })),
    BusinessThemeProvider: ({ children }: any) => <View>{children}</View>,
    GlowButton: ({ title, onPress, disabled }: any) => {
      const { TouchableOpacity, Text } = require('react-native');
      return <TouchableOpacity onPress={onPress} disabled={disabled}><Text>{title}</Text></TouchableOpacity>;
    },
    GradientText: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    Typography: ({ children }: any) => {
      const { Text } = require('react-native');
      return <Text>{children}</Text>;
    },
    GlassCard: ({ children }: any) => {
      const { View } = require('react-native');
      return <View>{children}</View>;
    },
    LoadingOverlay: () => {
      const { Text } = require('react-native');
      return <Text>Loading</Text>;
    },
    foodDelivery: {
      restaurant: jest.fn().mockResolvedValue({
        id: 'rest-1', name: 'Pizza Palace', cuisine_type: 'Italian', rating: 4.5,
        estimated_delivery_minutes: 30, delivery_fee: 15,
        categories: [{ id: 'cat-1', name: 'Pizzas', items: [
          { id: 'item-1', name: 'Margherita', description: 'Classic tomato and mozzarella', price: 89, is_vegetarian: true, is_vegan: false, spice_level: 0 },
          { id: 'item-2', name: 'Pepperoni', description: 'Spicy pepperoni with cheese', price: 109, is_vegetarian: false, is_vegan: false, spice_level: 2 },
        ] }],
      }),
    },
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
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

function renderMenu() {
  return renderWithNavigation(
    <RestaurantMenuScreen
      navigation={{ navigate: mockNavigate, goBack: jest.fn() } as any}
      route={{ params: { restaurantId: 'rest-1' } } as any}
    />
  );
}

const mockRestaurantData = {
  id: 'rest-1', name: 'Pizza Palace', cuisine_type: 'Italian', rating: 4.5,
  estimated_delivery_minutes: 30, delivery_fee: 15,
  categories: [{ id: 'cat-1', name: 'Pizzas', items: [
    { id: 'item-1', name: 'Margherita', description: 'Classic tomato and mozzarella', price: 89, is_vegetarian: true, is_vegan: false, spice_level: 0 },
    { id: 'item-2', name: 'Pepperoni', description: 'Spicy pepperoni with cheese', price: 109, is_vegetarian: false, is_vegan: false, spice_level: 2 },
  ] }],
};

describe('RestaurantMenuScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurant.mockResolvedValue(mockRestaurantData);
  });

  it('renders restaurant name', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
    });
  });

  it('displays cuisine type and delivery time', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Italian · 30min')).toBeTruthy();
    });
  });

  it('displays menu categories', async () => {
    const { getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getAllByText('Pizzas').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays menu items with names', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
      expect(getByText('Pepperoni')).toBeTruthy();
    });
  });

  it('displays item prices', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('R 89.00')).toBeTruthy();
      expect(getByText('R 109.00')).toBeTruthy();
    });
  });

  it('displays item descriptions', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Classic tomato and mozzarella')).toBeTruthy();
    });
  });

  it('shows vegetarian badge for veg items', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Veg')).toBeTruthy();
    });
  });

  it('shows spice level badge', async () => {
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Spice 2')).toBeTruthy();
    });
  });

  it('add to cart increases quantity', async () => {
    const { getByText, getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    const addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('cart total is displayed correctly', async () => {
    const { getByText, getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    const addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      expect(getAllByText('R 89.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('add same item twice increments quantity', async () => {
    const { getByText, getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    let addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      addBtns = getAllByText('+');
      expect(addBtns.length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('minus button decrements quantity', async () => {
    const { getByText, getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    let addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      addBtns = getAllByText('+');
      expect(addBtns.length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      const minusBtns = getAllByText('-');
      expect(minusBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.press(minusBtns[0]);
    });
    await waitFor(() => {
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('minus button on quantity 1 removes item', async () => {
    const { getByText, getAllByText, queryByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    const addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    const minusBtns = getAllByText('-');
    fireEvent.press(minusBtns[0]);
    await waitFor(() => {
      expect(queryByText(/View Cart/)).toBeNull();
    });
  });

  it('View Cart navigates to checkout', async () => {
    const { getByText, getAllByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('Margherita')).toBeTruthy();
    });
    const addBtns = getAllByText('+');
    fireEvent.press(addBtns[0]);
    await waitFor(() => {
      fireEvent.press(getByText(/View Cart/));
    });
    expect(mockNavigate).toHaveBeenCalledWith('FoodCheckout', expect.objectContaining({
      restaurantId: 'rest-1',
      restaurantName: 'Pizza Palace',
    }));
  });

  it('shows empty menu state', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurant.mockResolvedValue({
      ...mockRestaurant,
      categories: [],
    });
    const { getByText } = renderMenu();
    await waitFor(() => {
      expect(getByText('No menu available')).toBeTruthy();
    });
  });

  it('handles load error', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurant.mockRejectedValueOnce(new Error('Not found'));
    const { } = renderMenu();
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Not found');
    });
  });
});
