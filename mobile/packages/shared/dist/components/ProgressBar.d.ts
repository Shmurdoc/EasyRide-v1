import { ViewStyle } from 'react-native';
interface ProgressBarProps {
    progress: number;
    height?: number;
    color?: string;
    backgroundColor?: string;
    style?: ViewStyle;
}
export declare function ProgressBar({ progress, height, color, backgroundColor, style, }: ProgressBarProps): import("react/jsx-runtime").JSX.Element;
export {};
