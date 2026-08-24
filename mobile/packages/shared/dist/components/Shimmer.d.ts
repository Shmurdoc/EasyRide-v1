import { ViewStyle, DimensionValue } from 'react-native';
interface ShimmerProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    variant?: 'default' | 'gold';
    style?: ViewStyle;
}
export declare function Shimmer({ width, height, borderRadius, variant, style, }: ShimmerProps): import("react/jsx-runtime").JSX.Element;
export {};
