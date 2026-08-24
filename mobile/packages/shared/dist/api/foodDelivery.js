"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foodDelivery = void 0;
const client_1 = require("./client");
exports.foodDelivery = {
    restaurants: (params) => client_1.api.get('/food/restaurants', params),
    restaurant: (id) => client_1.api.get(`/food/restaurants/${id}`),
    menu: (restaurantId) => client_1.api.get(`/food/restaurants/${restaurantId}/menu`),
    createOrder: (restaurantId, data) => client_1.api.post(`/food/restaurants/${restaurantId}/order`, data),
    myOrders: (params) => client_1.api.get('/food/orders', params),
    getOrder: (id) => client_1.api.get(`/food/orders/${id}`),
    cancelOrder: (id, reason) => client_1.api.post(`/food/orders/${id}/cancel`, { reason }),
    rateOrder: (id, rating, comment) => client_1.api.post(`/food/orders/${id}/rate`, { rating, comment }),
    driverOrders: (params) => client_1.api.get('/driver/food/orders', params),
    availableOrders: (params) => client_1.api.get('/driver/food/orders/available', params),
    acceptOrder: (id) => client_1.api.post(`/driver/food/orders/${id}/accept`),
    updateOrderStatus: (id, status) => client_1.api.post(`/driver/food/orders/${id}/status`, { status }),
    adminRestaurants: (params) => client_1.api.get('/admin/food/restaurants', params),
    adminCreateRestaurant: (data) => client_1.api.post('/admin/food/restaurants', data),
    adminUpdateRestaurant: (id, data) => client_1.api.put(`/admin/food/restaurants/${id}`, data),
    adminOrders: (params) => client_1.api.get('/admin/food/orders', params),
};
