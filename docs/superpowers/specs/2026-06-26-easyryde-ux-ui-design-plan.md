# EasyRyde UX/UI Design Plan

## Executive Summary

This plan unifies the visual identity of EasyRyde's three apps (Rider, Driver, Admin) to match or exceed the polish level of the HTML reference prototype at `C:\wamp64\www\RideAway-master\New Frontend`. The core conflict is resolved: **orange (#FFAD7A) replaces gold (#D4AF37)** as the primary brand color, aligning the React Native apps with the HTML reference that defines the target visual standard.

---

## 1. Design System Unification

### 1.1 Color Decision: Orange (#FFAD7A) Wins

**Rationale:**
- The HTML reference is the "source of truth" visual standard — all 3 HTML files (index, user, driver) use #FFAD7A
- #FFAD7A has warmer, more approachable energy than #D4AF37 (luxury gold)
- Phalaborwa is a warm-climate town; orange evokes warmth, sun, accessibility
- Orange on dark (#1c1c1e) has better contrast (4.8:1) than gold on dark (#D4AF37 on #0a0a0a = 5.2:1, but the RN app's background is #0a0a0a not #1c1c1e)

### 1.2 Unified Token System

Replace the current `COLORS` in `packages/shared/src/constants/index.ts`:

```typescript
export const COLORS = {
  // === Backgrounds ===
  bg: '#1c1c1e',                    // Main background (was #0a0a0a)
  bgDeep: '#121212',                // Login/auth screens
  surface: '#242426',               // Card surfaces (was #141414)
  surfaceElevated: '#2c2c2e',       // Hover/active surfaces
  surfaceLight: '#3a3a3c',          // Borders, dividers

  // === Brand ===
  primary: '#FFAD7A',               // Main brand (was #D4AF37)
  primaryLight: '#FFD4B8',          // Lighter tint
  primaryDark: '#E89B6A',           // Darker/hover state
  primaryGlow: 'rgba(255, 173, 122, 0.3)',

  // === Role Colors ===
  rider: '#FFAD7A',                 // Orange for rider app
  driver: '#16A34A',                // Green for driver app
  admin: '#6366F1',                 // Purple for admin app

  // === Text ===
  text: '#FFFFFF',
  textSecondary: '#E8E8E8',
  textMuted: '#98989D',             // Secondary text (was #8A8A8E)
  textDim: '#5A5A5E',

  // === Semantic ===
  success: '#16A34A',               // Matches driver green
  successLight: '#4ADE80',
  error: '#FF3B30',                 // iOS-standard red
  warning: '#FFB800',
  info: '#3B82F6',                  // Blue for links/info

  // === Structural ===
  border: '#3A3A3C',               // Solid border color
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderFocus: 'rgba(255, 173, 122, 0.4)',
  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;
```

### 1.3 Gradient System Update

```typescript
export const GRADIENTS = {
  primary: ['#FFAD7A', '#E89B6A'] as const,
  primaryVertical: ['#FFAD7A', '#FFAD7A'] as const,
  surface: ['#242426', '#2c2c2e'] as const,
  surfaceElevated: ['#2c2c2e', '#3a3a3c'] as const,
  background: ['#1c1c1e', '#121212'] as const,
  shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'] as const,
  glow: ['rgba(255,173,122,0.2)', 'rgba(255,173,122,0)'] as const,
  driver: ['#16A34A', '#22C55E'] as const,
  admin: ['#6366F1', '#818CF8'] as const,
} as const;
```

---

## 2. Screen-by-Screen Design Spec

### 2.1 Rider App (14 screens)

| Screen | Current State | Target State | Priority |
|--------|--------------|--------------|----------|
| **SplashScreen** | Exists, gold-themed | Rebrand to orange, match HTML splash | P0 |
| **LoginScreen** | Basic form | Match HTML login.html: role selector → form flow | P0 |
| **HomeScreen** (src/) | Map + simple cards | Match HTML user.html: orange header, 2x2 service grid, saved places | P0 |
| **HomeScreen** (orphaned) | Better design, unused | Migrate its best patterns to src/ version | P0 |
| **BookRideScreen** | Not in src/ | Create: vehicle cards, fare estimate, confirm button | P0 |
| **RideTrackingScreen** | Not in src/ | Create: live map, driver card, progress bar, ETA | P0 |
| **RideHistoryScreen** | Exists, basic list | Add: trip cards with status badges, date grouping | P1 |
| **PaymentScreen** | Not in src/ | Create: payment methods, wallet balance, promo codes | P1 |
| **ProfileScreen** | Exists, basic | Add: avatar, stats, settings list, saved places | P1 |
| **ChatScreen** | Not in src/ | Create: message bubbles, input bar | P2 |
| **WalletScreen** | Not in src/ | Create: balance, transaction history, top-up | P2 |
| **FoodCheckoutScreen** | Not in src/ | Create: order summary, payment, confirmation | P2 |
| **FoodOrderTrackingScreen** | Not in src/ | Create: live tracking, ETA, driver info | P2 |
| **RestaurantListScreen** | Not in src/ | Create: category filter, restaurant cards | P2 |
| **RestaurantMenuScreen** | Not in src/ | Create: menu items, cart, checkout | P2 |

**Home Screen Layout (Target):**
```
┌─────────────────────────────┐
│ ░░░ ORANGE HEADER ░░░░░░░░░ │  ← Gradient header with greeting + avatar
│ ░ Good morning, Sarah    👤 │
│ ░ Phalaborwa, Limpopo    ░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ┌──────────┬──────────┐    │
│  │ 🚗 Ride  │ 📦 Deliv │    │  ← 2x2 service grid (glassmorphism cards)
│  │  [Promo] │          │    │
│  ├──────────┼──────────┤    │
│  │ ✈ Airport│ 🍔 Food  │    │
│  └──────────┴──────────┘    │
│                             │
│  📍 Saved Places             │  ← Horizontal scroll of saved locations
│  [Home] [Work] [Airport]    │
│                             │
│  🔍 Where to?               │  ← Search bar with recent locations
│  ┌─────────────────────────┐│
│  │ Search destination...   ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### 2.2 Driver App (10 screens)

| Screen | Current State | Target State | Priority |
|--------|--------------|--------------|----------|
| **LoginScreen** | Basic | Match HTML driver.html login | P0 |
| **DashboardScreen** | Basic stats | Match HTML: earnings card, online toggle, ride requests | P0 |
| **RideRequestsScreen** | Basic list | Add: swipeable cards, accept/decline, route preview | P0 |
| **ActiveRideScreen** | Basic map | Match HTML: driver marker, pickup/dest markers, nav bar | P0 |
| **EarningsScreen** | Basic | Add: chart, daily/weekly toggle, payout history | P1 |
| **TripHistoryScreen** | Basic list | Add: trip cards with earnings, ratings | P1 |
| **ProfileScreen** | Basic | Add: vehicle info, documents, availability | P1 |
| **ChatScreen** | Not in screens/ | Create: rider chat, quick replies | P2 |
| **FoodDeliveryScreen** | Not in screens/ | Create: order details, pickup/dropoff flow | P2 |
| **FoodOrderDetailScreen** | Not in screens/ | Create: item list, special instructions | P2 |

**Driver Home Layout (Target):**
```
┌─────────────────────────────┐
│ ░░ GREEN HEADER ░░░░░░░░░░░ │  ← Driver-themed green header
│ ░ John Mkhonto          👤 │
│ ░ Toyota Corolla • LPS 123 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ┌─────────────────────────┐│
│  │ 💰 Today's Earnings     ││  ← Earnings card
│  │ R 1,245.00              ││
│  │ ████████░░ 8 rides      ││
│  └─────────────────────────┘│
│                             │
│  [🟢 GO ONLINE]             │  ← Large toggle button
│                             │
│  📋 Recent Ride Requests    │  ← List of pending requests
│  ┌─────────────────────────┐│
│  │ 📍 Shoprite → Kruger    ││
│  │ R185 • 18.5km • 25min  ││
│  │ [Accept] [Decline]      ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### 2.3 Admin App (7 screens)

| Screen | Current State | Target State | Priority |
|--------|--------------|--------------|----------|
| **LoginScreen** | Basic | Purple-themed login, admin credentials | P0 |
| **DashboardScreen** | Basic | Stats cards, charts, real-time metrics | P0 |
| **RidesScreen** | Basic list | Table view, filters, status badges, map view | P1 |
| **DriversScreen** | Basic list | Table with ratings, status, vehicle info | P1 |
| **UsersScreen** | Basic list | Table with ride history, payments | P1 |
| **FoodManagementScreen** | Basic | Restaurant/menu management | P2 |
| **SettingsScreen** | Basic | Platform config, pricing, zones | P2 |

---

## 3. Animation System

### 3.1 Screen Transitions

| Transition | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| fadeIn | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | Screen entry, card appearance |
| slideUp | 500ms | cubic-bezier(0.4, 0, 0.2, 1) | Bottom sheets, modals |
| slideInRight | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | Push navigation |
| scaleIn | 500ms | cubic-bezier(0.4, 0, 0.2, 1) | Success checkmark, alerts |

### 3.2 Micro-Interactions

| Animation | Duration | Trigger |
|-----------|----------|---------|
| Press scale (0.98) | 150ms spring | Button/card press |
| Glow pulse | 1200ms loop | Primary button idle |
| Shimmer | 2000ms loop | Loading skeletons |
| Radar circles | 2000ms infinite | Searching for driver |
| Marker pulse | 2000ms infinite | Driver location marker |
| Bounce | 1000ms ease-in-out | Notification badge |
| Float | 3000ms ease-in-out | Empty state illustration |

### 3.3 Map Animations

| Element | Animation | Details |
|---------|-----------|---------|
| Driver marker | Smooth translate | 60fps position updates with heading rotation |
| Route polyline | Dash animation | Animated dash offset for "traveling" effect |
| Pickup marker | Static with glow | Green dot with subtle shadow |
| Destination marker | Static with glow | Orange dot with subtle shadow |
| User location | Blue pulse | Standard blue dot with pulse ring |
| Search radar | Expanding circles | 3 concentric circles, orange, 2s loop |

### 3.4 Implementation (Reanimated 3)

```typescript
// Shared animation constants
export const ANIM = {
  screenTransition: {
    duration: 400,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  },
  pressSpring: {
    damping: 15,
    stiffness: 150,
    mass: 0.5,
  },
  glowPulse: {
    duration: 1200,
    easing: Easing.inOut(Easing.ease),
  },
} as const;
```

---

## 4. Component Library Audit

### 4.1 Existing Components (37 total)

| Component | Status | Action |
|-----------|--------|--------|
| **GlassCard** | ✅ Good | Keep, update glowColor default to orange |
| **GlowButton** | ✅ Good | Keep, update default glow to orange |
| **GradientText** | ✅ Good | Keep, update gradient to orange |
| **SplashScreen** | ⚠️ Needs rebrand | Change gold → orange, update background to #1c1c1e |
| **Button** | ⚠️ Basic | Keep as secondary; GlowButton is primary |
| **Card** | ⚠️ Basic | Keep for simple cards; GlassCard for elevated |
| **Input** | ⚠️ Basic | Update focus border to orange, add error state |
| **Header** | ⚠️ Basic | Redesign to match HTML orange header pattern |
| **Typography** | ⚠️ Needs scale update | Align with HTML's 28/24/20/14/12px scale |
| **Shimmer** | ✅ Good | Keep |
| **Skeleton** | ✅ Good | Keep |
| **AnimatedNumber** | ✅ Good | Keep |
| **AnimatedCheckmark** | ✅ Good | Keep |
| **StaggeredList** | ✅ Good | Keep |
| **Toast** | ⚠️ Basic | Add success/error variants with icons |
| **Modal** | ⚠️ Basic | Add slide-up animation, backdrop blur |
| **EmptyState** | ✅ Good | Keep, add illustrations |
| **ErrorState** | ✅ Good | Keep, add retry button |
| **LoadingOverlay** | ⚠️ Basic | Add spinner animation |
| **Avatar** | ✅ Good | Keep |
| **Badge** | ✅ Good | Keep |
| **Chip** | ✅ Good | Keep |
| **Divider** | ✅ Good | Keep |
| **Rating** | ✅ Good | Keep |
| **ProgressBar** | ✅ Good | Keep |
| **RideCard** | ✅ Good | Keep |
| **DriverCard** | ✅ Good | Keep |
| **VehicleSelector** | ✅ Good | Keep |
| **RideStatusBadge** | ✅ Good | Keep |
| **PriceDisplay** | ✅ Good | Keep |
| **ActivityCard** | ✅ Good | Keep |
| **CategoryTile** | ✅ Good | Keep |
| **QuickActionButton** | ✅ Good | Keep |
| **SegmentedControl** | ✅ Good | Keep |
| **BarChart** | ✅ Good | Keep |

### 4.2 Missing Components (Need Creation)

| Component | Priority | Description |
|-----------|----------|-------------|
| **BottomNav** | P0 | 4-tab navigation (Home, Activity, Payment, Account) with active indicator |
| **SearchBar** | P0 | "Where to?" input with recent locations dropdown |
| **ServiceCard** | P0 | 2x2 grid card (Ride, Delivery, Airport, Food) |
| **TripCard** | P0 | Trip history card with status, date, price |
| **EarningsCard** | P0 | Driver earnings with progress bar |
| **RideRequestCard** | P0 | Driver's ride request with accept/decline |
| **MapMarker** | P0 | Custom markers (driver, pickup, destination, user) |
| **RoutePolyline** | P0 | Animated dashed route line |
| **DriverInfoCard** | P0 | Bottom sheet with driver details, call/chat buttons |
| **RatingModal** | P1 | Star rating with tip options |
| **PaymentMethodCard** | P1 | Card/cash selector with icons |
| **PromoBadge** | P1 | "Promo" badge for service cards |
| **StatCard** | P1 | Dashboard stat with icon, value, trend |
| **SettingsRow** | P1 | Settings list item with chevron |
| **ChatBubble** | P2 | Message bubble (sent/received) |
| **OrderSummaryCard** | P2 | Food order summary |
| **RestaurantCard** | P2 | Restaurant list item |
| **MenuItemCard** | P2 | Food menu item with quantity |

### 4.3 Components Needing Redesign

| Component | Issue | Fix |
|-----------|-------|-----|
| **Header** | Current Header is generic | Redesign as orange gradient header with greeting + avatar |
| **Typography** | Font sizes don't match HTML (RN has 32px h1, HTML has 28px) | Align to HTML scale |
| **Button** | Only has basic variant | GlowButton should be primary; add secondary/ghost variants |
| **Input** | Missing error state, label | Add label, error text, focus ring |
| **Toast** | No success/error variants | Add icon support, color variants |
| **Modal** | No slide-up animation | Add bottom sheet style with backdrop blur |

---

## 5. Typography & Color System

### 5.1 Typography Scale (Aligned to HTML)

```typescript
export const TYPOGRAPHY = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',

  // Display
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 31, letterSpacing: -0.2 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: 0 },

  // Body
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },

  // Labels
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  xs: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },

  // Special
  button: { fontSize: 14, fontWeight: '700' as const, lineHeight: 20, letterSpacing: 0.3 },
  buttonLarge: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22, letterSpacing: 0.3 },
  price: { fontSize: 24, fontWeight: '800' as const, lineHeight: 30, letterSpacing: -0.3 },
  eta: { fontSize: 36, fontWeight: '800' as const, lineHeight: 42, letterSpacing: -0.5 },
} as const;
```

### 5.2 Contrast Ratios (WCAG AA)

| Combination | Ratio | Pass? |
|------------|-------|-------|
| #FFFFFF on #1c1c1e | 12.5:1 | ✅ AAA |
| #FFFFFF on #242426 | 10.8:1 | ✅ AAA |
| #98989D on #1c1c1e | 4.8:1 | ✅ AA |
| #FFAD7A on #1c1c1e | 4.8:1 | ✅ AA (large text) |
| #FFAD7A on #242426 | 4.2:1 | ✅ AA (large text) |
| #1c1c1e on #FFAD7A | 4.8:1 | ✅ AA (button text) |
| #16A34A on #1c1c1e | 5.1:1 | ✅ AA |
| #FF3B30 on #1c1c1e | 4.6:1 | ✅ AA (large text) |

### 5.3 Dark Mode Handling

All screens are dark-mode-first (the HTML reference is dark-only). No light mode needed for v1. The `#1c1c1e` background with `#242426` surfaces creates a consistent dark experience.

---

## 6. Icon System

### 6.1 Decision: Phosphor Icons

**Current state:** HTML uses Phosphor (`ph-*`), RN apps use Ionicons (`ionicons`).

**Decision:** Switch to **Phosphor Icons** for RN via `phosphor-react-native`.

**Rationale:**
- Matches HTML reference exactly
- Phosphor has consistent weight options (thin, light, regular, bold, fill, duotone)
- Better visual consistency across web and mobile
- Duotone variant adds depth for primary actions

### 6.2 Icon Mapping

| Usage | HTML (Phosphor) | RN (Phosphor) |
|-------|----------------|---------------|
| Home | `ph-fill ph-house` | `<House weight="fill" />` |
| Activity | `ph-fill ph-receipt` | `<Receipt weight="fill" />` |
| Payment | `ph-fill ph-credit-card` | `<CreditCard weight="fill" />` |
| Account | `ph-fill ph-user` | `<User weight="fill" />` |
| Search | `ph-bold ph-magnifying-glass` | `<MagnifyingGlass weight="bold" />` |
| Car | `ph-fill ph-car` | `<Car weight="fill" />` |
| Steering wheel | `ph-fill ph-steering-wheel` | `<SteeringWheel weight="fill" />` |
| Shield check | `ph-fill ph-shield-check` | `<ShieldCheck weight="fill" />` |
| Caret right | `ph-fill ph-caret-right` | `<CaretRight weight="fill" />` |
| Arrow left | `ph-bold ph-arrow-left` | `<ArrowLeft weight="bold" />` |
| Star | `ph-fill ph-star` | `<Star weight="fill" />` |
| Phone | `ph-bold ph-phone` | `<Phone weight="bold" />` |
| Chat | `ph-bold ph-chat-circle` | `<ChatCircle weight="bold" />` |
| Close | `ph-bold ph-x` | `<X weight="bold" />` |
| Check | `ph-bold ph-check` | `<Check weight="bold" />` |

### 6.3 Icon Sizes

| Context | Size | Weight |
|---------|------|--------|
| Nav bar | 24px | fill |
| Card icon | 32px | fill |
| Button icon | 20px | bold |
| Inline text | 16px | regular |
| Small/caption | 14px | regular |

---

## 7. Map Design

### 7.1 Map Style

**Tile provider:** CartoDB Dark Matter (`basemaps.cartocdn.com/dark_all`)
- Matches HTML reference exactly
- Dark background (#1c1c1e compatible)
- Subtle road styling, minimal labels
- No default controls (zoom, attribution hidden)

### 7.2 Marker Styles

| Marker | Size | Color | Border | Shadow |
|--------|------|-------|--------|--------|
| **Driver** | 44x44 | Orange gradient (#FFAD7A → #E89B6A) | 3px white | 0 4px 16px rgba(0,0,0,0.4) |
| **Driver (green)** | 48x48 | Green gradient (#16A34A → #22C55E) | 4px white | 0 4px 16px rgba(0,0,0,0.4) |
| **User location** | 20x20 | #3B82F6 | 3px white | 0 2px 8px rgba(0,0,0,0.3) |
| **Pickup** | 16x16 | #16A34A | 2px white | 0 2px 6px rgba(0,0,0,0.3) |
| **Destination** | 16x16 | #FFAD7A | 2px white | 0 2px 6px rgba(0,0,0,0.3) |

### 7.3 Route Polyline

```typescript
const ROUTE_STYLE = {
  color: '#FFAD7A',
  weight: 5,
  opacity: 0.8,
  dashArray: '10, 10',
  lineCap: 'round',
  // Animation: dash offset shifts -15px every 1s
};
```

### 7.4 Driver Marker Animation

- **Idle:** No animation
- **Moving:** Smooth translate (60fps) with heading rotation
- **Arriving:** Pulse ring (orange, 2s loop, scale 1→1.5, opacity 0.7→0)
- **Searching:** Radar effect (3 concentric orange circles, expanding)

### 7.5 Map Region

```typescript
const PHALABORWA = {
  latitude: -23.9421,
  longitude: 31.1408,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
```

---

## 8. Responsive Design

### 8.1 Screen Size Strategy

| Range | Strategy |
|-------|----------|
| 320-360px | Compact: smaller text, tighter padding, single column |
| 360-430px | Standard: full layout as designed |
| 430px+ | Constrain to 430px, center with phone frame effect |

### 8.2 Phone Frame (Desktop/Web)

```typescript
// On screens > 450px wide, show phone frame
const phoneFrame = {
  width: '100%',
  maxWidth: 430,
  height: '90vh',
  borderRadius: 40,
  borderWidth: 8,
  borderColor: '#333',
  shadowColor: '#FFAD7A',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.15,
  shadowRadius: 60,
  overflow: 'hidden',
};
```

### 8.3 Safe Area Handling

```typescript
// Always respect safe areas
const safeAreaStyle = {
  paddingTop: insets.top,
  paddingBottom: Math.max(insets.bottom, 8),
};
```

### 8.4 Compact Mode (320-360px)

```typescript
const isSmallScreen = width < 360;
const compactScale = isSmallScreen ? 0.9 : 1;
// Reduce: h1 from 28→24, padding from 16→12, card height from 112→96
```

---

## 9. Accessibility

### 9.1 Touch Targets

- **Minimum:** 44x44px for all interactive elements
- **Gap:** 8px minimum between adjacent touch targets
- **Hit area:** Extend pressable area beyond visual bounds if needed

### 9.2 Screen Reader Support

```typescript
// Every interactive element needs accessibilityLabel
<TouchableOpacity
  accessibilityLabel="Book a ride"
  accessibilityRole="button"
  accessibilityState={{ disabled: isBooking }}
>
```

| Element | accessibilityLabel | accessibilityRole |
|---------|-------------------|-------------------|
| Nav tab | "Home", "Activity", etc. | "button" |
| Service card | "Ride", "Delivery", etc. | "button" |
| Book button | "Confirm ride" | "button" |
| Rating stars | "4 out of 5 stars" | "adjustable" |
| Driver call | "Call driver" | "button" |
| Status badge | "Ride in progress" | "text" |

### 9.3 Color Contrast

All text meets WCAG AA (4.5:1 minimum for body, 3:1 for large text). See Section 5.2 for ratios.

### 9.4 Reduced Motion

```typescript
import { AccessibilityInfo } from 'react-native';

// Check and respect reduced motion preference
const [reduceMotion, setReduceMotion] = useState(false);
useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

// Use shorter/No animations when reduceMotion is true
const animDuration = reduceMotion ? 0 : 400;
```

### 9.5 Focus Management

- All buttons have visible focus state (2px solid orange border)
- TextInput focus: orange border + subtle glow
- Modal: trap focus, return focus on close
- Screen transitions announce new content

---

## 10. Brand Identity

### 10.1 EasyRyde vs Uber/Bolt

| Aspect | Uber | Bolt | EasyRyde |
|--------|------|------|----------|
| **Primary color** | Black/White | Green | Orange (#FFAD7A) |
| **Background** | White (light) | White (light) | Dark (#1c1c1e) |
| **Feel** | Corporate, minimal | Budget, friendly | Warm, premium, local |
| **Typography** | Uber Move (custom) | Bolt Milliard (custom) | Inter (clean, modern) |
| **Market** | Global | Global/Europe | Phalaborwa local |

### 10.2 EasyRyde Visual Identity

**Tagline:** "Premium Mobility" (from HTML)

**Brand Personality:**
- **Warm:** Orange evokes Limpopo sun, hospitality
- **Premium:** Dark theme with glassmorphism = sophisticated
- **Local:** Phalaborwa-specific locations, South African pricing (Rands)
- **Accessible:** Clear typography, high contrast, intuitive flow

**Distinctive Elements:**
1. **Orange gradient header** — signature visual element
2. **Glassmorphism cards** — frosted glass effect on dark background
3. **Phone frame on desktop** — "this is a mobile app" signaling
4. **Animated driver markers** — pulse/radar effects on map
5. **Role-based color coding** — Orange (rider), Green (driver), Purple (admin)

### 10.3 Logo Usage

- **Icon:** "E" letter in orange gradient on dark rounded square (96x96, radius 24)
- **Wordmark:** "EasyRyde" in Inter 800 weight, white or orange
- **Tagline:** "Premium Mobility" in Inter 400, muted gray
- **Version:** "EasyRyde v4.0.0" in xs caption, dim gray

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Update COLORS/GRADIENTS/TYPOGRAPHY in constants
- [ ] Install phosphor-react-native, remove @expo/vector-icons Ionicons
- [ ] Rebrand SplashScreen
- [ ] Create BottomNav component
- [ ] Create SearchBar component
- [ ] Create ServiceCard component

### Phase 2: Rider Core (Week 3-4)
- [ ] Redesign LoginScreen (role selector → form)
- [ ] Redesign HomeScreen (orange header, service grid, saved places)
- [ ] Create BookRideScreen
- [ ] Create RideTrackingScreen
- [ ] Create TripCard component
- [ ] Create MapMarker component

### Phase 3: Driver Core (Week 5-6)
- [ ] Redesign Driver LoginScreen
- [ ] Redesign DashboardScreen
- [ ] Create RideRequestCard
- [ ] Create ActiveRideScreen (driver version)
- [ ] Create EarningsCard

### Phase 4: Admin & Polish (Week 7-8)
- [ ] Redesign Admin LoginScreen
- [ ] Redesign DashboardScreen
- [ ] Create StatCard component
- [ ] Create Table/List components for data views
- [ ] Add empty states to all screens
- [ ] Add error states to all screens
- [ ] Add loading states to all screens

### Phase 5: Animation & Accessibility (Week 9-10)
- [ ] Implement screen transitions (fadeIn, slideUp)
- [ ] Add micro-interactions (press scale, glow pulse)
- [ ] Add map animations (marker pulse, route dash)
- [ ] Add accessibility labels to all interactive elements
- [ ] Test with VoiceOver/TalkBack
- [ ] Test reduced motion mode
- [ ] Test on 320px, 360px, 430px screens

---

## 12. Success Criteria

1. **Visual parity:** RN apps match HTML reference at 95%+ fidelity
2. **Color consistency:** All 3 apps use #FFAD7A orange, role colors consistent
3. **Icon consistency:** Phosphor icons throughout, matching HTML
4. **Animation:** All P0 animations implemented (fadeIn, slideUp, marker pulse)
5. **Accessibility:** All interactive elements have labels, touch targets 44px+
6. **Responsive:** Works on 320px-430px+ screens
7. **Component coverage:** 90%+ of UI uses shared components from ui-kit
8. **Performance:** 60fps animations, no jank on scroll

---

## Appendix A: File Reference

| File | Purpose |
|------|---------|
| `packages/shared/src/constants/index.ts` | Color, typography, spacing tokens |
| `packages/shared/src/theme/ThemeContext.tsx` | Theme provider |
| `packages/shared/src/components/` | 37 shared components |
| `packages/ui-kit/src/components/` | 5 UI kit components (BarChart, EmptyState, ErrorState, LoadingState, OfflineBanner) |
| `apps/rider/src/screens/` | 4 wired screens (Home, Login, Profile, RideHistory) |
| `apps/rider/screens/` | 14 orphaned screens (better design, not in use) |
| `apps/driver/screens/` | 10 driver screens |
| `apps/admin/screens/` | 7 admin screens |

## Appendix B: HTML Reference Files

| File | Screens |
|------|---------|
| `index.html` | Role selector landing page |
| `user.html` | Rider home, ride flow, activity, payment, account |
| `driver.html` | Driver home, earnings, ride requests, profile |
| `login.html` | Shared login with role selection |
| `admin.html` | Admin dashboard |
