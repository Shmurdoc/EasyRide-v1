import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FoodDeliveryScreen from '../screens/FoodDeliveryScreen';
import { foodDelivery } from '@easyryde/shared';

jest.spyOn(Alert, 'alert');

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() } as any;

describe('FoodDeliveryScreen', () => {
  const mockAvailableOrders = foodDelivery.availableOrders as jest.Mock;
  const mockDriverOrders = foodDelivery.driverOrders as jest.Mock;
  const mockAcceptOrder = foodDelivery.acceptOrder as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAvailableOrders.mockResolvedValue([
      {
        id: 'order-1',
        status: 'pending',
        driver_id: null,
        restaurant: { name: 'Pizza Palace' },
        items: [
          { id: 'i1', name: 'Margherita Pizza', quantity: 1 },
          { id: 'i2', name: 'Coke', quantity: 2 },
        ],
        total_amount: 120,
        delivery_address: '789 Pine Rd',
      },
      {
        id: 'order-2',
        status: 'pending',
        driver_id: null,
        restaurant: { name: 'Burger King' },
        items: [
          { id: 'i3', name: 'Whopper', quantity: 1 },
        ],
        total_amount: 85,
        delivery_address: '101 Fast Lane',
      },
    ]);
    mockDriverOrders.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders food delivery header', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    expect(getByText('Food Delivery')).toBeTruthy();
  });

  it('shows available tab by default', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    expect(getByText('Available')).toBeTruthy();
  });

  it('displays filter tabs', () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    expect(getByText('Available')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('Delivered')).toBeTruthy();
  });

  it('loads available orders on mount', async () => {
    render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(mockAvailableOrders).toHaveBeenCalled();
    });
  });

  it('displays order cards with restaurant name', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
      expect(getByText('Burger King')).toBeTruthy();
    });
  });

  it('displays order items', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('1x Margherita Pizza')).toBeTruthy();
      expect(getByText('2x Coke')).toBeTruthy();
      expect(getByText('1x Whopper')).toBeTruthy();
    });
  });

  it('displays order prices', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('R 120.00')).toBeTruthy();
      expect(getByText('R 85.00')).toBeTruthy();
    });
  });

  it('displays delivery addresses', async () => {
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('789 Pine Rd')).toBeTruthy();
      expect(getByText('101 Fast Lane')).toBeTruthy();
    });
  });

  it('shows accept button for available orders', async () => {
    const { getAllByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      const acceptButtons = getAllByText('Accept Order');
      expect(acceptButtons.length).toBe(2);
    });
  });

  it('accepts an order', async () => {
    mockAcceptOrder.mockResolvedValueOnce(undefined);
    const { getAllByText, getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getAllByText('Accept Order')[0]);
    });

    await waitFor(() => {
      expect(mockAcceptOrder).toHaveBeenCalledWith('order-1');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FoodOrderDetail', { orderId: 'order-1' });
    });
  });

  it('shows error when accept order fails', async () => {
    mockAcceptOrder.mockRejectedValueOnce(new Error('Order taken'));
    const { getAllByText, getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Pizza Palace')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getAllByText('Accept Order')[0]);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Order taken');
    });
  });

  it('switches to active tab', async () => {
    mockDriverOrders.mockResolvedValueOnce([
      {
        id: 'order-3',
        status: 'preparing',
        driver_id: 'driver-1',
        restaurant: { name: 'Subway' },
        items: [{ id: 'i4', name: 'BLT Sub', quantity: 1 }],
        total_amount: 65,
        delivery_address: '222 Sandwich Ave',
      },
    ]);

    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText('Active'));
    });

    await waitFor(() => {
      expect(mockDriverOrders).toHaveBeenCalled();
    });
  });

  it('switches to delivered tab', async () => {
    mockDriverOrders.mockResolvedValueOnce([
      {
        id: 'order-4',
        status: 'delivered',
        driver_id: 'driver-1',
        restaurant: { name: 'KFC' },
        items: [{ id: 'i5', name: 'Zinger Burger', quantity: 1 }],
        total_amount: 75,
        delivery_address: '333 Chicken Rd',
      },
    ]);

    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      fireEvent.press(getByText('Delivered'));
    });

    await waitFor(() => {
      expect(mockDriverOrders).toHaveBeenCalled();
    });
  });

  it('shows error state when orders fail to load', async () => {
    mockAvailableOrders.mockRejectedValueOnce(new Error('Server error'));
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Server error')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('retries loading on retry press', async () => {
    mockAvailableOrders.mockRejectedValueOnce(new Error('Server error'));
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Retry'));
    });

    await waitFor(() => {
      expect(mockAvailableOrders).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when no available orders', async () => {
    mockAvailableOrders.mockResolvedValueOnce([]);
    const { getByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('No orders')).toBeTruthy();
    });
  });

  it('displays pending status badge', async () => {
    const { getAllByText } = render(<FoodDeliveryScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getAllByText('pending').length).toBeGreaterThanOrEqual(1);
    });
  });
});
