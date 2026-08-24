"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplashScreen = SplashScreen;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const constants_1 = require("../constants");
const useTranslation_1 = require("../i18n/useTranslation");
function SplashScreen({ onFinish, duration = 2000 }) {
    const { t } = (0, useTranslation_1.useTranslation)();
    const logoScale = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const logoOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const subtitleOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const dots = (0, react_1.useRef)([new react_native_1.Animated.Value(0.3), new react_native_1.Animated.Value(0.3), new react_native_1.Animated.Value(0.3)]).current;
    (0, react_1.useEffect)(() => {
        react_native_1.Animated.spring(logoScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 8,
            bounciness: 10,
        }).start();
        react_native_1.Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
        setTimeout(() => {
            react_native_1.Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }, 400);
        dots.forEach((dot, i) => {
            setTimeout(() => {
                react_native_1.Animated.loop(react_native_1.Animated.sequence([
                    react_native_1.Animated.timing(dot, { toValue: 1, duration: 600, useNativeDriver: true }),
                    react_native_1.Animated.timing(dot, { toValue: 0.3, duration: 600, useNativeDriver: true }),
                ])).start();
            }, i * 200);
        });
        const timer = setTimeout(() => {
            onFinish === null || onFinish === void 0 ? void 0 : onFinish();
        }, duration);
        return () => clearTimeout(timer);
    }, []);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [(0, jsx_runtime_1.jsx)(react_native_1.StatusBar, { barStyle: "light-content", backgroundColor: constants_1.COLORS.bg }), (0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: ['#0a0a0a', '#1a1a1a', '#0a0a0a'], style: react_native_1.StyleSheet.absoluteFill }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [
                    styles.logoContainer,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ], children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.logoIcon, children: [(0, jsx_runtime_1.jsx)(expo_linear_gradient_1.LinearGradient, { colors: [constants_1.COLORS.primary, constants_1.COLORS.primaryLight], style: react_native_1.StyleSheet.absoluteFill, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.Text, { style: styles.logoText, children: "E" })] }) }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.Text, { style: [styles.title, { opacity: logoOpacity }], children: t('app.name') }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.Text, { style: [styles.subtitle, { opacity: subtitleOpacity }], children: t('app.tagline') }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.dotsContainer, children: dots.map((dot, i) => ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [
                        styles.dot,
                        {
                            opacity: dot,
                            backgroundColor: constants_1.COLORS.primary,
                        },
                    ] }, i))) })] }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: constants_1.COLORS.bg,
    },
    logoContainer: {
        marginBottom: constants_1.SPACING.lg,
    },
    logoIcon: {
        width: 96,
        height: 96,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: constants_1.COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 15,
        overflow: 'hidden',
    },
    logoText: {
        fontSize: 48,
        fontWeight: '800',
        color: constants_1.COLORS.bg,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: constants_1.COLORS.text,
        letterSpacing: -0.5,
        marginBottom: constants_1.SPACING.sm,
    },
    subtitle: {
        fontSize: 16,
        color: constants_1.COLORS.textMuted,
        letterSpacing: 1,
    },
    dotsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 120,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
