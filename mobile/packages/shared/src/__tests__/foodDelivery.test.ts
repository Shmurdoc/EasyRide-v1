const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { foodDelivery } from '../api/foodDelivery';

describe('foodDelivery API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restaurants', () => {
    it('calls GET /food/restaurants', async () => {
      mockGet.mockResolvedValue({ data: [{ id: 'r1', name: 'Pizza Place' }], total: 1 });
      const result = await foodDelivery.restaurants({ page: '1' });
      expect(mockGet).toHaveBeenCalledWith('/food/restaurants', { page: '1' });
      expect(result.data[0].name).toBe('Pizza Place');
    });

    it('calls without params', async () => {
      mockGet.mockResolvedValue({ data: [], total: 0 });
      await foodDelivery.restaurants();
      expect(mockGet).toHaveBeenCalledWith('/food/restaurants', undefined);
    });
  });

  describe('restaurant detail', () => {
    it('calls GET /food/restaurants/:id', async () => {
      mockGet.mockResolvedValue({ id: 'r1', name: 'Pizza Place', categories: [] });
      const result = await foodDelivery.restaurant('r1');
      expect(mockGet).toHaveBeenCalledWith('/food/restaurants/r1');
      expect(result.id).toBe('r1');
    });
  });

  describe('menu', () => {
    it('calls GET /food/restaurants/:id/menu', async () => {
      mockGet.mockResolvedValue([{ id: 'c1', name: 'Pizzas', items: [] }]);
      const result = await foodDelivery.menu('r1');
      expect(mockGet).toHaveBeenCalledWith('/food/restaurants/r1/menu');
      expect(result[0].name).toBe('Pizzas');
    });
  });

  describe('createOrder', () => {
    it('calls POST with order data', async () => {
      const orderData = {
        items: [{ menu_item_id: 'm1', quantity: 2 }],
        delivery_address: '123 Main St',
        payment_method: 'cash',
      };
      mockPost.mockResolvedValue({ id: 'o1', status: 'pending' });
      const result = await foodDelivery.createOrder('r1', orderData);
      expect(mockPost).toHaveBeenCalledWith('/food/restaurants/r1/order', orderData);
      expect(result.id).toBe('o1');
    });

    it('passes optional tip and notes', async () => {
      const orderData = {
        items: [{ menu_item_id: 'm1', quantity: 1 }],
        delivery_address: '456 Oak Ave',
        payment_method: 'wallet',
        tip_amount: 15,
        delivery_notes: 'Ring bell',
      };
      mockPost.mockResolvedValue({ id: 'o2' });
      await foodDelivery.createOrder('r1', orderData);
      expect(mockPost).toHaveBeenCalledWith('/food/restaurants/r1/order', orderData);
    });
  });

  describe('myOrders / getOrder', () => {
    it('calls GET /food/orders', async () => {
      mockGet.mockResolvedValue([{ id: 'o1' }]);
      const result = await foodDelivery.myOrders();
      expect(mockGet).toHaveBeenCalledWith('/food/orders', undefined);
      expect(result).toHaveLength(1);
    });

    it('calls GET /food/orders/:id', async () => {
      mockGet.mockResolvedValue({ id: 'o1', status: 'confirmed' });
      const result = await foodDelivery.getOrder('o1');
      expect(mockGet).toHaveBeenCalledWith('/food/orders/o1');
      expect(result.status).toBe('confirmed');
    });
  });

  describe('cancelOrder', () => {
    it('calls POST with reason', async () => {
      mockPost.mockResolvedValue({ id: 'o1', status: 'cancelled' });
      const result = await foodDelivery.cancelOrder('o1', 'Changed mind');
      expect(mockPost).toHaveBeenCalledWith('/food/orders/o1/cancel', { reason: 'Changed mind' });
      expect(result.status).toBe('cancelled');
    });

    it('calls POST without reason', async () => {
      mockPost.mockResolvedValue({ id: 'o1' });
      await foodDelivery.cancelOrder('o1');
      expect(mockPost).toHaveBeenCalledWith('/food/orders/o1/cancel', { reason: undefined });
    });
  });

  describe('rateOrder', () => {
    it('calls POST with rating', async () => {
      mockPost.mockResolvedValue({ id: 'o1' });
      await foodDelivery.rateOrder('o1', 5, 'Great!');
      expect(mockPost).toHaveBeenCalledWith('/food/orders/o1/rate', { rating: 5, comment: 'Great!' });
    });

    it('calls POST without comment', async () => {
      mockPost.mockResolvedValue({ id: 'o1' });
      await foodDelivery.rateOrder('o1', 4);
      expect(mockPost).toHaveBeenCalledWith('/food/orders/o1/rate', { rating: 4, comment: undefined });
    });
  });

  describe('driver endpoints', () => {
    it('driverOrders calls correct endpoint', async () => {
      mockGet.mockResolvedValue([]);
      await foodDelivery.driverOrders({ status: 'pending' });
      expect(mockGet).toHaveBeenCalledWith('/driver/food/orders', { status: 'pending' });
    });

    it('availableOrders calls correct endpoint', async () => {
      mockGet.mockResolvedValue([]);
      await foodDelivery.availableOrders();
      expect(mockGet).toHaveBeenCalledWith('/driver/food/orders/available', undefined);
    });

    it('acceptOrder calls POST', async () => {
      mockPost.mockResolvedValue({ id: 'o1' });
      await foodDelivery.acceptOrder('o1');
      expect(mockPost).toHaveBeenCalledWith('/driver/food/orders/o1/accept');
    });

    it('updateOrderStatus calls POST with status', async () => {
      mockPost.mockResolvedValue({ id: 'o1' });
      await foodDelivery.updateOrderStatus('o1', 'picked_up');
      expect(mockPost).toHaveBeenCalledWith('/driver/food/orders/o1/status', { status: 'picked_up' });
    });
  });

  describe('admin endpoints', () => {
    it('adminRestaurants calls correct endpoint', async () => {
      mockGet.mockResolvedValue([]);
      await foodDelivery.adminRestaurants();
      expect(mockGet).toHaveBeenCalledWith('/admin/food/restaurants', undefined);
    });

    it('adminCreateRestaurant calls POST', async () => {
      const data = { name: 'New Place', address: '123 St', delivery_fee: 15, minimum_order: 50, is_active: true };
      mockPost.mockResolvedValue({ id: 'r1', ...data });
      const result = await foodDelivery.adminCreateRestaurant(data);
      expect(mockPost).toHaveBeenCalledWith('/admin/food/restaurants', data);
      expect(result.name).toBe('New Place');
    });

    it('adminUpdateRestaurant calls PUT', async () => {
      mockPost.mockClear();
      const { api } = require('../api/client');
      api.put = jest.fn().mockResolvedValue({ id: 'r1' });
      await foodDelivery.adminUpdateRestaurant('r1', { name: 'Updated' });
      expect(api.put).toHaveBeenCalledWith('/admin/food/restaurants/r1', { name: 'Updated' });
    });

    it('adminOrders calls correct endpoint', async () => {
      mockGet.mockResolvedValue([]);
      await foodDelivery.adminOrders();
      expect(mockGet).toHaveBeenCalledWith('/admin/food/orders', undefined);
    });
  });
});
