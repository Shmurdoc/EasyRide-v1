import React from 'react';
import { waitFor } from '@testing-library/react-native';
import FoodOrderTrackingScreen from '../screens/FoodOrderTrackingScreen';
import { renderWithNavigation } from './test-utils';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), replace: jest.fn() } as any;
const mockRoute = { params: { orderId: 'order-123' } } as any;

jest.mock('@easyryde/shared', () => {
  const actual = jest.requireActual('@easyryde/shared');
  return {
    ...actual,
    foodDelivery: {
      getOrder: jest.fn().mockResolvedValue({
        id: 'order-123',
        status: 'preparing',
        restaurant: { name: 'Pizza Palace' },
        delivery_address: '45 Selati Road, Phalaborwa',
        total_amount: 109,
        payment_method: 'cash',
      }),
    },
  };
});

describe('FoodOrderTrackingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders tracking screen', async () => {
    const { getAllByText } = renderWithNavigation(
      <FoodOrderTrackingScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getAllByText('Order Tracking').length).toBeGreaterThanOrEqual(1);
    });
  });
});
