import { api } from './client';
export { api };
import type { User, Ride, Payment, Wallet, WalletTransaction, Rating, PromoCode, Delivery, PaginatedResponse, PlatformConfig, FareEstimate, Notification, SOSAlert, Place } from '../types';
export declare const auth: {
    login: (email: string, password: string) => Promise<{
        user: User;
        token: string;
    }>;
    register: (data: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        phone_number: string;
    }) => Promise<{
        user: User;
        token: string;
    }>;
    logout: () => Promise<unknown>;
    me: () => Promise<User>;
    forgotPassword: (email: string) => Promise<unknown>;
    resetPassword: (data: {
        token: string;
        email: string;
        password: string;
        password_confirmation: string;
    }) => Promise<unknown>;
};
export declare const users: {
    get: (id: string) => Promise<User>;
    update: (id: string, data: Partial<User>) => Promise<User>;
};
export declare const rides: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<Ride>>;
    get: (id: string) => Promise<Ride>;
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
    }) => Promise<any>;
    cancel: (id: string, reason?: string) => Promise<Ride>;
    rate: (id: string, score: number, comment?: string) => Promise<Rating>;
    applyPromo: (id: string, code: string) => Promise<unknown>;
    current: () => Promise<Ride>;
    fareEstimate: (data: {
        pickup_lat: number;
        pickup_lng: number;
        dropoff_lat: number;
        dropoff_lng: number;
        category: string;
    }) => Promise<FareEstimate>;
    updateLocation: (id: string, lat: number, lng: number) => Promise<unknown>;
};
export declare const drivers: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<User>>;
    get: (id: string) => Promise<User>;
    updateProfile: (data: Record<string, unknown>) => Promise<unknown>;
    registerVehicle: (data: {
        make: string;
        model: string;
        year: number;
        color: string;
        license_plate: string;
        category: string;
    }) => Promise<unknown>;
    updateVehicle: (data: {
        make: string;
        model: string;
        year: number;
        color: string;
        license_plate: string;
        category: string;
    }) => Promise<unknown>;
    toggleOnline: (is_online: boolean) => Promise<{
        is_online: boolean;
    }>;
    earnings: () => Promise<{
        total_earnings: number;
        today_earnings: number;
        pending_payout: number;
        total_trips: number;
        recent_transactions: WalletTransaction[];
    }>;
    trips: (params?: Record<string, string>) => Promise<PaginatedResponse<Ride>>;
    nearbyRides: (radius?: number) => Promise<Ride[]>;
    updateLocation: (lat: number, lng: number) => Promise<unknown>;
};
export declare const notifications: {
    registerToken: (token: string) => Promise<unknown>;
    list: () => Promise<PaginatedResponse<Notification>>;
    markAsRead: (id: string) => Promise<unknown>;
    markAllAsRead: () => Promise<unknown>;
    unreadCount: () => Promise<{
        count: number;
    }>;
    getPreferences: () => Promise<{
        data: import("../types").NotificationPreferences;
    }>;
    updatePreferences: (prefs: Partial<import("../types").NotificationPreferences>) => Promise<{
        data: import("../types").NotificationPreferences;
    }>;
};
export declare const consent: {
    list: () => Promise<{
        data: import("../types").ConsentRecord[];
    }>;
    grant: (consentType: import("../types").ConsentType, version: string) => Promise<{
        data: import("../types").ConsentRecord;
    }>;
    revoke: (consentType: import("../types").ConsentType) => Promise<{
        data: import("../types").ConsentRecord;
    }>;
    history: () => Promise<{
        data: import("../types").ConsentRecord[];
    }>;
};
export declare const payments: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<Payment>>;
    get: (id: string) => Promise<Payment>;
    methods: () => Promise<{
        methods: {
            id: string;
            name: string;
            available: boolean;
        }[];
    }>;
    processRide: (rideId: string, method: string) => Promise<{
        payment: Payment;
        message: string;
        redirect_url?: string;
        client_secret?: string;
        payment_intent_id?: string;
    }>;
};
export declare const wallet: {
    get: () => Promise<Wallet>;
    transactions: (params?: Record<string, string>) => Promise<PaginatedResponse<WalletTransaction>>;
    deposit: (amount: number, method: string) => Promise<{
        client_secret?: string;
    }>;
    withdraw: (amount: number) => Promise<unknown>;
};
export declare const ratings: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<Rating>>;
    given: (params?: Record<string, string>) => Promise<PaginatedResponse<Rating>>;
};
export declare const promoCodes: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<PromoCode>>;
    validate: (code: string, rideAmount?: number) => Promise<{
        valid: boolean;
        discount: number;
        promo_code?: PromoCode;
    }>;
};
export declare const deliveries: {
    list: (params?: Record<string, string>) => Promise<PaginatedResponse<Delivery>>;
    get: (id: string) => Promise<Delivery>;
    create: (data: Record<string, unknown>) => Promise<Delivery>;
    updateStatus: (id: string, status: string) => Promise<Delivery>;
};
export declare const places: {
    search: (query: string, lat?: number, lng?: number) => Promise<Place[]>;
    reverse: (lat: number, lng: number) => Promise<Place>;
};
export declare const sos: {
    trigger: (data: {
        ride_id: string;
        latitude: number;
        longitude: number;
        message?: string;
    }) => Promise<SOSAlert>;
    cancel: (id: string) => Promise<SOSAlert>;
};
export declare const config: {
    get: () => Promise<PlatformConfig>;
};
export declare const admin: {
    dashboard: () => Promise<{
        total_users: number;
        total_drivers: number;
        total_rides: number;
        active_rides: number;
        total_revenue: number;
        rides_today: number;
        completed_today: number;
        revenue_today: number;
    }>;
    users: (params?: Record<string, string>) => Promise<PaginatedResponse<User>>;
    rides: (params?: Record<string, string>) => Promise<PaginatedResponse<Ride>>;
    drivers: (params?: Record<string, string>) => Promise<PaginatedResponse<User>>;
    approveDriver: (id: string) => Promise<unknown>;
    rejectDriver: (id: string) => Promise<unknown>;
    settings: () => Promise<unknown>;
    updateSettings: (data: {
        key: string;
        value: unknown;
        description?: string;
    }) => Promise<unknown>;
};
export declare const reports: {
    dashboard: (days?: number) => Promise<unknown>;
    revenue: (params?: Record<string, string>) => Promise<unknown>;
    drivers: () => Promise<unknown>;
};
export declare const kyc: {
    submit: (data: {
        verification_type: string;
        document_type: string;
        document_number: string;
        document_front: File | Blob;
        document_back?: File | Blob;
    }) => Promise<{
        message: string;
        verification: KycVerification;
    }>;
    myVerifications: () => Promise<{
        verifications: KycVerification[];
    }>;
    download: (verificationId: string, documentType: string) => Promise<unknown>;
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
