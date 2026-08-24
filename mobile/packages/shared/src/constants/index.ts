export const COLORS = {
  // Canvas — white / off-white
  ink: '#0B0B0C',
  ink2: '#3C3C43',
  muted: '#86868B',
  bg: '#FFFFFF',
  bgAlt: '#F5F5F6',
  card: '#FFFFFF',
  line: '#ECECEE',

  // Brand — orange. The single confident accent.
  brand: '#FF6A00',
  brandLight: '#FF8C3D',
  brandDark: '#E25500',
  brandSoft: '#FFF1E6',
  brandLightBg: '#FFF1E6',
  brandContrast: '#FFFFFF',

  // Primary action — true black (orange/white/black)
  primary: '#0B0B0C',
  primaryLight: '#262629',
  primaryDark: '#0B0B0C',
  primaryGlow: 'rgba(255, 106, 0, 0.18)',

  // Semantic
  success: '#1F9D55',
  successLight: '#3FCF7C',
  successGlow: 'rgba(31, 157, 85, 0.22)',
  error: '#E5484D',
  errorDark: '#B72B30',
  errorGlow: 'rgba(229, 72, 77, 0.22)',
  warning: '#E8920C',
  info: '#2E6BF0',
  amber: '#E8920C',

  text: '#0B0B0C',
  textSecondary: '#3C3C43',
  textMuted: '#86868B',
  textDim: '#C6C6C9',
  textOnDark: '#FFFFFF',

  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceLight: '#F5F5F6',
  surfaceBorder: '#ECECEE',
  border: '#ECECEE',
  borderLight: '#ECECEE',
  borderFocus: 'rgba(255, 106, 0, 0.5)',

  // Category tile surfaces (CategoryTile)
  tileBg: '#F5F5F6',
  warmBg: '#FFF1E6',
  tileBorder: '#ECECEE',

  glass: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  overlay: 'rgba(11, 11, 12, 0.42)',

  white: '#FFFFFF',
  black: '#0B0B0C',
  orange: '#FF6A00',
  orangeDark: '#E25500',
  green: '#1F9D55',
  greenLight: '#3FCF7C',
  red: '#E5484D',
  blue: '#2E6BF0',
} as const;

export const GRADIENTS = {
  // Action gradient — near-black, used only for primary CTAs
  primary: ['#262629', '#0B0B0C'] as const,
  primaryLight: ['#0B0B0C', '#262629'] as const,
  brandFull: ['#E25500', '#FF6A00', '#FF8C3D'] as const,
  // Brand gradient — orange, used sparingly for hero/brand moments (dark text on light areas)
  brand: ['#FF8C3D', '#FF6A00'] as const,
  surface: ['#F5F5F6', '#FFFFFF'] as const,
  surfaceElevated: ['#FFFFFF', '#F5F5F6'] as const,
  background: ['#FFFFFF', '#FFFFFF'] as const,
  stays: ['#0B0B0C', '#3C3C43'] as const,
  rentals: ['#0B0B0C', '#3C3C43'] as const,
  trips: ['#0B0B0C', '#3C3C43'] as const,
  emergency: ['#7A1215', '#C22A2E', '#E5484D'] as const,
  dashboard: ['#FF8C3D', '#FF6A00', '#E25500'] as const,
  shimmer: ['rgba(11,11,12,0)', 'rgba(11,11,12,0.04)', 'rgba(11,11,12,0)'] as const,
  orangeShimmer: ['rgba(255,106,0,0)', 'rgba(255,106,0,0.08)', 'rgba(255,106,0,0)'] as const,
  glow: ['rgba(255,106,0,0.2)', 'rgba(255,106,0,0)'] as const,
  green: ['#1F9D55', '#3FCF7C'] as const,
} as const;

export const GLASS = {
  background: 'rgba(255, 255, 255, 0.86)',
  border: 'rgba(229, 234, 228, 0.8)',
  blur: 14,
  saturation: 1.2,
} as const;

export const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  headingExtra: 'Poppins_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const TYPOGRAPHY = {
  fontFamily: FONTS.body,
  hero: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, lineHeight: 30, letterSpacing: 0.2 },
  h1: { fontFamily: 'Poppins_700Bold', fontSize: 20, lineHeight: 26, letterSpacing: 0.1 },
  h2: { fontFamily: 'Poppins_700Bold', fontSize: 17, lineHeight: 22 },
  h3: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 20 },
  h4: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 19 },
  section: { fontFamily: 'Poppins_700Bold', fontSize: 16.5, lineHeight: 22 },
  bodyLg: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  small: { fontFamily: 'Inter_500Medium', fontSize: 11.5, lineHeight: 16 },
  xs: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, lineHeight: 14 },
  micro: { fontFamily: 'Inter_700Bold', fontSize: 9.5, lineHeight: 13 },
  price: { fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 22 },
  badge: { fontFamily: 'Inter_700Bold', fontSize: 10.5, lineHeight: 14 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10.5, lineHeight: 14, letterSpacing: 1.6 },
  button: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 20 },
  buttonLarge: { fontFamily: 'Poppins_700Bold', fontSize: 16, lineHeight: 22, letterSpacing: 0.5 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, letterSpacing: 0.8 },
  eta: { fontFamily: 'Poppins_800ExtraBold', fontSize: 42, lineHeight: 48, letterSpacing: -1 },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
  tile: 20,
} as const;

export const ANIMATION = {
  screenEnter: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
  screenExit: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
  sheetEnter: { duration: 340, easing: [0.22, 0.9, 0.24, 1] },
  sheetExit: { duration: 300, easing: 'ease-out' as const },
  pressScale: 0.92,
  pressScaleCard: 0.97,
  pressScaleChip: 0.9,
  pressScaleBig: 0.95,
  pressScaleBtn: 0.98,
  pressDuration: 150,
  sosPulse: { duration: 2400, easing: 'ease-in-out' as const, loop: true },
  breathe: { duration: 2400, easing: 'ease-in-out' as const, loop: true },
  bob: { duration: 2200, easing: 'ease-in-out' as const, loop: true },
  shimmer: 1200,
  successPop: { duration: 450, easing: [0.2, 1.4, 0.4, 1] },
  progressFill: { duration: 1000, easing: [0.22, 0.9, 0.24, 1] },
  toastEnter: { duration: 350, easing: [0.22, 0.9, 0.24, 1] },
  toastExit: { duration: 350, easing: [0.22, 0.9, 0.24, 1] },
  spring: { speed: 50, bounciness: 4 },
  springFast: { speed: 70, bounciness: 4 },
  springSlow: { speed: 30, bounciness: 6 },
  durationFast: 200,
  durationNormal: 300,
  durationSlow: 500,
  pulse: { min: 0.3, max: 1, duration: 1200 },
  pulseFast: { min: 0.4, max: 1, duration: 800 },
  modal: { enter: 250, exit: 200 },
} as const;

export const Z_INDEX = {
  base: 0,
  surface: 10,
  dropdown: 50,
  header: 100,
  modal: 1000,
  overlay: 2000,
  toast: 3000,
  tooltip: 4000,
} as const;

export const SHADOWS = {
  subtle: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  moderate: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 44,
    elevation: 8,
  },
  glow: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  glowSuccess: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  glowError: {
    shadowColor: '#E5484D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const BORDERS = {
  standard: { borderWidth: 1, borderColor: COLORS.border, borderStyle: 'solid' as const },
  light: { borderWidth: 1, borderColor: COLORS.borderLight, borderStyle: 'solid' as const },
  focus: { borderWidth: 1.5, borderColor: COLORS.borderFocus, borderStyle: 'solid' as const },
  glass: { borderWidth: 1, borderColor: COLORS.glassBorder, borderStyle: 'solid' as const },
} as const;

export const VEHICLE_TYPES = [
  { id: 'economy', type: 'EasyRyde', price: 35, time: '3 min', desc: 'Affordable everyday rides', seats: 4, perKm: 12, perMin: 2 },
  { id: 'comfort', type: 'EasyRyde Comfort', price: 55, time: '5 min', desc: 'Newer cars with extra legroom', seats: 4, perKm: 15, perMin: 3 },
  { id: 'premium', type: 'EasyRyde Premium', price: 95, time: '8 min', desc: 'Luxury vehicles with top drivers', seats: 4, perKm: 22, perMin: 5 },
  { id: 'xl', type: 'GoXL', price: 120, time: '6 min', desc: 'SUVs for groups up to 6', seats: 6, perKm: 18, perMin: 4 },
] as const;

export const RIDE_CATEGORIES = [
  { id: 'economy', name: 'Economy', baseFare: 25, perKm: 12, perMin: 2 },
  { id: 'standard', name: 'Standard', baseFare: 35, perKm: 15, perMin: 3 },
  { id: 'premium', name: 'Premium', baseFare: 55, perKm: 22, perMin: 5 },
  { id: 'xl', name: 'XL', baseFare: 45, perKm: 18, perMin: 4 },
] as const;

export const PHALABORWA_LOCATIONS = [
  { name: 'Kruger National Park Gate', address: 'R71 Road, Phalaborwa', latitude: -24.0117, longitude: 31.3267, icon: 'trees', dist: '18.5 km', fare: 185 },
  { name: 'Phalaborwa Airport', address: 'Airport Road, Phalaborwa', latitude: -23.9372, longitude: 31.1554, icon: 'airplane', dist: '3.2 km', fare: 65 },
  { name: 'Mall of Phalaborwa', address: 'Schoeman Street, Phalaborwa', latitude: -23.9421, longitude: 31.1408, icon: 'bag', dist: '0.5 km', fare: 35 },
  { name: 'Phalaborwa Minerals', address: 'Industrial Area, Phalaborwa', latitude: -23.9530, longitude: 31.1320, icon: 'briefcase', dist: '2.1 km', fare: 45 },
  { name: 'Letaba Hospital', address: 'Letaba Street, Phalaborwa', latitude: -23.9380, longitude: 31.1450, icon: 'medical', dist: '1.0 km', fare: 35 },
  { name: 'Phalaborwa High School', address: 'Boksburg Street, Phalaborwa', latitude: -23.9445, longitude: 31.1390, icon: 'school', dist: '0.8 km', fare: 35 },
  { name: 'Magoebaskloof Dam', address: 'R71, Magoebaskloof', latitude: -23.9750, longitude: 30.9900, icon: 'water', dist: '12.3 km', fare: 145 },
  { name: 'Polokwane CBD', address: 'Burger Street, Polokwane', latitude: -23.9045, longitude: 29.4688, icon: 'location', dist: '135 km', fare: 1250 },
  { name: 'Tzaneen Town Centre', address: 'Danie Joubert Street, Tzaneen', latitude: -23.8130, longitude: 30.1640, icon: 'location', dist: '55 km', fare: 520 },
] as const;

export const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash' },
  { id: 'wallet', name: 'Wallet' },
  { id: 'payfast', name: 'PayFast' },
  { id: 'ozow', name: 'Ozow EFT' },
  { id: 'stripe', name: 'Card (Stripe)' },
] as const;

export const RIDE_STATUS_LABELS: Record<string, string> = {
  searching: 'Finding driver...',
  driver_assigned: 'Driver assigned',
  accepted: 'Driver accepted',
  driver_en_route: 'Driver on the way',
  arrived: 'Driver has arrived',
  waiting_for_rider: 'Waiting for you',
  in_progress: 'Ride in progress',
  near_drop_off: 'Arriving soon',
  completed: 'Ride completed',
  cancelled: 'Ride cancelled',
  cancellation_requested: 'Cancellation requested',
  no_show: 'No show',
};

export const RIDE_STATUS_COLORS: Record<string, string> = {
  searching: COLORS.primary,
  driver_assigned: COLORS.info,
  accepted: COLORS.text,
  driver_en_route: COLORS.info,
  arrived: COLORS.success,
  waiting_for_rider: COLORS.warning,
  in_progress: COLORS.text,
  near_drop_off: COLORS.primaryLight,
  completed: COLORS.success,
  cancelled: COLORS.error,
  cancellation_requested: COLORS.warning,
  no_show: COLORS.error,
};

export const API_TIMEOUT = 15000;

export const PHALABORWA_CENTER = {
  latitude: -23.9470,
  longitude: 31.0830,
} as const;

export const MAP_REGION = {
  latitude: PHALABORWA_CENTER.latitude,
  longitude: PHALABORWA_CENTER.longitude,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
} as const;
