"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Badge({ label, variant = 'default', style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const variantColors = {
        success: { bg: colors.success, text: colors.white },
        error: { bg: colors.error, text: colors.white },
        warning: { bg: '#F59E0B', text: colors.black },
        info: { bg: colors.primary, text: colors.bg },
        default: { bg: colors.surfaceLight, text: colors.textMuted },
    };
    const { bg, text } = variantColors[variant];
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{ backgroundColor: bg, borderRadius: constants_1.RADIUS.sm, paddingHorizontal: constants_1.SPACING.sm, paddingVertical: 2, alignSelf: 'flex-start' }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: text, fontSize: 11, fontWeight: '600' }], children: label }) }));
}
