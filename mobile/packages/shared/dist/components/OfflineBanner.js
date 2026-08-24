"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineBanner = OfflineBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const useNetworkStatus_1 = require("../hooks/useNetworkStatus");
function OfflineBanner() {
    const { isOnline } = (0, useNetworkStatus_1.useNetworkStatus)();
    if (isOnline)
        return null;
    return ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.container, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.text, children: "You're offline. Showing cached data." }) }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        backgroundColor: '#EF4444',
        paddingVertical: 6,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
