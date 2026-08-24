"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItem = ListItem;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function ListItem({ left, title, subtitle, right, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', alignItems: 'center', paddingVertical: constants_1.SPACING.md, gap: constants_1.SPACING.md }, style], children: [left && (0, jsx_runtime_1.jsx)(react_native_1.View, { children: left }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.text }, typography.body, { fontWeight: '500' }], children: title }), subtitle && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted, marginTop: 2 }, typography.xs], children: subtitle }))] }), right && (0, jsx_runtime_1.jsx)(react_native_1.View, { children: right })] }));
}
