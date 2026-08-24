"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickActionButton = QuickActionButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const constants_1 = require("../constants");
function QuickActionButton({ icon, label, onPress, style, }) {
    const scaleAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    const handlePressIn = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    const handlePressOut = () => {
        react_native_1.Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    };
    return ((0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{ transform: [{ scale: scaleAnim }] }, style], children: (0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { onPress: onPress, onPressIn: handlePressIn, onPressOut: handlePressOut, activeOpacity: 1, style: styles.container, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.circle, children: (0, jsx_runtime_1.jsx)(vector_icons_1.Ionicons, { name: icon, size: 28, color: constants_1.COLORS.primary }) }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.label, children: label })] }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    circle: Object.assign({ width: 64, height: 64, borderRadius: 32, backgroundColor: constants_1.COLORS.surface, borderWidth: 1.5, borderColor: constants_1.COLORS.glassBorder, justifyContent: 'center', alignItems: 'center', marginBottom: constants_1.SPACING.sm }, constants_1.SHADOWS.subtle),
    label: {
        color: constants_1.COLORS.text,
        fontSize: 13,
        fontWeight: '500',
    },
});
