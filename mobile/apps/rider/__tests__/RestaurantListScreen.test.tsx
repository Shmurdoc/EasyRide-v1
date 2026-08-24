import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  const mockRestaurant = {
    id: 'rest-1', name: 'Pizza Palace', cuisine_type: 'Italian', rating: 4.5,
    estimated_delivery_minutes: 30, delivery_fee: 15,
    categories: [{ id: 'cat-1', name: 'Pizzas', items: [
      { id: 'item-1', name: 'Margherita', description: 'Classic tomato and mozzarella', price: 89, is_vegetarian: true, is_vegan: false, spice_level: 0 },
      { id: 'item-2', name: 'Pepperoni', description: 'Spicy pepperoni with cheese', price: 109, is_vegetarian: false, is_vegan: false, spice_level: 2 },
    ] }],
  };
  return {
    ...actual,
    foodDelivery: {
      restaurants: jest.fn().mockResolvedValue({ data: [mockRestaurant] }),
    },
    COLORS: actual.COLORS,
    GRADIENTS: actual.GRADIENTS,
    SPACING: actual.SPACING,
    RADIUS: actual.RADIUS,
    SHADOWS: actual.SHADOWS,
    FONTS: actual.FONTS,
    ErrorBoundary: ({ children }: any) => children,
    Shimmer: () => null,
    GradientText: ({ children }: any) => {
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

function renderList() {
  return renderWithNavigation(
    <RestaurantListScreen navigation={{ navigate: mockNavigate, goBack: jest.fn() } as any} />
  );
}

describe('RestaurantListScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Food Delivery header', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('Food Delivery')).toBeTruthy();
    });
  });

  it('renders restaurant list', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
    });
  });

  it('displays restaurant cuisine type', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('Italian')).toBeTruthy();
    });
  });

  it('displays restaurant rating', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('4.5 ★')).toBeTruthy();
    });
  });

  it('displays delivery time', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('30min')).toBeTruthy();
    });
  });

  it('displays delivery fee', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('R15')).toBeTruthy();
    });
  });

  it('shows search input', async () => {
    const { getByPlaceholderText } = renderList();
    await waitFor(() => {
      expect(getByPlaceholderText('Search restaurants...')).toBeTruthy();
    });
  });

  it('search input can be typed into', async () => {
    const { getByPlaceholderText } = renderList();
    await waitFor(() => {
      const input = getByPlaceholderText('Search restaurants...');
      fireEvent.changeText(input, 'Pizza');
    });
  });

  it('navigates to RestaurantMenu on restaurant press', async () => {
    const { getByText } = renderList();
    await waitFor(() => {
      fireEvent.press(getByText('Pizza Palace'));
      expect(mockNavigate).toHaveBeenCalledWith('RestaurantMenu', { restaurantId: 'rest-1' });
    });
  });

  it('shows empty state when no restaurants', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurants.mockResolvedValueOnce({ data: [] });
    const { getByText } = renderList();
    await waitFor(() => {
      expect(getByText('No restaurants found')).toBeTruthy();
    });
  });

  it('shows loading state initially', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurants.mockImplementation(() => new Promise(() => {}));
    const { queryByText } = renderList();
    await waitFor(() => {
      expect(queryByText('Pizza Palace')).toBeNull();
    });
  });

  it('handles API error gracefully', async () => {
    const { foodDelivery } = require('@easyryde/shared');
    foodDelivery.restaurants.mockRejectedValueOnce(new Error('Server error'));
    const { getByText } = renderList();
    await waitFor(() => {
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Server error');
    });
  });
});
