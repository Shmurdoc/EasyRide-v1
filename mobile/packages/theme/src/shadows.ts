import { ViewStyle } from 'react-native';

export const SHADOWS = {
  sm: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,

  md: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  } as ViewStyle,

  lg: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 44,
    elevation: 8,
  } as ViewStyle,

  glow: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,

  glowSuccess: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,

  glowError: {
    shadowColor: '#E5484D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,

  glowBrand: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,

  card: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  } as ViewStyle,

  sheet: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,

  floating: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
  } as ViewStyle,

  navBar: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  } as ViewStyle,
} as const;

export type ShadowToken = keyof typeof SHADOWS;
