"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chip = Chip;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Chip({ label, selected, onPress, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    return ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { onPress: onPress, style: [{
                paddingVertical: 6, paddingHorizontal: constants_1.SPACING.md,
                backgroundColor: selected ? colors.primary : colors.surface,
                borderRadius: constants_1.RADIUS.md,
                borderWidth: selected ? 0 : 1,
                borderColor: colors.border,
            }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [typography.small, { fontWeight: '500', color: selected ? colors.bg : colors.text }], children: label }) }));
}
