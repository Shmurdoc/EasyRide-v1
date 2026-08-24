import { ViewStyle } from 'react-native';
interface VehicleSelectorProps {
    selected: string;
    onSelect: (id: string) => void;
    style?: ViewStyle;
}
export declare function VehicleSelector({ selected, onSelect, style }: VehicleSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
