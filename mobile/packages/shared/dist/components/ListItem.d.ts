import React from 'react';
import { ViewStyle } from 'react-native';
interface ListItemProps {
    left?: React.ReactNode;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    style?: ViewStyle;
}
export declare function ListItem({ left, title, subtitle, right, style }: ListItemProps): import("react/jsx-runtime").JSX.Element;
export {};
