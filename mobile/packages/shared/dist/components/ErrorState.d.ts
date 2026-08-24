import { ViewStyle } from 'react-native';
interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
    style?: ViewStyle;
}
export declare function ErrorState({ message, onRetry, style }: ErrorStateProps): import("react/jsx-runtime").JSX.Element;
export {};
