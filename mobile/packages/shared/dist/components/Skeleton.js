"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skeleton = Skeleton;
exports.SkeletonCard = SkeletonCard;
exports.SkeletonCircle = SkeletonCircle;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const constants_1 = require("../constants");
function Skeleton({ width = '100%', height = 16, borderRadius = constants_1.RADIUS.sm, style }) {
    const shimmerAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        const shimmer = react_native_1.Animated.loop(react_native_1.Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }));
        shimmer.start();
        return () => shimmer.stop();
    }, []);
    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    });
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{
                width,
                height,
                borderRadius,
                backgroundColor: constants_1.COLORS.surface,
                overflow: 'hidden',
            }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateX }],
            }, children: (0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'], start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, style: { flex: 1 } }) }) }));
}
function SkeletonCard({ style }) {
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{
                backgroundColor: constants_1.COLORS.surface,
                borderRadius: constants_1.RADIUS.lg,
                padding: constants_1.SPACING.base,
                gap: constants_1.SPACING.md,
                borderWidth: 1,
                borderColor: constants_1.COLORS.border,
            }, style], children: [(0, jsx_runtime_1.jsx)(Skeleton, { width: "50%", height: 20, borderRadius: constants_1.RADIUS.sm }), (0, jsx_runtime_1.jsx)(Skeleton, { width: "100%", height: 14, borderRadius: constants_1.RADIUS.xs }), (0, jsx_runtime_1.jsx)(Skeleton, { width: "75%", height: 14, borderRadius: constants_1.RADIUS.xs }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flexDirection: 'row', gap: constants_1.SPACING.sm, marginTop: constants_1.SPACING.sm }, children: [(0, jsx_runtime_1.jsx)(Skeleton, { width: 80, height: 32, borderRadius: constants_1.RADIUS.full }), (0, jsx_runtime_1.jsx)(Skeleton, { width: 60, height: 32, borderRadius: constants_1.RADIUS.full })] })] }));
}
function SkeletonCircle({ size = 48, style }) {
    return (0, jsx_runtime_1.jsx)(Skeleton, { width: size, height: size, borderRadius: size / 2, style: style });
}
