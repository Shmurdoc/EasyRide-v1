"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaggeredList = StaggeredList;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
function StaggeredList({ children, staggerDelay = 80, style }) {
    const animValues = (0, react_1.useRef)(children.map(() => new react_native_1.Animated.Value(0))).current;
    (0, react_1.useEffect)(() => {
        const animations = animValues.map((anim, i) => react_native_1.Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 12,
            bounciness: 6,
            delay: i * staggerDelay,
        }));
        react_native_1.Animated.stagger(staggerDelay, animations).start();
    }, []);
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: style, children: children.map((child, i) => ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                opacity: animValues[i],
                transform: [
                    {
                        translateY: animValues[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [24, 0],
                        }),
                    },
                ],
            }, children: child }, i))) }));
}
