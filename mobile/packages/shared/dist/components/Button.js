"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, glow = false, icon, style, textStyle, }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const glowAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        if (glow && variant === 'primary' && !disabled) {
            const pulse = react_native_1.Animated.loop(react_native_1.Animated.sequence([
                react_native_1.Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                react_native_1.Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
            ]));
            pulse.start();
            return () => pulse.stop();
        }
    }, [glow, variant, disabled]);
    const handlePressIn = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    const handlePressOut = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    const sizeStyles = {
        sm: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, borderRadius: constants_1.RADIUS.sm },
        md: { paddingVertical: 14, paddingHorizontal: constants_1.SPACING.base, minHeight: 48, borderRadius: constants_1.RADIUS.md },
        lg: { paddingVertical: 18, paddingHorizontal: constants_1.SPACING.lg, minHeight: 56, borderRadius: constants_1.RADIUS.lg },
    };
    const textSizes = {
        sm: typography.button,
        md: typography.button,
        lg: typography.buttonLarge,
    };
    const glowStyle = variant === 'primary' && glow ? {
        shadowColor: constants_1.COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    } : {};
    const renderContent = () => ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: loading ? ((0, jsx_runtime_1.jsx)(react_native_1.ActivityIndicator, { size: "small", color: variant === 'primary' ? constants_1.COLORS.white : colors.primary })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [icon && (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: icon }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                        { color: variant === 'primary' ? constants_1.COLORS.white : colors.text },
                        textSizes[size],
                        icon ? { marginLeft: 8 } : {},
                        textStyle,
                    ], children: title })] })) }));
    if (variant === 'primary') {
        return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }, glowStyle], children: (0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { onPress: onPress, onPressIn: handlePressIn, onPressOut: handlePressOut, disabled: disabled || loading, activeOpacity: 1, style: [sizeStyles[size], style], children: [(0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: constants_1.GRADIENTS.primary, start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, style: [react_native_1.StyleSheet.absoluteFill, { borderRadius: sizeStyles[size].borderRadius }] }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [react_native_1.StyleSheet.absoluteFill, {
                                backgroundColor: constants_1.COLORS.primaryGlow,
                                borderRadius: sizeStyles[size].borderRadius,
                                opacity: glowAnim,
                            }] }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: renderContent() })] }) }));
    }
    if (variant === 'danger') {
        return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }], children: (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onPress, onPressIn: handlePressIn, onPressOut: handlePressOut, disabled: disabled || loading, activeOpacity: 1, style: [sizeStyles[size], { backgroundColor: constants_1.COLORS.error }, constants_1.SHADOWS.glowError, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, children: renderContent() }) }) }));
    }
    const variantStyles = {
        primary: { backgroundColor: colors.primary },
        secondary: {
            backgroundColor: constants_1.COLORS.surface,
            borderWidth: 1.5,
            borderColor: constants_1.COLORS.border,
        },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: constants_1.COLORS.error },
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }], children: (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onPress, onPressIn: handlePressIn, onPressOut: handlePressOut, disabled: disabled || loading, activeOpacity: 1, style: [sizeStyles[size], variantStyles[variant], style], children: (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, children: renderContent() }) }) }));
}
