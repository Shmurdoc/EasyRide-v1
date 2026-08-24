"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, multiline, keyboardType, autoCapitalize, style, testID, }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const [focused, setFocused] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: style, children: [label && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.text, marginBottom: constants_1.SPACING.sm }, typography.body], children: label })), (0, jsx_runtime_1.jsx)(react_native_1.TextInput, { testID: testID, value: value, onChangeText: onChangeText, placeholder: placeholder, placeholderTextColor: colors.textMuted, secureTextEntry: secureTextEntry, multiline: multiline, keyboardType: keyboardType, autoCapitalize: autoCapitalize, onFocus: () => setFocused(true), onBlur: () => setFocused(false), style: [
                    {
                        width: '100%',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        backgroundColor: colors.surface,
                        borderWidth: focused ? 2 : 1,
                        borderColor: focused ? colors.primary : colors.border,
                        borderRadius: constants_1.RADIUS.md,
                        color: colors.text,
                        fontSize: 14,
                    },
                    error ? { borderColor: colors.error } : {},
                ] }), error && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.error, marginTop: constants_1.SPACING.xs }, typography.small], children: error }))] }));
}
