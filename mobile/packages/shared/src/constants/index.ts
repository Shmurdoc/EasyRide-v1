export const COLORS = {
  bg: '#121212',
  bgGradientStart: '#121212',
  bgGradientEnd: '#1c1c1e',
  surface: '#1c1c1e',
  surfaceElevated: '#242426',
  surfaceLight: '#2c2c2e',
  surfaceBorder: '#3a3a3c',
  primary: '#FFAD7A',
  primaryLight: '#FFC9A0',
  primaryDark: '#e89b6a',
  primaryGlow: 'rgba(255, 173, 122, 0.3)',
  text: '#FFFFFF',
  textSecondary: '#E8E8E8',
  textMuted: '#98989d',
  textDim: '#666666',
  success: '#16a34a',
  successLight: '#22c55e',
  successGlow: 'rgba(22, 163, 74, 0.25)',
  error: '#dc2626',
  errorLight: '#f87171',
  errorGlow: 'rgba(220, 38, 38, 0.25)',
  warning: '#FFB800',
  info: '#3b82f6',
  border: '#333333',
  borderLight: '#3a3a3c',
  borderFocus: 'rgba(255, 173, 122, 0.5)',
  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',
  orange: '#FFAD7A',
  orangeDark: '#e89b6a',
  green: '#16a34a',
  greenLight: '#22c55e',
  red: '#dc2626',
  blue: '#3b82f6',
} as const;

export const GRADIENTS = {
  primary: ['#FFAD7A', '#e89b6a'] as const,
  primaryDark: ['#e89b6a', '#FFAD7A'] as const,
  surface: ['#1c1c1e', '#242426'] as const,
  surfaceElevated: ['#242426', '#2c2c2e'] as const,
  background: ['#121212', '#1c1c1e'] as const,
  shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'] as const,
  orangeShimmer: ['rgba(255,173,122,0)', 'rgba(255,173,122,0.15)', 'rgba(255,173,122,0)'] as const,
  glow: ['rgba(255,173,122,0.2)', 'rgba(255,173,122,0)'] as const,
  green: ['#16a34a', '#22c55e'] as const,
} as const;

export const GLASS = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  blur: 20,
  saturation: 1.8,
} as const;

export const TYPOGRAPHY = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: 0 },
  h4: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0.2 },
  body: { fontSize: 18, fontWeight: '400' as const, lineHeight: 27 },
  bodySmall: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  xs: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22, letterSpacing: 0.5 },
  buttonLarge: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, letterSpacing: 0.5 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.8 },
  price: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34, letterSpacing: -0.5 },
  eta: { fontSize: 42, fontWeight: '800' as const, lineHeight: 48, letterSpacing: -1 },
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
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  tile: 20,
} as const;

export const ANIMATION = {
  spring: { speed: 50, bounciness: 4 },
  springFast: { speed: 70, bounciness: 4 },
  springSlow: { speed: 30, bounciness: 6 },
  durationFast: 200,
  durationNormal: 300,
  durationSlow: 500,
  pulse: { min: 0.3, max: 1, duration: 1200 },
  pulseFast: { min: 0.4, max: 1, duration: 800 },
  shimmer: 1200,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  moderate: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  glowSuccess: {
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  glowError: {
    shadowColor: COLORS.error,
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
