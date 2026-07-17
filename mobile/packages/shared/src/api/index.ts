import { api } from './client';
export { api };
import type {
  User, Ride, Payment, Wallet, WalletTransaction, Rating,
  PromoCode, Delivery, PaginatedResponse, PlatformConfig, DriverLocation,
  FareEstimate, Notification, SOSAlert, Place,
} from '../types';

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; password_confirmation: string; phone_number: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me').then(r => r.user),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post('/auth/reset-password', data),
};

export const users = {
  get: (id: string) => api.get<User>(`/users/${id}`),

  update: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
};

export const rides = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Ride>>('/rides', params),

  get: (id: string) => api.get<Ride>(`/rides/${id}`),

  create: (data: {
    category: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
    dropoff_address: string;
    payment_method: string;
    promo_code?: string;
  }) => api.post<{ ride: Ride }>('/rides', data).then(r => {
    const ride = r?.ride ?? (r as any)?.data?.ride ?? r;
    if (!ride?.id) {
      console.error('[rides.create] Unexpected response shape:', JSON.stringify(r));
      throw new Error('Server returned an invalid ride response');
    }
    return ride;
  }),

  cancel: (id: string, reason?: string) =>
    api.post<Ride>(`/rides/${id}/cancel`, { cancellation_reason: reason }),

  rate: (id: string, score: number, comment?: string) =>
    api.post<Rating>(`/rides/${id}/rate`, { score, comment }),

  applyPromo: (id: string, code: string) =>
    api.post(`/rides/${id}/apply-promo`, { code }),

  current: () => api.get<Ride | null>('/rides/current'),

  fareEstimate: (data: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    category: string;
  }) => api.get<FareEstimate>('/rides/fare-estimate', {
    pickup_lat: String(data.pickup_lat),
    pickup_lng: String(data.pickup_lng),
    dropoff_lat: String(data.dropoff_lat),
    dropoff_lng: String(data.dropoff_lng),
    category: data.category,
  }),

  updateLocation: (id: string, lat: number, lng: number) =>
    api.post(`/rides/${id}/location`, { latitude: lat, longitude: lng }),
};

export const drivers = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/drivers', params),

  get: (id: string) => api.get<User>(`/drivers/${id}`),

  updateProfile: (data: Record<string, unknown>) =>
    api.put('/drivers/profile', data),

  registerVehicle: (data: {
    make: string; model: string; year: number;
    color: string; license_plate: string; category: string;
  }) => api.post('/drivers/vehicle', data),

  updateVehicle: (data: {
    make: string; model: string; year: number;
    color: string; license_plate: string; category: string;
  }) => api.post('/drivers/vehicle', data),

  toggleOnline: (is_online: boolean) => api.post<{ is_online: boolean }>('/drivers/toggle-online', { is_online }),

  earnings: () => api.get<{
    total_earnings: number;
    today_earnings: number;
    pending_payout: number;
    total_trips: number;
    recent_transactions: WalletTransaction[];
  }>('/drivers/earnings'),

  trips: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Ride>>('/drivers/trips', params),

  nearbyRides: (radius?: number) =>
    api.get<Ride[]>('/drivers/nearby-rides', radius ? { radius: String(radius) } : undefined),

  updateLocation: (lat: number, lng: number) =>
    api.post('/drivers/location', { latitude: lat, longitude: lng }),
};

export const notifications = {
  registerToken: (token: string) =>
    api.post('/notifications/register-token', { token }),

  list: () =>
    api.get<PaginatedResponse<Notification>>('/notifications/'),

  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),

  getPreferences: () =>
    api.get<{ data: import('../types').NotificationPreferences }>('/notifications/preferences'),

  updatePreferences: (prefs: Partial<import('../types').NotificationPreferences>) =>
    api.put<{ data: import('../types').NotificationPreferences }>('/notifications/preferences', prefs),
};

export const consent = {
  list: () =>
    api.get<{ data: import('../types').ConsentRecord[] }>('/consent/'),

  grant: (consentType: import('../types').ConsentType, version: string) =>
    api.post<{ data: import('../types').ConsentRecord }>('/consent/grant', {
      consent_type: consentType,
      version,
    }),

  revoke: (consentType: import('../types').ConsentType) =>
    api.post<{ data: import('../types').ConsentRecord }>('/consent/revoke', {
      consent_type: consentType,
    }),

  history: () =>
    api.get<{ data: import('../types').ConsentRecord[] }>('/consent/history'),
};

export const payments = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Payment>>('/payments', params),

  get: (id: string) => api.get<Payment>(`/payments/${id}`),

  methods: () => api.get<{ methods: { id: string; name: string; available: boolean }[] }>('/payments/methods'),

  processRide: (rideId: string, method: string) =>
    api.post<{
      payment: Payment;
      message: string;
      redirect_url?: string;
      client_secret?: string;
      payment_intent_id?: string;
    }>(`/payments/rides/${rideId}/pay`, { method }),
};

export const wallet = {
  get: () => api.get<Wallet>('/wallet'),

  transactions: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<WalletTransaction>>('/wallet/transactions', params),

  deposit: (amount: number, method: string) =>
    api.post<{ client_secret?: string }>('/wallet/deposit', { amount, payment_method: method }),

  withdraw: (amount: number) =>
    api.post('/wallet/withdraw', { amount }),
};

export const ratings = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Rating>>('/ratings', params),

  given: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Rating>>('/ratings/given', params),
};

export const promoCodes = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<PromoCode>>('/promo-codes', params),

  validate: (code: string, rideAmount?: number) =>
    api.post<{ valid: boolean; discount: number; promo_code?: PromoCode }>('/promo-codes/validate', { code, ride_amount: rideAmount }),
};

export const deliveries = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Delivery>>('/deliveries', params),

  get: (id: string) => api.get<Delivery>(`/deliveries/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<Delivery>('/deliveries', data),

  updateStatus: (id: string, status: string) =>
    api.put<Delivery>(`/deliveries/${id}/status`, { status }),
};

export const places = {
  search: (query: string, lat?: number, lng?: number) =>
    api.get<Place[]>('/places/search', {
      query,
      ...(lat !== undefined && { lat: String(lat) }),
      ...(lng !== undefined && { lng: String(lng) }),
    }),

  reverse: (lat: number, lng: number) =>
    api.get<Place>('/places/reverse', { lat: String(lat), lng: String(lng) }),
};

export const sos = {
  trigger: (data: { ride_id: string; latitude: number; longitude: number; message?: string }) =>
    api.post<SOSAlert>('/sos/', data),

  cancel: (id: string) =>
    api.post<SOSAlert>(`/sos/${id}/cancel`),
};

export const config = {
  get: () => api.get<PlatformConfig>('/config'),
};

export const admin = {
  dashboard: () => api.get<{
    total_users: number;
    total_drivers: number;
    total_rides: number;
    active_rides: number;
    total_revenue: number;
    rides_today: number;
    completed_today: number;
    revenue_today: number;
  }>('/admin/dashboard'),

  users: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/admin/users', params),

  rides: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Ride>>('/admin/rides', params),

  drivers: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<User>>('/admin/drivers', params),

  approveDriver: (id: string) => api.post(`/admin/drivers/${id}/approve`),

  rejectDriver: (id: string) => api.post(`/admin/drivers/${id}/reject`),

  settings: () => api.get('/admin/settings'),

  updateSettings: (data: { key: string; value: unknown; description?: string }) =>
    api.post('/admin/settings', data),
};

export const reports = {
  dashboard: (days?: number) =>
    api.get('/admin/reports/dashboard', days ? { days: String(days) } : undefined),

  revenue: (params?: Record<string, string>) =>
    api.get('/admin/reports/revenue', params),

  drivers: () => api.get('/admin/reports/drivers'),
};

export const kyc = {
  submit: (data: {
    verification_type: string;
    document_type: string;
    document_number: string;
    document_front: File | Blob;
    document_back?: File | Blob;
  }) => {
    const formData = new FormData();
    formData.append('verification_type', data.verification_type);
    formData.append('document_type', data.document_type);
    formData.append('document_number', data.document_number);
    formData.append('document_front', data.document_front);
    if (data.document_back) {
      formData.append('document_back', data.document_back);
    }
    return api.post<{ message: string; verification: KycVerification }>('/kyc/', formData as any);
  },

  myVerifications: () =>
    api.get<{ verifications: KycVerification[] }>('/kyc/my'),

  download: (verificationId: string, documentType: string) =>
    api.get(`/kyc/${verificationId}/${documentType}`),
};

export type KycVerification = {
  id: string;
  user_id: string;
  verification_type: string;
  document_type: string;
  document_number: string;
  document_front_path: string;
  document_back_path?: string;
  selfie_path?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  rejection_reason?: string;
  verified_at?: string;
  verified_by?: number;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export { foodDelivery } from './foodDelivery';
