"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Divider = Divider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
function Divider({ style }) {
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: [{ height: 1, backgroundColor: constants_1.COLORS.border, marginVertical: constants_1.SPACING.md }, style] }));
}
