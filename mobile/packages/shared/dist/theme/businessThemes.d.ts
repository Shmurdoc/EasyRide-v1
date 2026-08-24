export interface BusinessThemeColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    gradient: readonly [string, string];
    gradientLight: readonly [string, string, string];
    gradientDark: readonly [string, string];
    glow: string;
    tabActive: string;
    tabInactive: string;
    badge: string;
    badgeText: string;
    marker: string;
    sos: string;
    earn: string;
    surface: string;
    surfaceLight: string;
    surfaceBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    bg: string;
}
export interface BusinessLogo {
    icon: string;
    text: string;
    mark: string;
    full: string;
}
export interface BusinessBranding {
    tagline: string;
    keywords: string[];
}
export interface BusinessTheme {
    id: string;
    name: string;
    slug: string;
    colors: BusinessThemeColors;
    logo: BusinessLogo;
    branding: BusinessBranding;
}
export type BusinessSlug = 'rides' | 'food';
export declare const BUSINESS_THEMES: Record<BusinessSlug, BusinessTheme>;
export declare function getBusinessTheme(slug: BusinessSlug): BusinessTheme;
export type { BusinessSlug as BusinessSlugType };
