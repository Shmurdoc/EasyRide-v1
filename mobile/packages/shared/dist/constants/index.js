"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAP_REGION = exports.PHALABORWA_CENTER = exports.API_TIMEOUT = exports.RIDE_STATUS_COLORS = exports.RIDE_STATUS_LABELS = exports.PAYMENT_METHODS = exports.PHALABORWA_LOCATIONS = exports.RIDE_CATEGORIES = exports.VEHICLE_TYPES = exports.BORDERS = exports.SHADOWS = exports.Z_INDEX = exports.ANIMATION = exports.RADIUS = exports.SPACING = exports.TYPOGRAPHY = exports.FONTS = exports.GLASS = exports.GRADIENTS = exports.COLORS = void 0;
exports.COLORS = {
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
    orange: '#0A7C4E',
    orangeDark: '#0B3B2A',
    green: '#0A7C4E',
    greenLight: '#12A86B',
    red: '#E5484D',
    blue: '#2E6BF0',
};
exports.GRADIENTS = {
    primary: ['#0B3B2A', '#0A7C4E'],
    primaryLight: ['#0A7C4E', '#12A86B'],
    brandFull: ['#0B3B2A', '#0A7C4E', '#12A86B'],
    primaryDark: ['#0B3B2A', '#0A7C4E'],
    surface: ['#F2F4F1', '#FFFFFF'],
    surfaceElevated: ['#FFFFFF', '#F2F4F1'],
    background: ['#F2F4F1', '#F2F4F1'],
    stays: ['#0B5E55', '#0E9488'],
    rentals: ['#312E81', '#4F46E5'],
    trips: ['#0B3B2A', '#0A7C4E'],
    emergency: ['#7A1215', '#C22A2E', '#E5484D'],
    dashboard: ['#3D0C0E', '#7A1518', '#C1272D'],
    shimmer: ['rgba(15,23,19,0)', 'rgba(15,23,19,0.04)', 'rgba(15,23,19,0)'],
    orangeShimmer: ['rgba(10,124,78,0)', 'rgba(10,124,78,0.08)', 'rgba(10,124,78,0)'],
    glow: ['rgba(10,124,78,0.2)', 'rgba(10,124,78,0)'],
    green: ['#0A7C4E', '#12A86B'],
};
exports.GLASS = {
    background: 'rgba(255, 255, 255, 0.86)',
    border: 'rgba(229, 234, 228, 0.8)',
    blur: 14,
    saturation: 1.2,
};
exports.FONTS = {
    heading: 'Poppins_700Bold',
    headingSemi: 'Poppins_600SemiBold',
    headingExtra: 'Poppins_800ExtraBold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemi: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
};
exports.TYPOGRAPHY = {
    fontFamily: exports.FONTS.body,
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
};
exports.SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
};
exports.RADIUS = {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 22,
    '2xl': 28,
    full: 9999,
    tile: 20,
};
exports.ANIMATION = {
    screenEnter: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
    screenExit: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
    sheetEnter: { duration: 340, easing: [0.22, 0.9, 0.24, 1] },
    sheetExit: { duration: 300, easing: 'ease-out' },
    pressScale: 0.92,
    pressScaleCard: 0.97,
    pressScaleChip: 0.9,
    pressScaleBig: 0.95,
    pressScaleBtn: 0.98,
    pressDuration: 150,
    sosPulse: { duration: 2400, easing: 'ease-in-out', loop: true },
    breathe: { duration: 2400, easing: 'ease-in-out', loop: true },
    bob: { duration: 2200, easing: 'ease-in-out', loop: true },
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
};
exports.Z_INDEX = {
    base: 0,
    surface: 10,
    dropdown: 50,
    header: 100,
    modal: 1000,
    overlay: 2000,
    toast: 3000,
    tooltip: 4000,
};
exports.SHADOWS = {
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
};
exports.BORDERS = {
    standard: { borderWidth: 1, borderColor: exports.COLORS.border, borderStyle: 'solid' },
    light: { borderWidth: 1, borderColor: exports.COLORS.borderLight, borderStyle: 'solid' },
    focus: { borderWidth: 1.5, borderColor: exports.COLORS.borderFocus, borderStyle: 'solid' },
    glass: { borderWidth: 1, borderColor: exports.COLORS.glassBorder, borderStyle: 'solid' },
};
exports.VEHICLE_TYPES = [
    { id: 'economy', type: 'EasyRyde', price: 35, time: '3 min', desc: 'Affordable everyday rides', seats: 4, perKm: 12, perMin: 2 },
    { id: 'comfort', type: 'EasyRyde Comfort', price: 55, time: '5 min', desc: 'Newer cars with extra legroom', seats: 4, perKm: 15, perMin: 3 },
    { id: 'premium', type: 'EasyRyde Premium', price: 95, time: '8 min', desc: 'Luxury vehicles with top drivers', seats: 4, perKm: 22, perMin: 5 },
    { id: 'xl', type: 'GoXL', price: 120, time: '6 min', desc: 'SUVs for groups up to 6', seats: 6, perKm: 18, perMin: 4 },
];
exports.RIDE_CATEGORIES = [
    { id: 'economy', name: 'Economy', baseFare: 25, perKm: 12, perMin: 2 },
    { id: 'standard', name: 'Standard', baseFare: 35, perKm: 15, perMin: 3 },
    { id: 'premium', name: 'Premium', baseFare: 55, perKm: 22, perMin: 5 },
    { id: 'xl', name: 'XL', baseFare: 45, perKm: 18, perMin: 4 },
];
exports.PHALABORWA_LOCATIONS = [
    { name: 'Kruger National Park Gate', address: 'R71 Road, Phalaborwa', latitude: -24.0117, longitude: 31.3267, icon: 'trees', dist: '18.5 km', fare: 185 },
    { name: 'Phalaborwa Airport', address: 'Airport Road, Phalaborwa', latitude: -23.9372, longitude: 31.1554, icon: 'airplane', dist: '3.2 km', fare: 65 },
    { name: 'Mall of Phalaborwa', address: 'Schoeman Street, Phalaborwa', latitude: -23.9421, longitude: 31.1408, icon: 'bag', dist: '0.5 km', fare: 35 },
    { name: 'Phalaborwa Minerals', address: 'Industrial Area, Phalaborwa', latitude: -23.9530, longitude: 31.1320, icon: 'briefcase', dist: '2.1 km', fare: 45 },
    { name: 'Letaba Hospital', address: 'Letaba Street, Phalaborwa', latitude: -23.9380, longitude: 31.1450, icon: 'medical', dist: '1.0 km', fare: 35 },
    { name: 'Phalaborwa High School', address: 'Boksburg Street, Phalaborwa', latitude: -23.9445, longitude: 31.1390, icon: 'school', dist: '0.8 km', fare: 35 },
    { name: 'Magoebaskloof Dam', address: 'R71, Magoebaskloof', latitude: -23.9750, longitude: 30.9900, icon: 'water', dist: '12.3 km', fare: 145 },
    { name: 'Polokwane CBD', address: 'Burger Street, Polokwane', latitude: -23.9045, longitude: 29.4688, icon: 'location', dist: '135 km', fare: 1250 },
    { name: 'Tzaneen Town Centre', address: 'Danie Joubert Street, Tzaneen', latitude: -23.8130, longitude: 30.1640, icon: 'location', dist: '55 km', fare: 520 },
];
exports.PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash' },
    { id: 'wallet', name: 'Wallet' },
    { id: 'payfast', name: 'PayFast' },
    { id: 'ozow', name: 'Ozow EFT' },
    { id: 'stripe', name: 'Card (Stripe)' },
];
exports.RIDE_STATUS_LABELS = {
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
exports.RIDE_STATUS_COLORS = {
    searching: exports.COLORS.primary,
    driver_assigned: exports.COLORS.info,
    accepted: exports.COLORS.text,
    driver_en_route: exports.COLORS.info,
    arrived: exports.COLORS.success,
    waiting_for_rider: exports.COLORS.warning,
    in_progress: exports.COLORS.text,
    near_drop_off: exports.COLORS.primaryLight,
    completed: exports.COLORS.success,
    cancelled: exports.COLORS.error,
    cancellation_requested: exports.COLORS.warning,
    no_show: exports.COLORS.error,
};
exports.API_TIMEOUT = 15000;
exports.PHALABORWA_CENTER = {
    latitude: -23.9470,
    longitude: 31.0830,
};
exports.MAP_REGION = {
    latitude: exports.PHALABORWA_CENTER.latitude,
    longitude: exports.PHALABORWA_CENTER.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};
__exportStar(require("./designTokens"), exports);
