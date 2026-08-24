import type { PaginatedResponse, Restaurant, RestaurantCategory, FoodOrder } from '../types';
export declare const foodDelivery: {
    restaurants: (params?: Record<string, string>) => Promise<PaginatedResponse<Restaurant>>;
    restaurant: (id: string) => Promise<Restaurant & {
        categories: RestaurantCategory[];
    }>;
    menu: (restaurantId: string) => Promise<RestaurantCategory[]>;
    createOrder: (restaurantId: string, data: {
        items: {
            menu_item_id: string;
            quantity: number;
            special_instructions?: string;
        }[];
        delivery_address: string;
        delivery_latitude?: number;
        delivery_longitude?: number;
        delivery_notes?: string;
        payment_method: string;
        tip_amount?: number;
    }) => Promise<FoodOrder>;
    myOrders: (params?: Record<string, string>) => Promise<FoodOrder[]>;
    getOrder: (id: string) => Promise<FoodOrder>;
    cancelOrder: (id: string, reason?: string) => Promise<FoodOrder>;
    rateOrder: (id: string, rating: number, comment?: string) => Promise<FoodOrder>;
    driverOrders: (params?: Record<string, string>) => Promise<FoodOrder[]>;
    availableOrders: (params?: Record<string, string>) => Promise<FoodOrder[]>;
    acceptOrder: (id: string) => Promise<FoodOrder>;
    updateOrderStatus: (id: string, status: string) => Promise<FoodOrder>;
    adminRestaurants: (params?: Record<string, string>) => Promise<Restaurant[]>;
    adminCreateRestaurant: (data: {
        name: string;
        address: string;
        delivery_fee: number;
        minimum_order: number;
        is_active: boolean;
    }) => Promise<Restaurant>;
    adminUpdateRestaurant: (id: string, data: Record<string, unknown>) => Promise<Restaurant>;
    adminOrders: (params?: Record<string, string>) => Promise<FoodOrder[]>;
};
