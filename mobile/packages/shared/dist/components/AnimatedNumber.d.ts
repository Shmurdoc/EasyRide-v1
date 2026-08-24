import { TextStyle } from 'react-native';
interface AnimatedNumberProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    useGradient?: boolean;
    gradientColors?: readonly [string, string, ...string[]];
    style?: TextStyle;
    haptic?: boolean;
}
export declare function AnimatedNumber({ value, duration, prefix, suffix, decimals, useGradient, gradientColors, style, haptic, }: AnimatedNumberProps): import("react/jsx-runtime").JSX.Element;
export {};
