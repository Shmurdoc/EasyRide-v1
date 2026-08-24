"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessThemeProvider = BusinessThemeProvider;
exports.useBusinessTheme = useBusinessTheme;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const businessThemes_1 = require("./businessThemes");
const defaultTheme = businessThemes_1.BUSINESS_THEMES.rides;
const BusinessThemeContext = (0, react_1.createContext)({
    activeTheme: defaultTheme,
    business: null,
    isPlatformTheme: true,
    slug: 'rides',
});
function BusinessThemeProvider({ slug = 'rides', business, children, }) {
    const theme = businessThemes_1.BUSINESS_THEMES[slug] || defaultTheme;
    const value = {
        activeTheme: theme,
        business: business || null,
        isPlatformTheme: !business,
        slug: business ? null : slug,
    };
    return ((0, jsx_runtime_1.jsx)(BusinessThemeContext.Provider, { value: value, children: children }));
}
function useBusinessTheme() {
    return (0, react_1.useContext)(BusinessThemeContext);
}
