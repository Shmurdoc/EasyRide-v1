import React from 'react';
import { TextStyle } from 'react-native';
type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'small' | 'xs' | 'caption' | 'label' | 'price' | 'eta';
interface TypographyProps {
    variant?: TextVariant;
    color?: string;
    gradient?: readonly [string, string, ...string[]];
    align?: 'left' | 'center' | 'right';
    style?: TextStyle;
    numberOfLines?: number;
    children: React.ReactNode;
}
export declare function Typography({ variant, color, gradient, align, style, numberOfLines, children }: TypographyProps): import("react/jsx-runtime").JSX.Element;
export {};
