"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimatedNumber = AnimatedNumber;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
const GradientText_1 = require("./GradientText");
function AnimatedNumber({ value, duration = 800, prefix = '', suffix = '', decimals = 0, useGradient = false, gradientColors = constants_1.GRADIENTS.primary, style, haptic = false, }) {
    const { typography, colors } = (0, theme_1.useTheme)();
    const animatedValue = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const displayValue = (0, react_1.useRef)('0');
    const prevValue = (0, react_1.useRef)(0);
    const finishIdRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const listenerId = animatedValue.addListener(({ value: val }) => {
            displayValue.current = val.toFixed(decimals);
        });
        if (haptic && value !== prevValue.current) {
            finishIdRef.current = animatedValue.addListener(({ value: val }) => {
                if (Math.abs(val - value) < 0.01) {
                    react_native_1.Vibration.vibrate(10);
                    if (finishIdRef.current) {
                        animatedValue.removeListener(finishIdRef.current);
                        finishIdRef.current = null;
                    }
                }
            });
        }
        react_native_1.Animated.timing(animatedValue, {
            toValue: value,
            duration,
            useNativeDriver: false,
        }).start();
        prevValue.current = value;
        return () => {
            animatedValue.removeListener(listenerId);
            if (finishIdRef.current) {
                animatedValue.removeListener(finishIdRef.current);
                finishIdRef.current = null;
            }
        };
    }, [value, duration, decimals]);
    const text = `${prefix}${displayValue.current}${suffix}`;
    if (useGradient) {
        return ((0, jsx_runtime_1.jsx)(GradientText_1.GradientText, { colors: gradientColors, style: [typography.price, style], children: text }));
    }
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.Text, { style: [typography.price, { color: colors.text }, style], children: text }));
}
