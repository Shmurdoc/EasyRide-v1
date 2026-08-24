# EasyRyde x PHBIMH - Design Implementation Plan

> Applying the Phalaborwa In My Hand design system to all three EasyRyde mobile apps.

---

## 1. COLOR SYSTEM

### 1.1 Current State vs Target

**Current EasyRyde**: Dark-mode-first, orange (#FFAD7A) primary, Inter only.
**PHBIMH Target**: Light-mode, green (#0A7C4E) primary, Poppins + Inter, soft shadows.

### 1.2 Shared Theme Replacement

File: `packages/shared/src/constants/index.ts`

```typescript
export const COLORS = {
  // Core palette
  ink: '#0F1713',
  ink2: '#44514A',
  muted: '#8A978F',
  bg: '#F2F4F1',
  card: '#FFFFFF',
  line: '#E5EAE4',

  // Brand greens
  brand: '#0A7C4E',
  brandLight: '#12A86B',
  brandDark: '#0B3B2A',
  brandLightBg: '#E7F5EE',

  // Semantic
  primary: '#0A7C4E',
  primaryLight: '#12A86B',
  primaryDark: '#0B3B2A',
  primaryGlow: 'rgba(10, 124, 78, 0.25)',
  success: '#0A7C4E',
  successLight: '#12A86B',
  error: '#E5484D',
  errorDark: '#B72B30',
  errorGlow: 'rgba(229, 72, 77, 0.25)',
  warning: '#F5A524',
  info: '#2E6BF0',
  amber: '#F5A524',
  purple: '#7C3AED',
  teal: '#0E9488',

  // Text hierarchy (light theme)
  text: '#0F1713',
  textSecondary: '#44514A',
  textMuted: '#8A978F',
  textDim: '#C6CFC8',
  textOnDark: '#FFFFFF',

  // Surfaces (light theme)
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceLight: '#F2F4F1',
  surfaceBorder: '#E5EAE4',
  border: '#E5EAE4',
  borderLight: '#E5EAE4',
  borderFocus: 'rgba(10, 124, 78, 0.5)',

  // Glass (for overlays)
  glass: 'rgba(255, 255, 255, 0.86)',
  glassBorder: 'rgba(229, 234, 228, 0.8)',
  overlay: 'rgba(8, 12, 10, 0.5)',

  white: '#FFFFFF',
  black: '#0F1713',
} as const;

export const GRADIENTS = {
  primary: ['#0B3B2A', '#0A7C4E'] as const,
  primaryLight: ['#0A7C4E', '#12A86B'] as const,
  brandFull: ['#0B3B2A', '#0A7C4E', '#12A86B'] as const,
  surface: ['#F2F4F1', '#FFFFFF'] as const,
  background: ['#F2F4F1', '#F2F4F1'] as const,
  stays: ['#0B5E55', '#0E9488'] as const,
  rentals: ['#312E81', '#4F46E5'] as const,
  trips: ['#0B3B2A', '#0A7C4E'] as const,
  emergency: ['#7A1215', '#C22A2E', '#E5484D'] as const,
  dashboard: ['#3D0C0E', '#7A1518', '#C1272D'] as const,
  shimmer: ['rgba(15,23,19,0)', 'rgba(15,23,19,0.04)', 'rgba(15,23,19,0)'] as const,
} as const;
```

### 1.3 Shadows

```typescript
export const SHADOWS = {
  subtle: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  }, // --sh-sm: 0 1px 3px rgba(15,23,19,.06),0 4px 14px rgba(15,23,19,.05)
  moderate: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  }, // --sh-md: 0 6px 18px rgba(15,23,19,.10),0 2px 6px rgba(15,23,19,.06)
  elevated: {
    shadowColor: '#0F1713',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 44,
    elevation: 8,
  }, // --sh-lg: 0 18px 44px rgba(15,23,19,.18)
  glow: {
    shadowColor: '#0A7C4E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
```

### 1.4 Radius

```typescript
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,    // --r-lg
  xl: 22,    // --r-xl
  '2xl': 28, // --r-2xl
  pill: 999,
  tile: 20,
} as const;
```

---

## 2. TYPOGRAPHY

### 2.1 Font Families

PHBIMH uses **Poppins** for headings and **Inter** for body. Current EasyRyde only uses Inter.

```typescript
export const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  headingExtra: 'Poppins_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;
```

**Required packages:** `@expo-google-fonts/poppins` (500, 600, 700, 800) and `@expo-google-fonts/inter` (400, 500, 600, 700)

### 2.2 Type Scale

```typescript
export const TYPOGRAPHY = {
  // Poppins headings
  hero:    { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, lineHeight: 30, letterSpacing: 0.2 },
  h1:      { fontFamily: 'Poppins_700Bold',      fontSize: 20, lineHeight: 26, letterSpacing: 0.1 },
  h2:      { fontFamily: 'Poppins_700Bold',      fontSize: 17, lineHeight: 22 },
  h3:      { fontFamily: 'Poppins_600SemiBold',  fontSize: 15, lineHeight: 20 },
  h4:      { fontFamily: 'Poppins_600SemiBold',  fontSize: 14, lineHeight: 19 },
  section: { fontFamily: 'Poppins_700Bold',      fontSize: 16.5, lineHeight: 22 },

  // Inter body
  bodyLg:  { fontFamily: 'Inter_500Medium',   fontSize: 14, lineHeight: 21 },
  body:    { fontFamily: 'Inter_400Regular',  fontSize: 13, lineHeight: 19 },
  bodySm:  { fontFamily: 'Inter_400Regular',  fontSize: 12, lineHeight: 16 },
  small:   { fontFamily: 'Inter_500Medium',   fontSize: 11.5, lineHeight: 16 },
  xs:      { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, lineHeight: 14 },
  micro:   { fontFamily: 'Inter_700Bold',     fontSize: 9.5,  lineHeight: 13 },

  // Special
  price:   { fontFamily: 'Poppins_700Bold',  fontSize: 16, lineHeight: 22 },
  badge:   { fontFamily: 'Inter_700Bold',    fontSize: 10.5, lineHeight: 14 },
  kicker:  { fontFamily: 'Inter_700Bold',    fontSize: 10.5, lineHeight: 14, letterSpacing: 1.6 },
  button:  { fontFamily: 'Inter_700Bold',    fontSize: 14, lineHeight: 20 },
} as const;
```

---

## 3. COMPONENT LIBRARY

### 3.1 Cards

| Component | PHBIMH Class | Notes |
|-----------|-------------|-------|
| `RestaurantCard` | `.rcard` | Visual header with gradient (138px), logo bubble, promo tag, meta row (rating/time/distance) |
| `StayCard` | `.lcard` | Visual header, type tag, spec row, price + book button |
| `RentalCard` | `.lcard` | Same layout as stay, different specs (beds/baths/size) |
| `TripCard` | `.lcard` | Visual header with price chip, duration, transport included pill |
| `FoodCard` | `.rcard` in `.food-list` | Larger visual (150px), fee chip, same body |
| `StaySplitCard` | `.split-card` | 2-column grid, gradient bg, emoji, arrow |
| `StayHorizontalCard` | `.scard` | Horizontal scroll, 110px visual, price chip |
| `GemCard` | `.gem` | Small (120px), visual + name + tag |
| `CommunityCard` | `.ccard` | Author row, category tag, text, actions |
| `NotificationCard` | `.nitem` | Icon circle, title, description, unread indicator |
| `OrderCard` | `.ocard` | Order number, status pill, progress bar, total |
| `DashStatCard` | `.dstat-c` | Stat with icon label, value, change indicator |

### 3.2 Buttons

| Component | PHBIMH Class | Usage |
|-----------|-------------|-------|
| `PrimaryButton` | `.btn-p` | Green bg, white text, shadow. Default action. |
| `SecondaryButton` | `.btn-o` | White bg, border, ink text. Alternate. |
| `DarkButton` | `.btn-dark` | Ink bg, white text. Special emphasis. |
| `BigButton` | `.bigbtn` | Larger padding, shadow, brand color. CTAs. |
| `IconButton` | `.iconbtn` | 42x42, rounded-14, border, shadow. Header actions. |
| `GhostIconButton` | `.iconbtn.ghost` | No border/bg. Transparent header. |
| `MiniButton` | `.minibtn` | Small pill, ink or brand bg. Card footers. |
| `OrderButton` | `.obtn` | Border pill. Order actions. |
| `AddButton` | `.addbtn` | 34x34, brand bg, white +. Menu items. |
| `FAB` | `.fab` | 54x54, green bg, white icon. Community post. |

### 3.3 Headers

| Component | Pattern | Notes |
|-----------|---------|-------|
| `StickyHeader` | `.hdr` | Sticky, blur 14px, transparent border. Poppins title. |
| `SolidHeader` | `.hdr.solid` | Solid bg with border. Sub-pages. |
| `PageHero` | `.page-hero` | Full-width gradient, emoji, kicker, h1, description. |
| `DetailHero` | `.dhero` | Full-width gradient, 210px. Detail pages. |
| `ProfileHeader` | `.prof-head` | Green gradient, 66px padding. Overlaps card. |
| `DashHero` | `.dash-hero` | Red gradient. Business dashboard. |

### 3.4 Bottom Navigation

```typescript
// .bnav pattern - light theme, blur backdrop
const TAB_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(16px)', // iOS; elevation on Android
  borderTopColor: '#E5EAE4',
  borderTopWidth: 1,
  height: 72,
  paddingTop: 10,
};
// Active: green (#0A7C4E) icon + text
// Inactive: #9AA8A0 icon + text
// Center tab: elevated button, gradient bg, white icon
```

**Rider tabs:** Home, Food, [Trips (center elevated)], Orders, Profile
**Driver tabs:** Dashboard, Requests, Food, Earnings, Trips, Profile
**Admin tabs:** Dashboard, Rides, Drivers, Users, Settings

### 3.5 Chips / Filters

| Component | Pattern | Notes |
|-----------|---------|-------|
| `ChipRow` | `.chiprow` | Horizontal scroll, 8px gap, no scrollbar |
| `Chip` | `.chip` | Pill, border, 12.5px. `.on` = ink bg white text. `.on.green` = green bg. |
| `DateChip` | `.dchip` | 56px wide, border, selected = brand bg |
| `SegmentedControl` | `.seg` | 2-option toggle, surface bg, pill selected |

### 3.6 Search Bars

| Component | Pattern | Notes |
|-----------|---------|-------|
| `SearchPill` | `.search-pill` | Rounded 18px, border, icon left, filter right. Home. |
| `SearchField` | `.search-field` | Rounded 16px, border, icon left, input. Food/browse. |
| `RideInput` | `.rinput` | Route inputs with colored dots (green/red). |

### 3.7 Map Components

| Component | Notes |
|-----------|-------|
| `MapContainer` | 230px, gradient bg (#DDEBE1 to #B3D8C4) |
| `MapPin` | 34x34, circle, brand color, bob animation |
| `MapCar` | 30x30, dark bg, car icon, shadow |
| `MapLabel` | Frosted glass label, location icon |

### 3.8 Profile Cards

| Component | Pattern | Notes |
|-----------|---------|-------|
| `ProfileCard` | `.prof-card` | Card with -46px top, avatar, name, email, edit |
| `StatGrid` | `.statgrid` | 4-col, card cells, green values, muted labels |
| `MenuList` | `.menu-list` | Vertical list, icon circles |

### 3.9 Stats / Dashboards

| Component | Pattern | Notes |
|-----------|---------|-------|
| `DashStatGrid` | `.dash-grid` | 2-col, stat cards with icon labels, change indicators |
| `ProfileStatGrid` | `.statgrid` | 4-col, compact stats |
| `DealCard` | `.deal-card` | Dark gradient, emoji, countdown timer |

### 3.10 Order Cards

```typescript
interface OrderCardProps {
  number: string;        // "#ORD-1042"
  status: string;        // "Out for delivery"
  statusClass: 'os-a' | 'os-p' | 'os-c'; // active/preparing/completed
  business: string;
  items: string;
  total: string;
  progress: number[];    // [1,1,1,0] filled segments
  actionLabel: string;   // "Track" or "Receipt"
  onAction: () => void;
}
```

### 3.11 Rating Components

| Component | Notes |
|-----------|-------|
| `StarRating` | Amber star + numeric rating |
| `RatingBadge` | Star + rating in pill |

### 3.12 Emergency / SOS

| Component | Pattern | Notes |
|-----------|---------|-------|
| `SOSHero` | `.sos-hero` | Red gradient, warning icon |
| `SOSButton` | `.sos-circle` | 128x128, red gradient, pulsing shadow |
| `DialCard` | `.dcard` | Icon circle (colored), name, phone. 2-col grid. |

### 3.13 Overlays / Feedback

| Component | Pattern | Notes |
|-----------|---------|-------|
| `PromoCarousel` | `.carousel` | Scroll snap, gradient slides, dots |
| `QuickTileGrid` | `.qgrid` | 4-col, icon tiles, gradient bg |
| `AlertStrip` | `.alert-strip` | Yellow gradient, icon, title, dismiss |
| `Drawer` | `.drawer` | Left slide-in, dark bg, user info, menu, promo |
| `BottomSheet` | `.sheet` | Bottom slide-up, handle bar, scrollable |
| `Toast` | `#toast` | Center-bottom pill, dark bg, white text |
| `SuccessModal` | `.success-wrap` | Ring with check, title, description, button |
| `ItineraryTimeline` | `.itin` | Vertical timeline, dots, connecting line |
| `TransportCard` | `.transport-card` | Dark gradient, transport details |
| `InclusionGrid` | `.incl-grid` | 2-col grid, check icons |
| `BookingWidget` | `.wsheet` | White card, date chips, stepper, total, big btn |
| `RoomOption` | `.roomopt` | Selectable room, visual, info, price |
| `StepperControl` | `.stepper-row` | Label + minus/plus buttons |
| `CartBar` | `.cartbar` | Floating bottom, dark bg, count, total |
| `RideOption` | `.ropt` | Selectable ride type, icon, name, price, ETA |
| `SummaryCard` | `.sumcard` | Subtotal, fees, total breakdown |
| `EmptyState` | `.empty` | Centered emoji, heading, description |

---

## 4. ANIMATION SYSTEM

### 4.1 Transitions

```typescript
export const ANIMATION = {
  // Screen transitions: .38s cubic-bezier(.22,.9,.24,1)
  screenEnter: { duration: 380, easing: [0.22, 0.9, 0.24, 1] },
  screenExit:  { duration: 380, easing: [0.22, 0.9, 0.24, 1] },

  // Sheet/drawer
  sheetEnter: { duration: 340, easing: [0.22, 0.9, 0.24, 1] },
  sheetExit:  { duration: 300, easing: 'ease-out' },

  // Button press scales
  pressScale: 0.92,      // .iconbtn:active
  pressScaleCard: 0.97,  // .rcard:active
  pressScaleChip: 0.9,   // .qtile:active .qi
  pressScaleBig: 0.95,   // .bigbtn:active
  pressScaleBtn: 0.98,   // .btn:active
  pressDuration: 150,

  // Loops
  sosPulse: { duration: 2400, easing: 'ease-in-out', loop: true },
  breathe:  { duration: 2400, easing: 'ease-in-out', loop: true },
  bob:      { duration: 2200, easing: 'ease-in-out', loop: true },
  shimmer:  { duration: 1200, loop: true },

  // One-shots
  successPop: { duration: 450, easing: [0.2, 1.4, 0.4, 1] },
  progressFill: { duration: 1000, easing: [0.22, 0.9, 0.24, 1] },
  toastEnter: { duration: 350, easing: [0.22, 0.9, 0.24, 1] },
  toastExit:  { duration: 350, easing: [0.22, 0.9, 0.24, 1] },
} as const;
```

### 4.2 Required Libraries

- `react-native-reanimated` - All animations
- `react-native-gesture-handler` - Drawer, sheets
- `@react-native-community/blur` or `expo-blur` - Header/drawer/nav blur

---

## 5. BUSINESS ISOLATION - Dynamic Theming

### 5.1 Business Identity Type

```typescript
// packages/shared/src/types/business.ts
export interface BusinessIdentity {
  id: string;
  name: string;
  type: 'restaurant' | 'stay' | 'rental' | 'trip' | 'shop' | 'bar' | 'beauty' | 'service';
  primaryColor: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  logo: string; // emoji or image URL
  verified: boolean;
}
```

### 5.2 Business Theme Context

```typescript
// packages/shared/src/theme/BusinessThemeContext.tsx
import React, { createContext, useContext } from 'react';
import { COLORS, GRADIENTS } from '../constants';

interface BusinessThemeContextValue {
  brand: string;
  brandLight: string;
  brandDark: string;
  gradient: readonly [string, string];
  gradientFull: readonly [string, string, string];
}

const BusinessThemeContext = createContext<BusinessThemeContextValue>({
  brand: COLORS.brand,
  brandLight: COLORS.brandLight,
  brandDark: COLORS.brandDark,
  gradient: GRADIENTS.primary,
  gradientFull: GRADIENTS.brandFull,
});

export function BusinessThemeProvider({
  business,
  children,
}: {
  business: BusinessIdentity;
  children: React.ReactNode;
}) {
  const value: BusinessThemeContextValue = {
    brand: business.primaryColor,
    brandLight: business.gradientEnd,
    brandDark: business.gradientStart,
    gradient: [business.gradientStart, business.gradientEnd] as const,
    gradientFull: [business.gradientStart, business.primaryColor, business.gradientEnd] as const,
  };

  return (
    <BusinessThemeContext.Provider value={value}>
      {children}
    </BusinessThemeContext.Provider>
  );
}

export function useBusinessTheme() {
  return useContext(BusinessThemeContext);
}
```

### 5.3 Usage Pattern

```tsx
// Restaurant detail wraps content in BusinessThemeProvider
function RestaurantDetailScreen({ route }) {
  const restaurant = getRestaurant(route.params.restaurantId);
  return (
    <BusinessThemeProvider business={restaurant}>
      <RestaurantDetailContent />
    </BusinessThemeProvider>
  );
}

// Child components consume business theme
function RestaurantHeader() {
  const { brand, gradient } = useBusinessTheme();
  return (
    <LinearGradient colors={gradient} style={styles.hero}>
      {/* Uses business-specific gradient */}
    </LinearGradient>
  );
}
```

### 5.4 Business Theme Data

```typescript
const RESTAURANTS: BusinessIdentity[] = [
  { id: 'cajori', name: 'Cajori Restaurant', type: 'restaurant',
    primaryColor: '#C1272D', gradientStart: '#5E0E12', gradientEnd: '#C1272D',
    accentColor: '#E5484D', logo: '\ud83e\udd90', verified: true },
  { id: 'baobab', name: 'Baobab Kitchen', type: 'restaurant',
    primaryColor: '#B45309', gradientStart: '#5F2E08', gradientEnd: '#D97706',
    accentColor: '#F59E0B', logo: '\ud83c\udf72', verified: true },
  { id: 'mamas', name: "Mama's Pizza", type: 'restaurant',
    primaryColor: '#EA580C', gradientStart: '#6B2306', gradientEnd: '#F97316',
    accentColor: '#FB923C', logo: '\ud83c\udf55', verified: true },
  { id: 'flame', name: 'Kruger Flame Grill', type: 'restaurant',
    primaryColor: '#0F766E', gradientStart: '#083B37', gradientEnd: '#0D9488',
    accentColor: '#14B8A6', logo: '\ud83e\udd69', verified: false },
  { id: 'coop', name: 'The Coop', type: 'restaurant',
    primaryColor: '#CA8A04', gradientStart: '#6B4A05', gradientEnd: '#EAB308',
    accentColor: '#FACC15', logo: '\ud83c\udf57', verified: false },
  { id: 'cu', name: 'CU Guesthouse', type: 'stay',
    primaryColor: '#0E9488', gradientStart: '#083B37', gradientEnd: '#14B8A6',
    accentColor: '#2DD4BF', logo: '\ud83d\udcde', verified: true },
  { id: 'phlodge', name: 'Phalaborwa Lodge', type: 'stay',
    primaryColor: '#B45309', gradientStart: '#4A2A06', gradientEnd: '#B45309',
    accentColor: '#D97706', logo: '\ud83c\udf3f', verified: true },
  { id: 'bheights', name: 'Baobab Heights', type: 'rental',
    primaryColor: '#4F46E5', gradientStart: '#1E1B4B', gradientEnd: '#6366F1',
    accentColor: '#818CF8', logo: '\ud83c\udfe2', verified: false },
  // ... add remaining businesses
];
```


---

## 6. SCREEN-BY-SCREEN IMPLEMENTATION GUIDE

### 6.1 Rider App (22 screens)

| Screen | Current State | PHBIMH Changes |
|--------|--------------|----------------|
| **SplashScreen** | ActivityIndicator | Full green gradient, breathing icon, "Phalaborwa In My Hand", loading bar, "Aegis AI" footer |
| **LoginScreen** | Dark bg | Light bg #F2F4F1, green auth mark, Poppins h1, Inter inputs, green primary btn, outline secondary |
| **RegisterScreen** | Dark bg | Same light auth pattern |
| **HomeScreen** | Dark map + orange gradient | **Full rewrite**: Light bg, avatar+greeting hero, search pill, promo carousel (4 slides), quick tile grid (8), alert strip, restaurant cards horizontal, split cards stays/rentals, trip cards, gem row, community preview |
| **RestaurantListScreen** | FlatList+GlassCard | 2-col grid, restaurant cards (138px gradient visual, logo bubble, promo tag, meta row) |
| **RestaurantMenuScreen** | Basic list | Detail hero (210px gradient), logo bubble, name+verified, stats row, promo, sticky menu tabs, items with thumb+add btn, floating cart bar |
| **FoodCheckoutScreen** | Basic checkout | Segmented delivery/pickup, checkout rows, promo input, textarea, summary card, green btn |
| **FoodOrderTrackingScreen** | Basic tracking | Order card with progress bar, status pill |
| **BookRideScreen** | Dark map, orange | Light map, green/red route inputs, ride option cards, summary, green request btn |
| **RideTrackingScreen** | Map view | Light map, car marker, ETA, driver card, cancel |
| **PaymentScreen** | Basic form | Payment method rows, summary card, green confirm |
| **RideHistoryScreen** | List | Segmented control (active/past), order cards with status pills + progress |
| **RideDetailScreen** | Basic detail | Map, route summary, fare breakdown, driver card |
| **ProfileScreen** | Gradient header | Green gradient (66px), profile card (-46px overlap), stat grid (4-col), menu list with icon circles |
| **WalletScreen** | Basic balance | Balance card, transaction list, top-up btn |
| **PromoCodeScreen** | Basic input | Deal card with countdown, promo input, apply btn |
| **ChatScreen** | Basic messages | Message bubbles, input bar, header back btn |
| **SupportScreen** | Basic form | Help items with icon circles, contact info, emergency btn |
| **NotificationScreen** | List | Notification items with colored icon circles, unread indicator |
| **ConsentScreen** | Basic checkbox | Green checkbox, Poppins heading, Inter description, accept btn |

### 6.2 Driver App (14 screens)

| Screen | Current State | PHBIMH Changes |
|--------|--------------|----------------|
| **DashboardScreen** | Dark basic stats | Red gradient hero, stat grid (revenue/orders/active/rating), weekly chart, latest orders |
| **RideRequestsScreen** | List | Ride request cards, pickup/destination inputs, accept/reject buttons |
| **ActiveRideScreen** | Map+status | Light map, route display, passenger info, complete ride btn |
| **FoodDeliveryScreen** | Basic list | Order cards with restaurant info, pickup/dropoff, status, accept/complete |
| **FoodOrderDetailScreen** | Basic detail | Restaurant hero, order items, status timeline |
| **EarningsScreen** | Stats | Earning cards, weekly summary, payout history |
| **TripHistoryScreen** | List | Trip cards with date, route, fare, status |
| **ProfileScreen** | Basic | Green gradient, stat grid, menu list (same as rider) |
| **DocumentsScreen** | Upload form | Document cards with upload status, expiry dates |
| **SupportScreen** | Form | Same as rider support |
| **LoginScreen** | Dark form | Light auth pattern |
| **ChatScreen** | Messages | Same as rider chat |
| **ConsentScreen** | Checkbox | Same as rider consent |

### 6.3 Admin App (13 screens + 16 components)

| Screen | Current State | PHBIMH Changes |
|--------|--------------|----------------|
| **AdminDashboardScreen** | Dark purple | Red gradient hero, stat grid (4 cards), chart, active rides, fleet, feed, top drivers |
| **RidesScreen** | List | Search bar, filter chips, ride cards with status, pickup/dropoff, fare |
| **RideDetailScreen** | Basic | Map, ride timeline, driver/rider info, fare breakdown |
| **DriversScreen** | List | Search, filter, driver cards with avatar, rating, status |
| **DriverDetailScreen** | Basic | Profile card, stats, ride history, documents, status toggle |
| **UsersScreen** | List | Search, filter, user cards with avatar, ride count, rating |
| **UserDetailScreen** | Basic | Profile card, ride history, payment methods |
| **SettingsScreen** | Form | Setting groups, toggles, input fields |
| **SurgePricingScreen** | Form | Surge multiplier grid, time slots, zone cards |
| **SurgeZonesScreen** | Map | Map with zone overlays, zone list |
| **PeakHoursScreen** | Chart | Hourly demand chart, surge recommendations |

**Admin Components to restyle:**
- `LuxuriousMenu` - Dark to light, backdrop blur, white card, green active
- `RideCard`, `UserCard`, `DriverCard` - Light bg, subtle shadows
- `StatCard`, `SearchBar`, `FilterTabs` - PHBIMH colors
- `ActiveRidesCard`, `PoolRidesCard`, `HourlyChart`, `FleetStatus` - Light theme
- `ActivityFeed`, `TopDrivers` - Light cards

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Foundation (Week 1)

1. Update `packages/shared/src/constants/index.ts` - New COLORS, GRADIENTS, TYPOGRAPHY, RADIUS, SHADOWS, ANIMATION
2. Add `@expo-google-fonts/poppins` to all three apps' package.json
3. Create `packages/shared/src/types/business.ts` - BusinessIdentity type
4. Create `packages/shared/src/theme/BusinessThemeContext.tsx` - BusinessThemeProvider, useBusinessTheme
5. Update `packages/shared/src/theme/ThemeContext.tsx` - Export new theme shape
6. Update shared components: Button, Card, Header, Chip, Typography, Badge, Avatar

### Phase 2: Rider App Core (Week 2)

1. Bottom Navigation - Light theme, green active, center elevated button
2. HomeScreen - Complete rewrite with all sections
3. RestaurantListScreen - 2-col grid with PHBIMH cards
4. RestaurantMenuScreen - Detail hero, menu tabs, cart bar
5. FoodCheckoutScreen - Segmented control, checkout flow

### Phase 3: Rider App Extended (Week 3)

1. BookRideScreen - Light map, PHBIMH route inputs
2. RideTrackingScreen - Light map, driver display
3. ProfileScreen - Green gradient, stat grid, menu list
4. Auth screens (Login, Register, ForgotPassword) - Light auth pattern
5. Wallet, PromoCode, Chat, Support, Notification, Consent, Payment, RideHistory, RideDetail, FoodOrderTracking

### Phase 4: Driver App (Week 4)

1. DashboardScreen - Red gradient hero, stat grid, chart, orders
2. RideRequestsScreen + ActiveRideScreen - PHBIMH cards
3. FoodDeliveryScreen + FoodOrderDetailScreen - Order cards
4. Earnings, TripHistory, Profile, Documents, Support, Login, Chat, Consent

### Phase 5: Admin App (Week 5)

1. AdminDashboardScreen - Red gradient hero, stat cards, charts
2. RidesScreen, DriversScreen, UsersScreen - List screens
3. RideDetailScreen, DriverDetailScreen, UserDetailScreen - Detail screens
4. SettingsScreen, SurgePricingScreen, SurgeZonesScreen, PeakHoursScreen
5. All admin components (LuxuriousMenu, cards, dashboard widgets)

### Phase 6: Polish (Week 6)

1. Animations - All press scales, screen transitions, SOS pulse, splash breathe, map bob
2. Blur effects - Headers, nav bar, drawer, sheets
3. Drawer - Slide-in navigation drawer (left)
4. Toast system - Center-bottom pill toasts
5. Success/empty states - Animated success ring, empty state illustrations
6. Verification checklist pass

---

## 8. CRITICAL CHANGES CHECKLIST

### What Changes in Every File

1. **Every StyleSheet.create** - Dark colors (#121212, #1c1c1e, #242426) to light (#F2F4F1, #FFFFFF, #E5EAE4)
2. **Every StatusBar** - barStyle: light-content to dark-content, backgroundColor to #F2F4F1
3. **Every LinearGradient** - ['#FFAD7A', '#e89b6a'] to ['#0B3B2A', '#0A7C4E']
4. **Every Text color** - #FFFFFF to #0F1713 (or appropriate light-theme color)
5. **Every TextInput placeholderTextColor** - #98989d to #8A978F
6. **Every tab bar** - Dark bg to light bg with blur, orange active to green active
7. **Every card bg** - #1c1c1e to #FFFFFF
8. **Every border** - #333333 to #E5EAE4
9. **Font families** - Add Poppins for all headings (Poppins_700Bold, etc.)

### Files to Create (New Components)

```
packages/shared/src/theme/BusinessThemeContext.tsx
packages/shared/src/types/business.ts

packages/shared/src/components/cards/RestaurantCard.tsx
packages/shared/src/components/cards/StayCard.tsx
packages/shared/src/components/cards/TripCard.tsx
packages/shared/src/components/cards/OrderCard.tsx
packages/shared/src/components/cards/CommunityCard.tsx
packages/shared/src/components/cards/GemCard.tsx
packages/shared/src/components/cards/DashStatCard.tsx

packages/shared/src/components/navigation/BottomNav.tsx
packages/shared/src/components/navigation/StickyHeader.tsx
packages/shared/src/components/navigation/PageHero.tsx
packages/shared/src/components/navigation/Drawer.tsx

packages/shared/src/components/forms/SearchPill.tsx
packages/shared/src/components/forms/SearchField.tsx
packages/shared/src/components/forms/RideInput.tsx
packages/shared/src/components/forms/ChipRow.tsx
packages/shared/src/components/forms/DateChipRow.tsx
packages/shared/src/components/forms/SegmentedControl.tsx
packages/shared/src/components/forms/StepperControl.tsx

packages/shared/src/components/overlays/BottomSheet.tsx
packages/shared/src/components/overlays/Toast.tsx
packages/shared/src/components/overlays/SuccessModal.tsx
packages/shared/src/components/overlays/FloatingCartBar.tsx

packages/shared/src/components/maps/MapContainer.tsx
packages/shared/src/components/maps/MapPin.tsx
packages/shared/src/components/maps/MapLabel.tsx

packages/shared/src/components/feedback/SOSButton.tsx
packages/shared/src/components/feedback/DialCard.tsx
packages/shared/src/components/feedback/EmptyState.tsx
packages/shared/src/components/feedback/AlertStrip.tsx
packages/shared/src/components/feedback/RatingBadge.tsx
packages/shared/src/components/feedback/ProgressBar.tsx
packages/shared/src/components/feedback/InclusionGrid.tsx
packages/shared/src/components/feedback/ItineraryTimeline.tsx
packages/shared/src/components/feedback/TransportCard.tsx
packages/shared/src/components/feedback/SummaryCard.tsx
packages/shared/src/components/feedback/BookingWidget.tsx
packages/shared/src/components/feedback/RoomOption.tsx
packages/shared/src/components/feedback/RideOption.tsx
packages/shared/src/components/feedback/PromoCarousel.tsx
packages/shared/src/components/feedback/QuickTileGrid.tsx
packages/shared/src/components/feedback/DealCard.tsx
packages/shared/src/components/feedback/StatGrid.tsx
```

---

## 9. VERIFICATION CHECKLIST

After implementation, verify:

- [ ] All screens use light bg (#F2F4F1), not dark
- [ ] All headers use Poppins font for titles
- [ ] All body text uses Inter font
- [ ] All buttons press to correct scale (0.92 icons, 0.97 cards, 0.95 big, 0.98 btn)
- [ ] All cards have SHADOWS.subtle by default
- [ ] Bottom nav has blur backdrop
- [ ] Green is the primary action color everywhere
- [ ] StatusBar is dark-content on light screens, light-content on dark heroes
- [ ] Each restaurant/business renders with its own gradient via BusinessThemeProvider
- [ ] Promo carousel auto-scrolls every 4.2s
- [ ] SOS button pulses (2.4s infinite)
- [ ] Search inputs have proper border radius (16-18px)
- [ ] All spacing follows SPACING scale (4/8/12/16/24/32/48)
- [ ] All border radii match PHBIMH (18/22/28)
- [ ] Driver dashboard uses red gradient hero
- [ ] Admin dashboard uses red gradient hero
- [ ] No hardcoded dark colors remain in any screen file
- [ ] Poppins loads correctly on both iOS and Android

---

*Plan generated from analysis of PHBIMH design reference (index.html, 1661 lines) and all 49 source files across rider (22), driver (14), and admin (13) apps.*
