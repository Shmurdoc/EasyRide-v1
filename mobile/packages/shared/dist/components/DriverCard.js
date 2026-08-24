"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverCard = DriverCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
const Card_1 = require("./Card");
function DriverCard({ name, rating, vehicleInfo, licensePlate, distance, eta, status = 'available', onPress, style, }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const statusColors = {
        available: colors.success,
        busy: colors.primary,
        offline: colors.textMuted,
    };
    return ((0, jsx_runtime_1.jsx)(Card_1.Card, { variant: "interactive", style: style, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flexDirection: 'row', alignItems: 'center', gap: constants_1.SPACING.md }, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.primary, fontWeight: '700' }, typography.h3], children: name.charAt(0).toUpperCase() }) }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flexDirection: 'row', alignItems: 'center', gap: constants_1.SPACING.sm }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.text }, typography.body, { fontWeight: '600' }], children: name }), (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [{ color: colors.primary }, typography.small], children: ['★', " ", rating.toFixed(1)] })] }), vehicleInfo && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted }, typography.xs], children: vehicleInfo })), licensePlate && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted }, typography.xs], children: licensePlate }))] }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { alignItems: 'flex-end', gap: 2 }, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: statusColors[status] } }), distance && (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [{ color: colors.textMuted }, typography.xs], children: [distance.toFixed(1), "km"] }), eta && (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: [{ color: colors.textMuted }, typography.xs], children: [eta, "min"] })] })] }) }));
}
