import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, NavigatorScreenParams } from '@react-navigation/native';
export type RiderAuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};
export type RiderMainTabParamList = {
    Home: {
        dropoff?: {
            id: string;
            name: string;
            lat: number;
            lng: number;
        };
    } | undefined;
    Activity: undefined;
    Profile: undefined;
};
export type RiderStackParamList = {
    Main: NavigatorScreenParams<RiderMainTabParamList>;
    Consent: undefined;
    BookRide: {
        pickup?: {
            lat: number;
            lng: number;
            address: string;
        };
        dropoff?: string;
    };
    RideTracking: {
        rideId: string;
    };
    Payment: {
        rideId: string;
        amount?: number;
    };
    RideHistory: undefined;
    RideDetail: {
        rideId: string;
    };
    Chat: {
        rideId: string;
        receiverId: string;
    };
    RestaurantList: undefined;
    RestaurantMenu: {
        restaurantId: string;
    };
    FoodCheckout: {
        restaurantId: string;
        restaurantName: string;
        cart: any[];
        subtotal: number;
        deliveryFee: number;
    };
    FoodOrderTracking: {
        orderId: string;
    };
    Wallet: undefined;
    Rating: {
        rideId: string;
        driverName?: string;
        driverAvatar?: string;
    };
    PromoCode: undefined;
    Support: undefined;
    Notification: undefined;
};
export type DriverStackParamList = {
    Login: undefined;
    ForgotPassword: undefined;
    Main: undefined;
    Consent: undefined;
    RideRequests: undefined;
    ActiveRide: {
        rideId: string;
        riderId: string;
    };
    Chat: {
        rideId: string;
        receiverId: string;
    };
    TripHistory: undefined;
    Earnings: undefined;
    Profile: undefined;
    FoodDelivery: undefined;
    FoodOrderDetail: {
        orderId: string;
    };
    Documents: undefined;
    Support: undefined;
};
export type AdminStackParamList = {
    Login: undefined;
    Main: undefined;
};
export type RiderAuthNav = NativeStackNavigationProp<RiderAuthStackParamList>;
export type RiderNav = NativeStackNavigationProp<RiderStackParamList>;
export type DriverNav = NativeStackNavigationProp<DriverStackParamList>;
export type AdminNav = NativeStackNavigationProp<AdminStackParamList>;
export type RiderRoute<R extends keyof RiderStackParamList> = RouteProp<RiderStackParamList, R>;
export type DriverRoute<R extends keyof DriverStackParamList> = RouteProp<DriverStackParamList, R>;
export type AdminRoute<R extends keyof AdminStackParamList> = RouteProp<AdminStackParamList, R>;
