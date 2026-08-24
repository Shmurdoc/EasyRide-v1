import React, { createContext, useContext } from 'react';
import { COLORS, GRADIENTS } from '../constants';
import { BUSINESS_THEMES } from './businessThemes';
import type { BusinessTheme, BusinessSlug } from './businessThemes';
import type { BusinessIdentity } from '../types/business';

interface BusinessThemeContextValue {
  activeTheme: BusinessTheme;
  business: BusinessIdentity | null;
  isPlatformTheme: boolean;
  slug: BusinessSlug | null;
}

const defaultTheme = BUSINESS_THEMES.rides;

const BusinessThemeContext = createContext<BusinessThemeContextValue>({
  activeTheme: defaultTheme,
  business: null,
  isPlatformTheme: true,
  slug: 'rides',
});

export function BusinessThemeProvider({
  slug = 'rides',
  business,
  children,
}: {
  slug?: BusinessSlug;
  business?: BusinessIdentity;
  children: React.ReactNode;
}) {
  const theme = BUSINESS_THEMES[slug] || defaultTheme;

  const value: BusinessThemeContextValue = {
    activeTheme: theme,
    business: business || null,
    isPlatformTheme: !business,
    slug: business ? null : slug,
  };

  return (
    <BusinessThemeContext.Provider value={value}>
      {children}
    </BusinessThemeContext.Provider>
  );
}

export function useBusinessTheme(): BusinessThemeContextValue {
  return useContext(BusinessThemeContext);
}

export { BusinessTheme, BusinessSlug };
