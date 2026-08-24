"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryTile = CategoryTile;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const vector_icons_1 = require("@expo/vector-icons");
const constants_1 = require("../constants");
function CategoryTile({ label, icon = 'car-outline', badge, selected = false, onPress, style, }) {
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const handlePressIn = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    const handlePressOut = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }] }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onPress, onPressIn: handlePressIn, onPressOut: handlePressOut, activeOpacity: 1, style: styles.container, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.inner, selected && styles.innerSelected], children: [(0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: [constants_1.COLORS.tileBg, constants_1.COLORS.warmBg], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: react_native_1.StyleSheet.absoluteFill }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.iconArea, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: icon, size: 36, color: selected ? constants_1.COLORS.primary : constants_1.COLORS.textMuted }) }), badge ? ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.badge, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.badgeText, children: badge }) })) : null, (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.label, selected && styles.labelSelected], children: label })] }) }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        aspectRatio: 1.1,
    },
    inner: {
        flex: 1,
        borderRadius: constants_1.RADIUS.tile,
        borderWidth: 1,
        borderColor: constants_1.COLORS.tileBorder,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        padding: constants_1.SPACING.md,
    },
    innerSelected: {
        borderColor: constants_1.COLORS.primary,
        shadowColor: constants_1.COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    iconArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: constants_1.SPACING.sm,
    },
    badge: {
        position: 'absolute',
        top: constants_1.SPACING.sm,
        right: constants_1.SPACING.sm,
        backgroundColor: constants_1.COLORS.primary,
        paddingHorizontal: constants_1.SPACING.sm,
        paddingVertical: 3,
        borderRadius: constants_1.RADIUS.full,
    },
    badgeText: {
        color: constants_1.COLORS.bg,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    label: {
        color: constants_1.COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    labelSelected: {
        color: constants_1.COLORS.primary,
    },
});
