import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

export const FONTS = {
  heading: isIOS ? 'Poppins-Bold' : 'Poppins_700Bold',
  headingSemi: isIOS ? 'Poppins-SemiBold' : 'Poppins_600SemiBold',
  headingExtra: isIOS ? 'Poppins-ExtraBold' : 'Poppins_800ExtraBold',
  body: isIOS ? 'Inter-Regular' : 'Inter_400Regular',
  bodyMedium: isIOS ? 'Inter-Medium' : 'Inter_500Medium',
  bodySemi: isIOS ? 'Inter-SemiBold' : 'Inter_600SemiBold',
  bodyBold: isIOS ? 'Inter-Bold' : 'Inter_700Bold',
} as const;

export const TYPOGRAPHY = {
  fontFamily: FONTS.body,

  hero: {
    fontFamily: FONTS.headingExtra,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  h2: {
    fontFamily: FONTS.heading,
    fontSize: 17,
    lineHeight: 22,
  },
  h3: {
    fontFamily: FONTS.headingSemi,
    fontSize: 15,
    lineHeight: 20,
  },
  h4: {
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
    lineHeight: 19,
  },
  section: {
    fontFamily: FONTS.heading,
    fontSize: 16.5,
    lineHeight: 22,
  },
  bodyLg: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  body: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
  },
  bodySmall: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 19,
  },
  small: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  xs: {
    fontFamily: FONTS.bodySemi,
    fontSize: 10.5,
    lineHeight: 14,
  },
  micro: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    lineHeight: 13,
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    lineHeight: 22,
  },
  badge: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    lineHeight: 14,
  },
  kicker: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  button: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonLarge: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  eta: {
    fontFamily: FONTS.headingExtra,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1,
  },
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY;
