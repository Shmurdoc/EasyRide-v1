"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rating = Rating;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
function Rating({ score, maxScore = 5, showValue = true, size = 'sm', style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const stars = Math.round(score);
    const starSize = size === 'md' ? 16 : 12;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', alignItems: 'center', gap: 2 }, style], children: [Array.from({ length: maxScore }, (_, i) => ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: { fontSize: starSize, color: i < stars ? colors.primary : colors.border }, children: "\u2605" }, i))), showValue && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted, marginLeft: 4 }, typography.xs], children: score.toFixed(1) }))] }));
}
