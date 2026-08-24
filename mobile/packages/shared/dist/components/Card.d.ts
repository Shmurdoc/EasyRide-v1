import React from 'react';
import { ViewStyle } from 'react-native';
interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'raised' | 'interactive' | 'glass' | 'elevated';
    padding?: number;
    style?: ViewStyle;
}
export declare function Card({ children, variant, padding, style }: CardProps): import("react/jsx-runtime").JSX.Element;
export {};
