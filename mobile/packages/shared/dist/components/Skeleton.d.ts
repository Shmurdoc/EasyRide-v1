import { ViewStyle, DimensionValue } from 'react-native';
interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}
export declare function Skeleton({ width, height, borderRadius, style }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonCard({ style }: {
    style?: ViewStyle;
}): import("react/jsx-runtime").JSX.Element;
export declare function SkeletonCircle({ size, style }: {
    size?: number;
    style?: ViewStyle;
}): import("react/jsx-runtime").JSX.Element;
export {};
