import { ViewStyle } from 'react-native';
interface RideCardProps {
    pickupAddress: string;
    dropoffAddress: string;
    status: string;
    category?: string;
    distance?: number;
    fare?: number;
    driverName?: string;
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function RideCard({ pickupAddress, dropoffAddress, status, category, distance, fare, driverName, onPress, style, }: RideCardProps): import("react/jsx-runtime").JSX.Element;
export {};
