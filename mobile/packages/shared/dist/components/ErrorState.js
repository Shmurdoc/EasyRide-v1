"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorState = ErrorState;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const constants_1 = require("../constants");
const useTranslation_1 = require("../i18n/useTranslation");
const Button_1 = require("./Button");
function ErrorState({ message, onRetry, style }) {
    const { colors, typography } = (0, theme_1.useTheme)();
    const { t } = (0, useTranslation_1.useTranslation)();
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: constants_1.SPACING.xl }, style], children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.error, textAlign: 'center' }, typography.h3], children: t('errors.somethingWentWrong') }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [{ color: colors.textMuted, textAlign: 'center', marginTop: constants_1.SPACING.sm }, typography.body], children: message }), onRetry && ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: { marginTop: constants_1.SPACING.lg }, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { title: t('common.tryAgain'), onPress: onRetry, variant: "secondary" }) }))] }));
}
