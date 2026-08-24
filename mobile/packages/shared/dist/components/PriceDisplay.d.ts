import { ViewStyle } from 'react-native';
interface PriceDisplayProps {
    amount: number;
    currency?: string;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    style?: ViewStyle;
}
export declare function PriceDisplay({ amount, label, size, style }: PriceDisplayProps): import("react/jsx-runtime").JSX.Element;
export {};
