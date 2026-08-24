"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
const Button_1 = require("./Button");
function Header({ title, leftAction, rightAction, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: constants_1.SPACING.base, paddingVertical: constants_1.SPACING.md, backgroundColor: colors.bg }, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: 44, alignItems: 'flex-start' }, children: leftAction && ((0, jsx_runtime_1.jsx)(Button_1.Button, { title: leftAction.icon, onPress: leftAction.onPress, variant: "ghost", size: "sm" })) }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { flex: 1, alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.text }, typography.h3], children: title }) }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: 44, alignItems: 'flex-end' }, children: rightAction && ((0, jsx_runtime_1.jsx)(Button_1.Button, { title: rightAction.icon, onPress: rightAction.onPress, variant: "ghost", size: "sm" })) })] }));
}
