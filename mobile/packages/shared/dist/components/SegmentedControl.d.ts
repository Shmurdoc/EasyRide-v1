import { ViewStyle } from 'react-native';
interface Tab {
    key: string;
    label: string;
}
interface SegmentedControlProps {
    tabs: Tab[];
    selected: string;
    onSelect: (key: string) => void;
    style?: ViewStyle;
}
export declare function SegmentedControl({ tabs, selected, onSelect, style }: SegmentedControlProps): import("react/jsx-runtime").JSX.Element;
export {};
