// EasyRyde Enterprise Design System
// Single confident orange accent (#FF6A00), true-black ink, white canvas.
// Light is the default; a dark theme ships alongside it. No rainbow, no green.
import { COLORS } from '../constants';

export type ThemeMode = 'light' | 'dark';

// ---------------------------------------------------------------------------
// Color primitives
// ---------------------------------------------------------------------------
const ORANGE = '#FF6A00';
const ORANGE_STRONG = '#E25500'; // AA text-on-white
const ORANGE_SOFT = '#FFF1E6'; // tint

const INK = '#0B0B0C';
const INK_2 = '#3C3C43';
const MUTED = '#86868B';
const LINE = '#ECECEE';

const SUCCESS = '#1F9D55';
const DANGER = '#E5484D';
const WARNING = '#E8920C';
const INFO = '#2E6BF0';

// ---------------------------------------------------------------------------
// Semantic color tokens per mode
// ---------------------------------------------------------------------------
export interface ThemeColors {
  mode: ThemeMode;
  // canvas
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  // text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  // lines
  border: string;
  borderStrong: string;
  // brand
  brand: string;
  brandStrong: string;
  brandSoft: string;
  brandContrast: string; // text that sits on brand fill
  // primary action (the "black" of orange/white/black)
  action: string;
  actionHover: string;
  onAction: string; // text on action fill
  // semantic
  success: string;
  danger: string;
  error: string; // alias of danger for shared components
  warning: string;
  info: string;
  // overlays
  overlay: string;
  scrim: string;
  // focus ring
  focusRing: string;
  // glass
  glass: string;
  glassBorder: string;
  // ---- legacy aliases (kept so existing components keep working) ----
  primary: string;
  primaryLight: string;
  primaryDark: string;
  white: string;
  black: string;
  surfaceLight: string;
  gradient: string;
  gradientLight: string;
  gradientDark: string;
}

export const lightColors: ThemeColors = {
  mode: 'light',
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F6',
  text: INK,
  textSecondary: INK_2,
  textMuted: MUTED,
  textInverse: '#FFFFFF',
  border: LINE,
  borderStrong: '#DADADD',
  brand: ORANGE,
  brandStrong: ORANGE_STRONG,
  brandSoft: ORANGE_SOFT,
  brandContrast: '#FFFFFF',
  action: INK,
  actionHover: '#262629',
  onAction: '#FFFFFF',
  success: SUCCESS,
  danger: DANGER,
  error: DANGER,
  warning: WARNING,
  info: INFO,
  overlay: 'rgba(11,11,12,0.42)',
  scrim: 'rgba(11,11,12,0.06)',
  focusRing: 'rgba(255,106,0,0.55)',
  glass: 'rgba(255,255,255,0.82)',
  glassBorder: 'rgba(255,255,255,0.9)',
  primary: INK,
  primaryLight: ORANGE,
  primaryDark: ORANGE_STRONG,
  white: '#FFFFFF',
  black: INK,
  surfaceLight: '#F5F5F6',
  gradient: ORANGE,
  gradientLight: ORANGE_STRONG,
  gradientDark: INK,
};

export const darkColors: ThemeColors = {
  mode: 'dark',
  bg: '#0B0B0C',
  bgElevated: '#141416',
  surface: '#161618',
  surfaceAlt: '#202024',
  text: '#FFFFFF',
  textSecondary: '#C7C7CC',
  textMuted: '#8A8A8F',
  textInverse: '#0B0B0C',
  border: '#2A2A2E',
  borderStrong: '#3A3A40',
  brand: ORANGE,
  brandStrong: ORANGE_STRONG,
  brandSoft: 'rgba(255,106,0,0.14)',
  brandContrast: '#0B0B0C',
  action: '#FFFFFF',
  actionHover: '#ECECEE',
  onAction: '#0B0B0C',
  success: '#3FCF7C',
  danger: '#FF6B70',
  error: '#FF6B70',
  warning: '#FFB13D',
  info: '#5C8BFF',
  overlay: 'rgba(0,0,0,0.6)',
  scrim: 'rgba(255,255,255,0.06)',
  focusRing: 'rgba(255,106,0,0.6)',
  glass: 'rgba(22,22,24,0.82)',
  glassBorder: 'rgba(255,255,255,0.1)',
  primary: '#FFFFFF',
  primaryLight: ORANGE,
  primaryDark: ORANGE_STRONG,
  white: '#FFFFFF',
  black: '#0B0B0C',
  surfaceLight: '#202024',
  gradient: ORANGE,
  gradientLight: ORANGE_STRONG,
  gradientDark: ORANGE_STRONG,
};

// ---------------------------------------------------------------------------
// Radius — disciplined scale (max 20px). No 40px pills on primary surfaces.
// ---------------------------------------------------------------------------
export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  tile: 18,
  sheet: 28,
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4pt grid
// ---------------------------------------------------------------------------
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 28,
  '2xl': 40,
  '3xl': 56,
} as const;

// ---------------------------------------------------------------------------
// Typography — Inter for UI, Poppins for display. Tight, confident.
// ---------------------------------------------------------------------------
export const TYPOGRAPHY = {
  display: { fontFamily: 'Poppins_800ExtraBold', fontSize: 30, lineHeight: 34, letterSpacing: -0.4 },
  hero: { fontFamily: 'Poppins_700Bold', fontSize: 24, lineHeight: 29, letterSpacing: -0.3 },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  h2: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, lineHeight: 22 },
  h3: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 20 },
  section: { fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 21 },
  bodyLg: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  bodySemi: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  small: { fontFamily: 'Inter_500Medium', fontSize: 12.5, lineHeight: 17 },
  xs: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 15 },
  micro: { fontFamily: 'Inter_700Bold', fontSize: 9.5, lineHeight: 13 },
  price: { fontFamily: 'Poppins_700Bold', fontSize: 18, lineHeight: 23 },
  priceLg: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  eta: { fontFamily: 'Poppins_800ExtraBold', fontSize: 42, lineHeight: 44, letterSpacing: -1 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  button: { fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20 },
  buttonLg: { fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 21, letterSpacing: 0.3 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  // legacy aliases
  h4: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 19 },
  bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  buttonLarge: { fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 21, letterSpacing: 0.3 },
};

// ---------------------------------------------------------------------------
// Shadows — restrained. Max blur 18px, no colored glows on primary surfaces.
// ---------------------------------------------------------------------------
export const SHADOWS = {
  none: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  card: {
    shadowColor: '#0B0B0C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B0B0C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 5,
  },
  sheet: {
    shadowColor: '#0B0B0C',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
};

// ---------------------------------------------------------------------------
// Motion — quick, native, no bounce-by-default theatrics.
// ---------------------------------------------------------------------------
export const MOTION = {
  spring: { speed: 40, bounciness: 3 },
  pressScale: 0.97,
  pressScaleSm: 0.94,
  durationFast: 160,
  duration: 240,
  durationSlow: 360,
  ease: [0.22, 0.9, 0.24, 1] as [number, number, number, number],
};

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  radius: typeof RADIUS;
  spacing: typeof SPACING;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
  motion: typeof MOTION;
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  radius: RADIUS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
  motion: MOTION,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  radius: RADIUS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
  motion: MOTION,
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };

// Backwards-compatible alias so old `useTheme().colors` reads still resolve.
export const COLORS_THEMED = COLORS;
