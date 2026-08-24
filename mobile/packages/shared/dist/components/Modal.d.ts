import React from 'react';
import { ViewStyle } from 'react-native';
interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    style?: ViewStyle;
}
export declare function Modal({ visible, onClose, title, children, style }: ModalProps): import("react/jsx-runtime").JSX.Element;
export {};
