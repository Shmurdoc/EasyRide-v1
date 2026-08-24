"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shimmer = Shimmer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const constants_1 = require("../constants");
function Shimmer({ width = '100%', height = 16, borderRadius = constants_1.RADIUS.sm, variant = 'default', style, }) {
    const shimmerAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        const shimmer = react_native_1.Animated.loop(react_native_1.Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }));
        shimmer.start();
        return () => shimmer.stop();
    }, []);
    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });
    const colors = variant === 'gold'
        ? ['rgba(212,175,55,0)', 'rgba(212,175,55,0.12)', 'rgba(212,175,55,0)']
        : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'];
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{
                width,
                height,
                borderRadius,
                backgroundColor: variant === 'gold' ? 'rgba(212,175,55,0.05)' : constants_1.COLORS.surface,
                overflow: 'hidden',
            }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateX }],
            }, children: (0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: colors, start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, style: { flex: 1 } }) }) }));
}
