import React from 'react';
import { ViewStyle } from 'react-native';
interface EmptyStateProps {
    title: string;
    message?: string;
    action?: React.ReactNode;
    style?: ViewStyle;
}
export declare function EmptyState({ title, message, action, style }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
export {};
