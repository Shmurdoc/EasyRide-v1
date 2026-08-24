"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressBar = ProgressBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
function ProgressBar({ progress, height = 4, color = constants_1.COLORS.primary, backgroundColor = constants_1.COLORS.surfaceLight, style, }) {
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{ height, backgroundColor, borderRadius: height / 2, overflow: 'hidden' }, style], children: (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { width: `${Math.min(Math.max(progress, 0), 100)}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 } }) }));
}
