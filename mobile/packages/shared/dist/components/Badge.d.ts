import { ViewStyle } from 'react-native';
type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default';
interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    style?: ViewStyle;
}
export declare function Badge({ label, variant, style }: BadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
