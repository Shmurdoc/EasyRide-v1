import { ViewStyle } from 'react-native';
interface DriverCardProps {
    name: string;
    rating: number;
    vehicleInfo?: string;
    licensePlate?: string;
    distance?: number;
    eta?: number;
    status?: 'available' | 'busy' | 'offline';
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function DriverCard({ name, rating, vehicleInfo, licensePlate, distance, eta, status, onPress, style, }: DriverCardProps): import("react/jsx-runtime").JSX.Element;
export {};
