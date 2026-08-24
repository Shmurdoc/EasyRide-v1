"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function EmptyState({ title, message, action, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: constants_1.SPACING.xl }, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.text, textAlign: 'center' }, typography.h3], children: title }), message && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted, textAlign: 'center', marginTop: constants_1.SPACING.sm }, typography.body], children: message })), action && (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { marginTop: constants_1.SPACING.lg }, children: action })] }));
}
