"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Card({ children, variant = 'default', padding = constants_1.SPACING.base, style }) {
    const { colors } = (0, theme_1.useTheme)();
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const handlePressIn = () => {
        if (variant === 'interactive' || variant === 'glass') {
            react_native_1.Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }
    };
    const handlePressOut = () => {
        if (variant === 'interactive' || variant === 'glass') {
            react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }
    };
    if (variant === 'glass') {
        return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }] }], children: (0, jsx_runtime_1.jsx)(react_native_1.View, { onStartShouldSetResponder: () => true, onResponderGrant: handlePressIn, onResponderRelease: handlePressOut, style: [{
                        padding,
                        borderRadius: constants_1.RADIUS.lg,
                        backgroundColor: constants_1.COLORS.glass,
                        borderWidth: 1,
                        borderColor: constants_1.COLORS.glassBorder,
                        overflow: 'hidden',
                    }, constants_1.SHADOWS.moderate, style], children: children }) }));
    }
    if (variant === 'elevated') {
        return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{
                    padding,
                    borderRadius: constants_1.RADIUS.lg,
                    overflow: 'hidden',
                }, constants_1.SHADOWS.elevated, style], children: [(0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: constants_1.GRADIENTS.surface, start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: [react_native_1.StyleSheet.absoluteFill, { borderRadius: constants_1.RADIUS.lg }] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { borderWidth: 1, borderColor: constants_1.COLORS.border, borderRadius: constants_1.RADIUS.lg, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { position: 'relative' }, children: children })] }));
    }
    const base = {
        backgroundColor: colors.surface,
        borderRadius: constants_1.RADIUS.lg,
        padding,
        borderWidth: 1,
        borderColor: constants_1.COLORS.border,
    };
    const variants = {
        default: {},
        raised: Object.assign({}, constants_1.SHADOWS.moderate),
        interactive: {},
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [base, variants[variant], style], children: children }));
}
