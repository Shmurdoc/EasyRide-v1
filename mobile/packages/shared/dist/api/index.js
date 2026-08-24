"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foodDelivery = exports.kyc = exports.reports = exports.admin = exports.config = exports.sos = exports.places = exports.deliveries = exports.promoCodes = exports.ratings = exports.wallet = exports.payments = exports.consent = exports.notifications = exports.drivers = exports.rides = exports.users = exports.auth = exports.api = void 0;
const client_1 = require("./client");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return client_1.api; } });
exports.auth = {
    login: (email, password) => client_1.api.post('/auth/login', { email, password }),
    register: (data) => client_1.api.post('/auth/register', data),
    logout: () => client_1.api.post('/auth/logout'),
    me: () => client_1.api.get('/auth/me').then(r => r.user),
    forgotPassword: (email) => client_1.api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => client_1.api.post('/auth/reset-password', data),
};
exports.users = {
    get: (id) => client_1.api.get(`/users/${id}`),
    update: (id, data) => client_1.api.put(`/users/${id}`, data),
};
exports.rides = {
    list: (params) => client_1.api.get('/rides', params),
    get: (id) => client_1.api.get(`/rides/${id}`),
    create: (data) => client_1.api.post('/rides', data).then(r => {
        var _a, _b, _c;
        const ride = (_c = (_a = r === null || r === void 0 ? void 0 : r.ride) !== null && _a !== void 0 ? _a : (_b = r === null || r === void 0 ? void 0 : r.data) === null || _b === void 0 ? void 0 : _b.ride) !== null && _c !== void 0 ? _c : r;
        if (!(ride === null || ride === void 0 ? void 0 : ride.id)) {
            console.error('[rides.create] Unexpected response shape:', JSON.stringify(r));
            throw new Error('Server returned an invalid ride response');
        }
        return ride;
    }),
    cancel: (id, reason) => client_1.api.post(`/rides/${id}/cancel`, { cancellation_reason: reason }),
    rate: (id, score, comment) => client_1.api.post(`/rides/${id}/rate`, { score, comment }),
    applyPromo: (id, code) => client_1.api.post(`/rides/${id}/apply-promo`, { code }),
    current: () => client_1.api.get('/rides/current'),
    fareEstimate: (data) => client_1.api.get('/rides/fare-estimate', {
        pickup_lat: String(data.pickup_lat),
        pickup_lng: String(data.pickup_lng),
        dropoff_lat: String(data.dropoff_lat),
        dropoff_lng: String(data.dropoff_lng),
        category: data.category,
    }),
    updateLocation: (id, lat, lng) => client_1.api.post(`/rides/${id}/location`, { latitude: lat, longitude: lng }),
};
exports.drivers = {
    list: (params) => client_1.api.get('/drivers', params),
    get: (id) => client_1.api.get(`/drivers/${id}`),
    updateProfile: (data) => client_1.api.put('/drivers/profile', data),
    registerVehicle: (data) => client_1.api.post('/drivers/vehicle', data),
    updateVehicle: (data) => client_1.api.post('/drivers/vehicle', data),
    toggleOnline: (is_online) => client_1.api.post('/drivers/toggle-online', { is_online }),
    earnings: () => client_1.api.get('/drivers/earnings'),
    trips: (params) => client_1.api.get('/drivers/trips', params),
    nearbyRides: (radius) => client_1.api.get('/drivers/nearby-rides', radius ? { radius: String(radius) } : undefined),
    updateLocation: (lat, lng) => client_1.api.post('/drivers/location', { latitude: lat, longitude: lng }),
};
exports.notifications = {
    registerToken: (token) => client_1.api.post('/notifications/register-token', { token }),
    list: () => client_1.api.get('/notifications/'),
    markAsRead: (id) => client_1.api.post(`/notifications/${id}/read`),
    markAllAsRead: () => client_1.api.post('/notifications/read-all'),
    unreadCount: () => client_1.api.get('/notifications/unread-count'),
    getPreferences: () => client_1.api.get('/notifications/preferences'),
    updatePreferences: (prefs) => client_1.api.put('/notifications/preferences', prefs),
};
exports.consent = {
    list: () => client_1.api.get('/consent/'),
    grant: (consentType, version) => client_1.api.post('/consent/grant', {
        consent_type: consentType,
        version,
    }),
    revoke: (consentType) => client_1.api.post('/consent/revoke', {
        consent_type: consentType,
    }),
    history: () => client_1.api.get('/consent/history'),
};
exports.payments = {
    list: (params) => client_1.api.get('/payments', params),
    get: (id) => client_1.api.get(`/payments/${id}`),
    methods: () => client_1.api.get('/payments/methods'),
    processRide: (rideId, method) => client_1.api.post(`/payments/rides/${rideId}/pay`, { method }),
};
exports.wallet = {
    get: () => client_1.api.get('/wallet'),
    transactions: (params) => client_1.api.get('/wallet/transactions', params),
    deposit: (amount, method) => client_1.api.post('/wallet/deposit', { amount, payment_method: method }),
    withdraw: (amount) => client_1.api.post('/wallet/withdraw', { amount }),
};
exports.ratings = {
    list: (params) => client_1.api.get('/ratings', params),
    given: (params) => client_1.api.get('/ratings/given', params),
};
exports.promoCodes = {
    list: (params) => client_1.api.get('/promo-codes', params),
    validate: (code, rideAmount) => client_1.api.post('/promo-codes/validate', { code, ride_amount: rideAmount }),
};
exports.deliveries = {
    list: (params) => client_1.api.get('/deliveries', params),
    get: (id) => client_1.api.get(`/deliveries/${id}`),
    create: (data) => client_1.api.post('/deliveries', data),
    updateStatus: (id, status) => client_1.api.put(`/deliveries/${id}/status`, { status }),
};
exports.places = {
    search: (query, lat, lng) => client_1.api.get('/places/search', Object.assign(Object.assign({ query }, (lat !== undefined && { lat: String(lat) })), (lng !== undefined && { lng: String(lng) }))),
    reverse: (lat, lng) => client_1.api.get('/places/reverse', { lat: String(lat), lng: String(lng) }),
};
exports.sos = {
    trigger: (data) => client_1.api.post('/sos/', data),
    cancel: (id) => client_1.api.post(`/sos/${id}/cancel`),
};
exports.config = {
    get: () => client_1.api.get('/config'),
};
exports.admin = {
    dashboard: () => client_1.api.get('/admin/dashboard'),
    users: (params) => client_1.api.get('/admin/users', params),
    rides: (params) => client_1.api.get('/admin/rides', params),
    drivers: (params) => client_1.api.get('/admin/drivers', params),
    approveDriver: (id) => client_1.api.post(`/admin/drivers/${id}/approve`),
    rejectDriver: (id) => client_1.api.post(`/admin/drivers/${id}/reject`),
    settings: () => client_1.api.get('/admin/settings'),
    updateSettings: (data) => client_1.api.post('/admin/settings', data),
};
exports.reports = {
    dashboard: (days) => client_1.api.get('/admin/reports/dashboard', days ? { days: String(days) } : undefined),
    revenue: (params) => client_1.api.get('/admin/reports/revenue', params),
    drivers: () => client_1.api.get('/admin/reports/drivers'),
};
exports.kyc = {
    submit: (data) => {
        const formData = new FormData();
        formData.append('verification_type', data.verification_type);
        formData.append('document_type', data.document_type);
        formData.append('document_number', data.document_number);
        formData.append('document_front', data.document_front);
        if (data.document_back) {
            formData.append('document_back', data.document_back);
        }
        return client_1.api.post('/kyc/', formData);
    },
    myVerifications: () => client_1.api.get('/kyc/my'),
    download: (verificationId, documentType) => client_1.api.get(`/kyc/${verificationId}/${documentType}`),
};
var foodDelivery_1 = require("./foodDelivery");
Object.defineProperty(exports, "foodDelivery", { enumerable: true, get: function () { return foodDelivery_1.foodDelivery; } });
