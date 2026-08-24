"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Typography = Typography;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const theme_1 = require("../theme");
function Typography({ variant = 'body', color, gradient, align, style, numberOfLines, children }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const variantStyle = typography[variant] || typography.body;
    if (gradient) {
        return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [variantStyle, { color: 'transparent', textAlign: align }, style], numberOfLines: numberOfLines, children: children }), (0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: gradient, start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, style: [react_native_1.StyleSheet.absoluteFill], pointerEvents: "none", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [variantStyle, { color: 'transparent', textAlign: align }, style], numberOfLines: numberOfLines, children: children }) })] }));
    }
    return ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: color || colors.text, textAlign: align }, variantStyle, style], numberOfLines: numberOfLines, children: children }));
}
