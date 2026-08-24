"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradientText = GradientText;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
let LinearGradient = null;
try {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
}
catch (e) {
    // expo-linear-gradient not linked in release builds — fall back to plain Text
}
function GradientText({ colors = constants_1.GRADIENTS.primary, start = { x: 0, y: 0 }, end = { x: 1, y: 0 }, style, numberOfLines, ellipsizeMode, children, }) {
    if (!LinearGradient) {
        // Fallback: render with first color from gradient
        return ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [style, { color: colors[0] || constants_1.GRADIENTS.primary[0] }], numberOfLines: numberOfLines, ellipsizeMode: ellipsizeMode, children: children }));
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [style, { color: 'transparent' }], numberOfLines: numberOfLines, ellipsizeMode: ellipsizeMode, children: children }), (0, jsx_runtime_1.jsx)(LinearGradient, { colors: colors, start: start, end: end, style: react_native_1.StyleSheet.absoluteFill, pointerEvents: "none", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [style, { color: 'transparent' }], numberOfLines: numberOfLines, ellipsizeMode: ellipsizeMode, children: children }) })] }));
}
