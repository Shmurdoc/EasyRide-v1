import React from 'react';
import type { BusinessTheme, BusinessSlug } from './businessThemes';
import type { BusinessIdentity } from '../types/business';
interface BusinessThemeContextValue {
    activeTheme: BusinessTheme;
    business: BusinessIdentity | null;
    isPlatformTheme: boolean;
    slug: BusinessSlug | null;
}
export declare function BusinessThemeProvider({ slug, business, children, }: {
    slug?: BusinessSlug;
    business?: BusinessIdentity;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useBusinessTheme(): BusinessThemeContextValue;
export { BusinessTheme, BusinessSlug };
