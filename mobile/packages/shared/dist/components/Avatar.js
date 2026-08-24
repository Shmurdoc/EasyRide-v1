"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Avatar = Avatar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
function Avatar({ name, size = 44, uri, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const initial = name.charAt(0).toUpperCase();
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center',
            }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.primary, fontWeight: '700', fontSize: size * 0.4 }], children: initial }) }));
}
