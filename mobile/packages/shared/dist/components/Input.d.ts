import { ViewStyle } from 'react-native';
interface InputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    error?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    style?: ViewStyle;
    testID?: string;
}
export declare function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, multiline, keyboardType, autoCapitalize, style, testID, }: InputProps): import("react/jsx-runtime").JSX.Element;
export {};
