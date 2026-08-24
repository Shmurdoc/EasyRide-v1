"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlassCard = GlassCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
function GlassCard({ children, padding = constants_1.SPACING.base, glow = false, glowColor = constants_1.COLORS.primary, style, }) {
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const handlePressIn = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    const handlePressOut = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [
            { transform: [{ scale: scaleAnim }] },
            constants_1.SHADOWS.subtle,
            glow ? {
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 8,
            } : {},
        ], children: (0, jsx_runtime_1.jsx)(react_native_1.View, { onStartShouldSetResponder: () => true, onResponderGrant: handlePressIn, onResponderRelease: handlePressOut, style: [{
                    padding,
                    borderRadius: constants_1.RADIUS.xl,
                    backgroundColor: constants_1.COLORS.surface,
                    borderWidth: 1,
                    borderColor: constants_1.COLORS.surfaceBorder,
                    overflow: 'hidden',
                }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { position: 'relative' }, children: children }) }) }));
}
