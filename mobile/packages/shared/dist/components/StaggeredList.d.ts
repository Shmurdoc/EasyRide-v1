import React from 'react';
import { ViewStyle } from 'react-native';
interface StaggeredListProps {
    children: React.ReactNode[];
    staggerDelay?: number;
    style?: ViewStyle;
}
export declare function StaggeredList({ children, staggerDelay, style }: StaggeredListProps): import("react/jsx-runtime").JSX.Element;
export {};
