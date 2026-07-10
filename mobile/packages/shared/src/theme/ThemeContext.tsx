import React, { createContext, useContext } from 'react';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BORDERS, ANIMATION, Z_INDEX } from '../constants';

export const theme = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  borders: BORDERS,
  animation: ANIMATION,
  zIndex: Z_INDEX,
} as const;

export type Theme = typeof theme;

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
