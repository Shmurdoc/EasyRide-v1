"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimatedCheckmark = AnimatedCheckmark;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
function AnimatedCheckmark({ size = 80, color = constants_1.COLORS.success, duration = 600, }) {
    const circleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const checkAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        react_native_1.Animated.sequence([
            react_native_1.Animated.timing(circleAnim, {
                toValue: 1,
                duration: duration * 0.5,
                useNativeDriver: true,
            }),
            react_native_1.Animated.spring(checkAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 8,
                bounciness: 6,
            }),
        ]).start();
    }, []);
    const strokeDasharray = size * 2.2;
    const circleRadius = size * 0.4;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const checkSize = size * 0.5;
    const checkOffset = size * 0.25;
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { width: size, height: size, justifyContent: 'center', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [
                    styles.circle,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: color,
                        borderWidth: 3,
                        opacity: circleAnim,
                        transform: [
                            {
                                scale: circleAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3, 1],
                                }),
                            },
                        ],
                    },
                ] }), (0, jsx_runtime_1.jsxs)(react_native_1.Animated.View, { style: [
                    styles.checkContainer,
                    {
                        opacity: checkAnim,
                        transform: [{ scale: checkAnim }],
                    },
                ], children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
                            styles.checkLine1,
                            {
                                width: checkSize * 0.5,
                                height: 3,
                                backgroundColor: color,
                                borderRadius: 1.5,
                                transform: [{ rotate: '-45deg' }, { translateX: 2 }, { translateY: 1 }],
                            },
                        ] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [
                            styles.checkLine2,
                            {
                                width: checkSize * 0.8,
                                height: 3,
                                backgroundColor: color,
                                borderRadius: 1.5,
                                transform: [{ rotate: '45deg' }, { translateX: -4 }, { translateY: -1 }],
                            },
                        ] })] })] }));
}
const styles = react_native_1.StyleSheet.create({
    circle: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkLine1: {
        position: 'absolute',
    },
    checkLine2: {
        position: 'absolute',
    },
});
