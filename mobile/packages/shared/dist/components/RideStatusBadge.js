"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideStatusBadge = RideStatusBadge;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function RideStatusBadge({ status, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const statusColor = constants_1.RIDE_STATUS_COLORS[status] || colors.textMuted;
    const label = constants_1.RIDE_STATUS_LABELS[status] || status;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', alignItems: 'center', gap: constants_1.SPACING.sm }, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor } }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: statusColor, fontWeight: '600' }, typography.body], children: label })] }));
}
