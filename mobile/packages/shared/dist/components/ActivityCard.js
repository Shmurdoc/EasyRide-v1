"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityCard = ActivityCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const vector_icons_1 = require("@expo/vector-icons");
const constants_1 = require("../constants");
const GradientText_1 = require("./GradientText");
function ActivityCard({ ride, onPress }) {
    var _a;
    return ((0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onPress, activeOpacity: 0.9, style: styles.container, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.inner, children: [(0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: ['#1a1a2e', '#16213e'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: react_native_1.StyleSheet.absoluteFill }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.mapOverlay, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: "map-outline", size: 48, color: constants_1.COLORS.textDim }) }), (0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: ['transparent', 'rgba(0,0,0,0.8)'], style: styles.bottomGradient }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.content, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.category, children: ride.category || 'Comfort' }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.date, children: ride.created_at || '' }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.row, children: [(0, jsx_runtime_1.jsxs)(GradientText_1.GradientText, { colors: constants_1.GRADIENTS.primary, style: styles.fare, children: ["R ", ((_a = ride.total_fare) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || '0.00'] }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.status, ride.status === 'cancelled' && styles.cancelled], children: ride.status === 'cancelled' ? 'Canceled' : ride.status })] })] })] }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        height: 160,
        borderRadius: constants_1.RADIUS.lg,
        overflow: 'hidden',
        marginBottom: constants_1.SPACING.base,
    },
    inner: {
        flex: 1,
        overflow: 'hidden',
    },
    mapOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: constants_1.SPACING.base,
    },
    category: {
        color: constants_1.COLORS.text,
        fontSize: 18,
        fontWeight: '700',
    },
    date: {
        color: constants_1.COLORS.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: constants_1.SPACING.sm,
    },
    fare: {
        fontSize: 16,
        fontWeight: '700',
    },
    status: {
        color: constants_1.COLORS.success,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    cancelled: {
        color: constants_1.COLORS.error,
    },
});
