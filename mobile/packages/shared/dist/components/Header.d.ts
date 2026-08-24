import { ViewStyle } from 'react-native';
interface HeaderProps {
    title: string;
    leftAction?: {
        icon: string;
        onPress: () => void;
    };
    rightAction?: {
        icon: string;
        onPress: () => void;
    };
    style?: ViewStyle;
}
export declare function Header({ title, leftAction, rightAction, style }: HeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
