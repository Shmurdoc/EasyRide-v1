import React from 'react';
import { ViewStyle } from 'react-native';
interface GlassCardProps {
    children: React.ReactNode;
    padding?: number;
    glow?: boolean;
    glowColor?: string;
    style?: ViewStyle;
}
export declare function GlassCard({ children, padding, glow, glowColor, style, }: GlassCardProps): import("react/jsx-runtime").JSX.Element;
export {};
