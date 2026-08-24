"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const constants_1 = require("../constants");
const i18n_1 = require("../i18n");
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.handleRetry = () => {
            this.setState({ hasError: false, error: null });
        };
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        var _a, _b;
        console.warn('ErrorBoundary caught:', error.message, errorInfo.componentStack);
        (_b = (_a = this.props).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error, errorInfo);
    }
    render() {
        var _a;
        if (this.state.hasError) {
            if (this.props.fallback)
                return this.props.fallback;
            return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.container, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.title, children: (0, i18n_1.t)('errors.somethingWentWrong') }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.message, children: ((_a = this.state.error) === null || _a === void 0 ? void 0 : _a.message) || (0, i18n_1.t)('errors.unexpectedError') }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { style: styles.button, onPress: this.handleRetry, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.buttonText, children: (0, i18n_1.t)('common.tryAgain') }) })] }));
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: constants_1.COLORS.bg, padding: constants_1.SPACING.xl },
    title: { color: constants_1.COLORS.primary, fontSize: 20, fontWeight: '700', marginBottom: constants_1.SPACING.sm, textAlign: 'center' },
    message: { color: constants_1.COLORS.textMuted, fontSize: 14, textAlign: 'center', marginBottom: constants_1.SPACING.lg },
    button: { backgroundColor: constants_1.COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: constants_1.RADIUS.md },
    buttonText: { color: constants_1.COLORS.bg, fontSize: 16, fontWeight: '600' },
});
