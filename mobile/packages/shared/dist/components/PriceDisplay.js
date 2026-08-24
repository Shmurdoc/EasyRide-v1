"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceDisplay = PriceDisplay;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function PriceDisplay({ amount, label, size = 'md', style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const formatted = `R ${amount.toFixed(2)}`;
    const sizes = {
        sm: { fontSize: 14, fontWeight: '600' },
        md: { fontSize: 20, fontWeight: '700' },
        lg: { fontSize: 28, fontWeight: '700' },
    };
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', alignItems: 'baseline', gap: constants_1.SPACING.sm }, style], children: [label && (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted }, typography.small], children: label }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.primary }, sizes[size]], children: formatted })] }));
}
