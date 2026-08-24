import { ViewStyle } from 'react-native';
interface RatingProps {
    score: number;
    maxScore?: number;
    showValue?: boolean;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}
export declare function Rating({ score, maxScore, showValue, size, style }: RatingProps): import("react/jsx-runtime").JSX.Element;
export {};
