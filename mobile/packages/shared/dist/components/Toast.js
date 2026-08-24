"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toast = Toast;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Toast({ visible, message, type = 'info', duration = 3000, onHide, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const translateY = (0, react_1.useRef)(new react_native_1.Animated.Value(-100)).current;
    const opacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0.9)).current;
    (0, react_1.useEffect)(() => {
        if (visible) {
            react_native_1.Animated.parallel([
                react_native_1.Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 10 }),
                react_native_1.Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
            ]).start(() => {
                setTimeout(() => {
                    react_native_1.Animated.parallel([
                        react_native_1.Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
                        react_native_1.Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]).start(() => onHide());
                }, duration);
            });
        }
    }, [visible]);
    if (!visible)
        return null;
    const configs = {
        success: { bg: constants_1.COLORS.success, icon: '✓', glow: constants_1.SHADOWS.glowSuccess },
        error: { bg: constants_1.COLORS.error, icon: '✕', glow: constants_1.SHADOWS.glowError },
        info: { bg: constants_1.COLORS.surfaceElevated, icon: 'ℹ', glow: constants_1.SHADOWS.moderate },
    };
    const config = configs[type];
    return ((0, jsx_runtime_1.jsxs)(react_native_1.Animated.View, { style: [{
                position: 'absolute',
                top: react_native_1.Platform.OS === 'ios' ? 60 : 40,
                left: constants_1.SPACING.base,
                right: constants_1.SPACING.base,
                backgroundColor: config.bg,
                borderRadius: constants_1.RADIUS.lg,
                padding: constants_1.SPACING.base,
                opacity,
                transform: [{ translateY }, { scale: scaleAnim }],
                zIndex: 1000,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: type === 'info' ? 1 : 0,
                borderColor: constants_1.COLORS.borderLight,
            }, config.glow, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: {
                    fontSize: 18,
                    fontWeight: '700',
                    color: type === 'info' ? constants_1.COLORS.primary : constants_1.COLORS.white,
                    marginRight: constants_1.SPACING.sm,
                }, children: config.icon }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                    { color: type === 'info' ? colors.text : constants_1.COLORS.white, flex: 1 },
                    typography.bodySmall,
                ], children: message })] }));
}
