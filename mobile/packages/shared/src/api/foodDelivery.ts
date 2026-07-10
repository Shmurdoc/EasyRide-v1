import { api } from './client';
import type {
  PaginatedResponse, Restaurant, RestaurantCategory, MenuItem,
  FoodOrder, FoodOrderItem, CartItem, FoodOrderStatus,
} from '../types';

export const foodDelivery = {
  restaurants: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Restaurant>>('/food/restaurants', params),

  restaurant: (id: string) =>
    api.get<Restaurant & { categories: RestaurantCategory[] }>(`/food/restaurants/${id}`),

  menu: (restaurantId: string) =>
    api.get<RestaurantCategory[]>(`/food/restaurants/${restaurantId}/menu`),

  createOrder: (restaurantId: string, data: {
    items: { menu_item_id: string; quantity: number; special_instructions?: string }[];
    delivery_address: string;
    delivery_latitude?: number;
    delivery_longitude?: number;
    delivery_notes?: string;
    payment_method: string;
    tip_amount?: number;
  }) => api.post<FoodOrder>(`/food/restaurants/${restaurantId}/order`, data),

  myOrders: (params?: Record<string, string>) =>
    api.get<FoodOrder[]>('/food/orders', params),

  getOrder: (id: string) =>
    api.get<FoodOrder>(`/food/orders/${id}`),

  cancelOrder: (id: string, reason?: string) =>
    api.post<FoodOrder>(`/food/orders/${id}/cancel`, { reason }),

  rateOrder: (id: string, rating: number, comment?: string) =>
    api.post<FoodOrder>(`/food/orders/${id}/rate`, { rating, comment }),

  driverOrders: (params?: Record<string, string>) =>
    api.get<FoodOrder[]>('/driver/food/orders', params),

  availableOrders: (params?: Record<string, string>) =>
    api.get<FoodOrder[]>('/driver/food/orders/available', params),

  acceptOrder: (id: string) =>
    api.post<FoodOrder>(`/driver/food/orders/${id}/accept`),

  updateOrderStatus: (id: string, status: string) =>
    api.post<FoodOrder>(`/driver/food/orders/${id}/status`, { status }),

  adminRestaurants: (params?: Record<string, string>) =>
    api.get<Restaurant[]>('/admin/food/restaurants', params),

  adminCreateRestaurant: (data: {
    name: string; address: string; delivery_fee: number;
    minimum_order: number; is_active: boolean;
  }) => api.post<Restaurant>('/admin/food/restaurants', data),

  adminUpdateRestaurant: (id: string, data: Record<string, unknown>) =>
    api.put<Restaurant>(`/admin/food/restaurants/${id}`, data),

  adminOrders: (params?: Record<string, string>) =>
    api.get<FoodOrder[]>('/admin/food/orders', params),
};
