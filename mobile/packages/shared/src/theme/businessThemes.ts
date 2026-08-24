import { COLORS, GRADIENTS, SHADOWS } from '../constants';

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

export type BusinessSlug = 'rides' | 'food' | 'admin';

export const BUSINESS_THEMES: Record<BusinessSlug, BusinessTheme> = {
  admin: {
    id: 'biz-admin',
    name: 'EasyRyde Admin',
    slug: 'admin',
    colors: {
      primary: '#6366f1',
      primaryLight: '#818cf8',
      primaryDark: '#4f46e5',
      accent: '#6366f1',
      accentLight: '#a5b4fc',
      gradient: ['#4f46e5', '#6366f1'] as const,
      gradientLight: ['#4f46e5', '#6366f1', '#818cf8'] as const,
      gradientDark: ['#3730a3', '#4f46e5'] as const,
      glow: 'rgba(99, 102, 241, 0.35)',
      tabActive: '#6366f1',
      tabInactive: '#6b7280',
      badge: '#6366f1',
      badgeText: '#FFFFFF',
      marker: '#6366f1',
      sos: '#dc2626',
      earn: '#6366f1',
      surface: '#1a1a1e',
      surfaceLight: '#252529',
      surfaceBorder: '#2a2a2e',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      bg: '#0f0f11',
    },
    logo: {
      icon: '\u2699\ufe0f',
      text: 'EasyRyde',
      mark: 'EA',
      full: 'EasyRyde Admin',
    },
    branding: {
      tagline: 'Manage your fleet',
      keywords: ['admin', 'manage', 'fleet', 'analytics', 'oversight'],
    },
  },
  rides: {
    id: 'biz-rides',
    name: 'EasyRyde Rides',
    slug: 'rides',
    colors: {
      primary: '#7C3AED',
      primaryLight: '#A78BFA',
      primaryDark: '#5B21B6',
      accent: '#8B5CF6',
      accentLight: '#C4B5FD',
      gradient: ['#5B21B6', '#7C3AED'] as const,
      gradientLight: ['#5B21B6', '#7C3AED', '#A78BFA'] as const,
      gradientDark: ['#2E1065', '#5B21B6'] as const,
      glow: 'rgba(124, 58, 237, 0.35)',
      tabActive: '#7C3AED',
      tabInactive: '#9CA3AF',
      badge: '#7C3AED',
      badgeText: '#FFFFFF',
      marker: '#7C3AED',
      sos: '#DC2626',
      earn: '#7C3AED',
      surface: '#FFFFFF',
      surfaceLight: '#F5F3FF',
      surfaceBorder: '#E5E7EB',
      text: '#1F2937',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      bg: '#F9FAFB',
    },
    logo: {
      icon: '\ud83d\ude97',
      text: 'EasyRyde',
      mark: 'ER',
      full: 'EasyRyde Rides',
    },
    branding: {
      tagline: 'Your ride, your way',
      keywords: ['ride', 'hail', 'pickup', 'dropoff', 'carpool'],
    },
  },
  food: {
    id: 'biz-food',
    name: 'EasyRyde Food',
    slug: 'food',
    colors: {
      primary: '#EA580C',
      primaryLight: '#FB923C',
      primaryDark: '#C2410C',
      accent: '#F97316',
      accentLight: '#FED7AA',
      gradient: ['#C2410C', '#EA580C'] as const,
      gradientLight: ['#C2410C', '#EA580C', '#FB923C'] as const,
      gradientDark: ['#7C2D12', '#C2410C'] as const,
      glow: 'rgba(234, 88, 12, 0.35)',
      tabActive: '#EA580C',
      tabInactive: '#9CA3AF',
      badge: '#EA580C',
      badgeText: '#FFFFFF',
      marker: '#EA580C',
      sos: '#DC2626',
      earn: '#EA580C',
      surface: '#FFFFFF',
      surfaceLight: '#FFF7ED',
      surfaceBorder: '#E5E7EB',
      text: '#1F2937',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      bg: '#F9FAFB',
    },
    logo: {
      icon: '\ud83c\udf54',
      text: 'EasyRyde',
      mark: 'EF',
      full: 'EasyRyde Food',
    },
    branding: {
      tagline: 'Food delivered fast',
      keywords: ['food', 'delivery', 'restaurant', 'takeout', 'order'],
    },
  },
};

export function getBusinessTheme(slug: BusinessSlug): BusinessTheme {
  return BUSINESS_THEMES[slug];
}

export type { BusinessSlug as BusinessSlugType };
