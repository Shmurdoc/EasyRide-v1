export const COLORS = {
  ink: '#0F1713',
  ink2: '#44514A',
  muted: '#8A978F',
  bg: '#F2F4F1',
  card: '#FFFFFF',
  line: '#E5EAE4',

  brand: '#0A7C4E',
  brandLight: '#12A86B',
  brandDark: '#0B3B2A',
  brandLightBg: '#E7F5EE',

  primary: '#0A7C4E',
  primaryLight: '#12A86B',
  primaryDark: '#0B3B2A',
  primaryGlow: 'rgba(10, 124, 78, 0.25)',

  success: '#0A7C4E',
  successLight: '#12A86B',
  successGlow: 'rgba(10, 124, 78, 0.25)',
  error: '#E5484D',
  errorDark: '#B72B30',
  errorGlow: 'rgba(229, 72, 77, 0.25)',
  warning: '#F5A524',
  info: '#2E6BF0',
  amber: '#F5A524',
  purple: '#7C3AED',
  teal: '#0E9488',

  text: '#0F1713',
  textSecondary: '#44514A',
  textMuted: '#8A978F',
  textDim: '#C6CFC8',
  textOnDark: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceLight: '#F2F4F1',
  surfaceBorder: '#E5EAE4',
  border: '#E5EAE4',
  borderLight: '#E5EAE4',
  borderFocus: 'rgba(10, 124, 78, 0.5)',

  glass: 'rgba(255, 255, 255, 0.86)',
  glassBorder: 'rgba(229, 234, 228, 0.8)',
  overlay: 'rgba(8, 12, 10, 0.5)',

  white: '#FFFFFF',
  black: '#0F1713',
  green: '#0A7C4E',
  greenLight: '#12A86B',
  red: '#E5484D',
  blue: '#2E6BF0',
  orange: '#F5A524',
} as const;

export const GRADIENTS = {
  primary: ['#0B3B2A', '#0A7C4E'] as const,
  primaryLight: ['#0A7C4E', '#12A86B'] as const,
  brandFull: ['#0B3B2A', '#0A7C4E', '#12A86B'] as const,
  surface: ['#F2F4F1', '#FFFFFF'] as const,
  surfaceElevated: ['#FFFFFF', '#F2F4F1'] as const,
  background: ['#F2F4F1', '#F2F4F1'] as const,
  stays: ['#0B5E55', '#0E9488'] as const,
  rentals: ['#312E81', '#4F46E5'] as const,
  trips: ['#0B3B2A', '#0A7C4E'] as const,
  emergency: ['#7A1215', '#C22A2E', '#E5484D'] as const,
  dashboard: ['#3D0C0E', '#7A1518', '#C1272D'] as const,
  shimmer: ['rgba(15,23,19,0)', 'rgba(15,23,19,0.04)', 'rgba(15,23,19,0)'] as const,
  glow: ['rgba(10,124,78,0.2)', 'rgba(10,124,78,0)'] as const,
  green: ['#0A7C4E', '#12A86B'] as const,
} as const;

export type ColorToken = keyof typeof COLORS;
export type GradientToken = keyof typeof GRADIENTS;
