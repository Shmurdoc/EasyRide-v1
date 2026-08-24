import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import { COLORS, GRADIENTS } from './colors';
import type { BusinessIdentity } from './BusinessIdentity';
import { BUSINESSES } from './BusinessIdentity';

interface BusinessThemeContextValue {
  brand: string;
  brandLight: string;
  brandDark: string;
  gradient: readonly [string, string];
  gradientFull: readonly [string, string, string];
  accent: string;
  business: BusinessIdentity;
  setActiveBusiness: (id: string) => void;
  gradientStyle: { colors: readonly [string, string] };
}

const defaultBusiness: BusinessIdentity = {
  id: 'easyryde',
  name: 'EasyRyde',
  type: 'service',
  primaryColor: COLORS.brand,
  gradientStart: COLORS.brandDark,
  gradientEnd: COLORS.brandLight,
  accentColor: COLORS.brandLight,
  logoUrl: 'https://easyryde.co.za/logos/easyryde.png',
  tagline: 'Your whole town, in one app',
};

const BusinessThemeContext = createContext<BusinessThemeContextValue>({
  brand: COLORS.brand,
  brandLight: COLORS.brandLight,
  brandDark: COLORS.brandDark,
  gradient: GRADIENTS.primary,
  gradientFull: GRADIENTS.brandFull,
  accent: COLORS.brandLight,
  business: defaultBusiness,
  setActiveBusiness: () => {},
  gradientStyle: { colors: GRADIENTS.primary },
});

interface BusinessThemeProviderProps {
  business?: BusinessIdentity;
  initialBusinessId?: string;
  children: React.ReactNode;
}

export function BusinessThemeProvider({
  business: initialBusiness,
  initialBusinessId,
  children,
}: BusinessThemeProviderProps) {
  const resolvedInitial = useMemo(() => {
    if (initialBusiness) return initialBusiness;
    if (initialBusinessId) {
      const found = BUSINESSES.find((b) => b.id === initialBusinessId);
      if (found) return found;
    }
    return defaultBusiness;
  }, [initialBusiness, initialBusinessId]);

  const [activeBusiness, setActiveBusinessState] = useState<BusinessIdentity>(resolvedInitial);

  const setActiveBusiness = useCallback((id: string) => {
    const found = BUSINESSES.find((b) => b.id === id);
    if (found) setActiveBusinessState(found);
  }, []);

  const value = useMemo<BusinessThemeContextValue>(() => {
    const b = activeBusiness;
    return {
      brand: b.primaryColor,
      brandLight: b.gradientEnd,
      brandDark: b.gradientStart,
      gradient: [b.gradientStart, b.gradientEnd] as const,
      gradientFull: [b.gradientStart, b.primaryColor, b.gradientEnd] as const,
      accent: b.accentColor,
      business: b,
      setActiveBusiness,
      gradientStyle: { colors: [b.gradientStart, b.gradientEnd] as [string, string] },
    };
  }, [activeBusiness, setActiveBusiness]);

  return (
    <BusinessThemeContext.Provider value={value}>
      {children}
    </BusinessThemeContext.Provider>
  );
}

export function useBusinessTheme() {
  return useContext(BusinessThemeContext);
}
