import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface CategoryTileProps {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    badge?: string;
    selected?: boolean;
    onPress: () => void;
    style?: ViewStyle;
}
export declare function CategoryTile({ label, icon, badge, selected, onPress, style, }: CategoryTileProps): import("react/jsx-runtime").JSX.Element;
export {};
