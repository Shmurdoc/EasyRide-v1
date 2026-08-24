"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleSelector = VehicleSelector;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function VehicleSelector({ selected, onSelect, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{ gap: constants_1.SPACING.sm }, style], children: constants_1.RIDE_CATEGORIES.map(cat => {
            const isSelected = cat.id === selected;
            return ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { onPress: () => onSelect(cat.id), children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: {
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        padding: constants_1.SPACING.base, backgroundColor: isSelected ? colors.surfaceLight : colors.surface,
                        borderRadius: constants_1.RADIUS.md, borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border,
                    }, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [typography.body, { fontWeight: '600', color: colors.text }], children: cat.name }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [typography.small, { color: colors.textMuted }], children: ["R", cat.perKm, "/km \u00B7 R", cat.perMin, "/min"] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [typography.body, { fontWeight: '700', color: colors.primary }], children: ["R", cat.baseFare] })] }) }, cat.id));
        }) }));
}
