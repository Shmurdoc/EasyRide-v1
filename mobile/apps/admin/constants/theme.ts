import { COLORS } from '@easyryde/shared';

export const ADMIN_COLORS = {
  primary: COLORS.brand,
  primaryLight: COLORS.brandLight,
  primaryDark: COLORS.brandDark,
  accent: COLORS.brand,
  background: '#0A0A0F',
  backgroundAlt: '#121218',
  surface: '#161618',
  surfaceLight: '#202024',
  surfaceBorder: '#2A2A2E',
  text: '#FFFFFF',
  textSecondary: '#C7C7CC',
  textMuted: '#8A8A8F',
  green: COLORS.success,
  greenLight: COLORS.successLight,
  orange: COLORS.warning,
  orangeLight: '#FFB13D',
  red: COLORS.error,
  redLight: '#FF6B70',
  blue: COLORS.info,
  yellow: COLORS.warning,
  backgroundDark: '#0A0A0F',
  surfaceDark: '#161618',
  surfaceBorderDark: '#2A2A2E',
} as const;

export const ADMIN_GRADIENTS = {
  header: ['#E25500', '#FF6A00'] as const,
  primary: ['#E25500', '#FF6A00'] as const,
  dark: ['#0A0A0F', '#121218'] as const,
  surface: ['#161618', '#202024'] as const,
  glow: ['rgba(255,106,0,0.18)', 'rgba(255,106,0,0)'] as const,
} as const;

export const ADMIN_RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;
