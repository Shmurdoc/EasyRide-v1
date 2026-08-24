import { ViewStyle } from 'react-native';
interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function Chip({ label, selected, onPress, style }: ChipProps): import("react/jsx-runtime").JSX.Element;
export {};
