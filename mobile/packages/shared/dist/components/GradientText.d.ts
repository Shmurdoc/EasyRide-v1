import React from 'react';
import { TextStyle } from 'react-native';
interface GradientTextProps {
    colors?: readonly [string, string, ...string[]];
    start?: {
        x: number;
        y: number;
    };
    end?: {
        x: number;
        y: number;
    };
    style?: TextStyle;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    children: React.ReactNode;
}
export declare function GradientText({ colors, start, end, style, numberOfLines, ellipsizeMode, children, }: GradientTextProps): import("react/jsx-runtime").JSX.Element;
export {};
