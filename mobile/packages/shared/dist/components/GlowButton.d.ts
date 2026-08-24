import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type ButtonSize = 'sm' | 'md' | 'lg';
interface GlowButtonProps {
    title: string;
    onPress: () => void;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    glowColor?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function GlowButton({ title, onPress, size, disabled, loading, icon, glowColor, style, textStyle, }: GlowButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
