"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconnectionBanner = ReconnectionBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
function ReconnectionBanner({ isReconnecting, reconnectAttempt }) {
    if (!isReconnecting)
        return null;
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.container, children: (0, jsx_runtime_1.jsxs)(react_native_1.Text, { style: styles.text, children: ["Reconnecting", reconnectAttempt > 0 ? ` (attempt ${reconnectAttempt})` : '', "..."] }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        backgroundColor: '#F59E0B',
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    text: {
        color: '#1A1A1A',
        fontSize: 13,
        fontWeight: '600',
    },
});
