import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    glow?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function Button({ title, onPress, variant, size, disabled, loading, glow, icon, style, textStyle, }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
