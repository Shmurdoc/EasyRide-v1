"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlowButton = GlowButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
let LinearGradient = null;
try {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
}
catch (_a) { }
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function GlowButton({ title, onPress, size = 'md', disabled, loading, icon, glowColor = constants_1.COLORS.primary, style, textStyle, }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const glowAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0.3)).current;
    const innerGlow = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        if (!disabled) {
            const pulse = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                react_native_1.Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
            ]));
            pulse.start();
            return () => pulse.stop();
        }
    }, [disabled]);
    const handlePressIn = () => {
        try {
            react_native_1.Vibration.vibrate(10);
        }
        catch (_a) { }
        react_native_1.Animated.parallel([
            react_native_1.Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }),
            react_native_1.Animated.timing(innerGlow, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    };
    const handlePressOut = () => {
        react_native_1.Animated.parallel([
            react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
            react_native_1.Animated.timing(innerGlow, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    };
    const handlePress = react_1.default.useCallback(() => {
        if (disabled || loading)
            return;
        onPress === null || onPress === void 0 ? void 0 : onPress();
    }, [disabled, loading, onPress]);
    const sizeStyles = {
        sm: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44, borderRadius: constants_1.RADIUS.sm },
        md: { paddingVertical: 16, paddingHorizontal: constants_1.SPACING.base, minHeight: 52, borderRadius: constants_1.RADIUS.md },
        lg: { paddingVertical: 20, paddingHorizontal: constants_1.SPACING.lg, minHeight: 60, borderRadius: constants_1.RADIUS.lg },
    };
    const textSizes = {
        sm: typography.button,
        md: typography.button,
        lg: typography.buttonLarge,
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowAnim,
            shadowRadius: 24,
            elevation: 12,
        }, children: (0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { onPress: handlePress, onPressIn: handlePressIn, onPressOut: handlePressOut, disabled: disabled || loading, activeOpacity: 1, style: [sizeStyles[size], { overflow: 'hidden' }, style], children: [LinearGradient ? ((0, jsx_runtime_1.jsx)(LinearGradient, { colors: [glowColor, glowColor], start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, style: [react_native_1.StyleSheet.absoluteFill, { borderRadius: sizeStyles[size].borderRadius }] })) : ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [react_native_1.StyleSheet.absoluteFill, { backgroundColor: glowColor, borderRadius: sizeStyles[size].borderRadius }] })), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [
                        react_native_1.StyleSheet.absoluteFill,
                        {
                            backgroundColor: constants_1.COLORS.white,
                            borderRadius: sizeStyles[size].borderRadius,
                            opacity: innerGlow,
                        },
                    ] }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }, children: loading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { size: "small", color: constants_1.COLORS.white })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [icon, (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                                    { color: constants_1.COLORS.white, marginLeft: icon ? 8 : 0 },
                                    textSizes[size],
                                    textStyle,
                                ], children: title })] })) })] }) }));
}
