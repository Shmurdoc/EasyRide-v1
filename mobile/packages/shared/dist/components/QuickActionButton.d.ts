import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface QuickActionButtonProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    style?: ViewStyle;
}
export declare function QuickActionButton({ icon, label, onPress, style, }: QuickActionButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
