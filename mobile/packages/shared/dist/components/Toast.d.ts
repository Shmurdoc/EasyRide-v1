import { ViewStyle } from 'react-native';
type ToastType = 'success' | 'error' | 'info';
interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    onHide: () => void;
    style?: ViewStyle;
}
export declare function Toast({ visible, message, type, duration, onHide, style }: ToastProps): import("react/jsx-runtime").JSX.Element;
export {};
