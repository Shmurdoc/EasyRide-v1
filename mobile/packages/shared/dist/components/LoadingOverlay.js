"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingOverlay = LoadingOverlay;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function LoadingOverlay({ message, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const pulseAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0.4)).current;
    const rotateAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        const pulse = react_native_1.Animated.loop(react_native_1.Animated.sequence([
            react_native_1.Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            react_native_1.Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ]));
        const rotate = react_native_1.Animated.loop(react_native_1.Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true }));
        pulse.start();
        rotate.start();
        return () => { pulse.stop(); rotate.stop(); };
    }, []);
    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: constants_1.COLORS.bg,
            }, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 3,
                    borderColor: 'transparent',
                    borderTopColor: constants_1.COLORS.primary,
                    borderRightColor: constants_1.COLORS.primaryLight,
                    transform: [{ rotate: spin }],
                    opacity: pulseAnim,
                } }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{
                        position: 'absolute',
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: constants_1.COLORS.primaryGlow,
                        opacity: pulseAnim,
                    }, constants_1.SHADOWS.glow] }), message && ((0, jsx_runtime_1.jsx)(react_native_1.Animated.Text, { style: [
                    { color: colors.textMuted, marginTop: 24, letterSpacing: 1 },
                    typography.body,
                    { opacity: pulseAnim },
                ], children: message }))] }));
}
