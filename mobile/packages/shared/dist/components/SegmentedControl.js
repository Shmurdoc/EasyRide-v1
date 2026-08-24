"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentedControl = SegmentedControl;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
function SegmentedControl({ tabs, selected, onSelect, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const [width, setWidth] = (0, react_1.useState)(0);
    const translateX = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => {
        if (width > 0) {
            const idx = tabs.findIndex(t => t.key === selected);
            react_native_1.Animated.spring(translateX, {
                toValue: (width / tabs.length) * idx,
                useNativeDriver: true,
                damping: 15,
            }).start();
        }
    }, [selected, width, tabs.length]);
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: constants_1.RADIUS.md, padding: 2, position: 'relative' }, style], onLayout: (e) => setWidth(e.nativeEvent.layout.width), children: [(0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { style: [{
                        position: 'absolute', top: 2, bottom: 2, width: `${100 / tabs.length}%`,
                        backgroundColor: colors.surfaceLight, borderRadius: constants_1.RADIUS.sm,
                        transform: [{ translateX }],
                    }] }), tabs.map(tab => ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { onPress: () => onSelect(tab.key), style: { flex: 1, paddingVertical: 10, alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [typography.small, { fontWeight: selected === tab.key ? '600' : '400', color: selected === tab.key ? colors.primary : colors.textMuted }], children: tab.label }) }, tab.key)))] }));
}
