"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = Modal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
const { height: SCREEN_HEIGHT } = react_native_1.Dimensions.get('window');
function Modal({ visible, onClose, title, children, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const opacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const translateY = (0, react_1.useRef)(new react_native_1.Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        if (visible) {
            react_native_1.Animated.parallel([
                react_native_1.Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                react_native_1.Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 8 }),
            ]).start();
        }
        else {
            react_native_1.Animated.parallel([
                react_native_1.Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                react_native_1.Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.Modal, { visible: visible, transparent: true, animationType: "none", onRequestClose: onClose, children: [(0, jsx_runtime_1.jsx)(react_native_1.Pressable, { style: { flex: 1 }, onPress: onClose, children: (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: {
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        opacity: backdropOpacity,
                    } }) }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        maxHeight: '85%',
                        transform: [{ translateY }],
                    }], children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: {
                        backgroundColor: constants_1.COLORS.surface,
                        borderTopLeftRadius: constants_1.RADIUS.xl,
                        borderTopRightRadius: constants_1.RADIUS.xl,
                        borderWidth: 1,
                        borderColor: constants_1.COLORS.borderLight,
                        borderBottomWidth: 0,
                        overflow: 'hidden',
                    }, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: {
                                width: 40,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: constants_1.COLORS.textDim,
                                alignSelf: 'center',
                                marginTop: constants_1.SPACING.sm,
                                marginBottom: constants_1.SPACING.md,
                            } }), (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { padding: constants_1.SPACING.lg, paddingBottom: constants_1.SPACING['2xl'] }, children: [title && ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [
                                        { color: colors.text, marginBottom: constants_1.SPACING.base },
                                        typography.h3,
                                    ], children: title })), children] })] }) })] }));
}
