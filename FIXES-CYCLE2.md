# QA Fixes — Cycle 2

**Date:** 2026-07-19
**Scope:** Rider press scale animations, ErrorBoundary wrappers, stat card radius, driver empty states

---

## Fixes Applied

### 1. Press Scale Animations

| Screen | Element | Scale | Status |
|--------|---------|-------|--------|
| `HomeScreen.tsx` | Quick tiles (8 tiles) | 0.95 | ✅ Fixed |
| `HomeScreen.tsx` | Recent destination items | 0.95 | ✅ Fixed |
| `RestaurantMenuScreen.tsx` | Menu items | 0.97 | ✅ Fixed |

**Implementation:**
- `HomeScreen.tsx`: Created `AnimatedPressTile` component using `Animated.spring` with `useNativeDriver: true`, speed 50, bounciness 4. Replaces `TouchableOpacity` with `Pressable` + `Animated.View` transform.
- `RestaurantMenuScreen.tsx`: Created `AnimatedPressMenuItem` component using same spring config. Wraps menu item `View` with `Pressable` + `Animated.View` scale transform.

### 2. ErrorBoundary Wrappers

| Screen | Import | Pattern | Status |
|--------|--------|---------|--------|
| `HomeScreen.tsx` | `import { ErrorBoundary } from '@easyryde/shared'` | Export wraps `HomeScreenInner` | ✅ Fixed |
| `RestaurantListScreen.tsx` | `import { Shimmer, ErrorBoundary } from '@easyryde/shared'` | Export wraps `RestaurantListScreenInner` | ✅ Fixed |
| `RestaurantMenuScreen.tsx` | `import { GlowButton, Badge, LoadingOverlay, ErrorBoundary } from '@easyryde/shared'` | Export wraps `RestaurantMenuScreenInner` | ✅ Fixed |
| `ProfileScreen.tsx` | `import { Avatar, ErrorBoundary } from '@easyryde/shared'` | Export wraps `ProfileScreenInner` | ✅ Fixed |

**Pattern:** Each screen's default export is renamed to `*Inner`, and a new default export wraps it with `<ErrorBoundary>`. Uses the shared `ErrorBoundary` class component from `@easyryde/shared` (renders error message + retry button on crash).

### 3. Stat Card Border Radius

| Screen | Element | Before | After | Status |
|--------|---------|--------|-------|--------|
| `HomeScreen.tsx` | `statCard` | `borderRadius: 16` | `borderRadius: 18` | ✅ Fixed |

Now matches design spec `r-lg: 18px`.

### 4. Driver Empty States

| Screen | State | Before | After | Status |
|--------|-------|--------|-------|--------|
| `RideRequestsScreen.tsx` | History tab (no trips) | No ListEmptyComponent | Icon + title + subtitle | ✅ Fixed |
| `EarningsScreen.tsx` | No earnings data | No empty state | Icon + title + subtitle when `weekTotal === 0 && recentTrips.length === 0` | ✅ Fixed |
| `TripHistoryScreen.tsx` | No trips | Icon + title only | Icon + title + subtitle | ✅ Fixed |

**Empty state pattern** (consistent with existing driver app):
- 80x80 `COLORS.surfaceLight` circle with 48px Ionicons icon
- `Poppins_700Bold` 18px title
- `Inter_400Regular` 14px muted subtitle

---

## Files Modified

| # | File | Changes |
|---|------|---------|
| 1 | `mobile/apps/rider/screens/HomeScreen.tsx` | `AnimatedPressTile` component, quick tiles + recent items press scale, `statCard` borderRadius 16→18, ErrorBoundary wrapper |
| 2 | `mobile/apps/rider/screens/RestaurantMenuScreen.tsx` | `AnimatedPressMenuItem` component, menu items press scale, ErrorBoundary wrapper |
| 3 | `mobile/apps/rider/screens/RestaurantListScreen.tsx` | ErrorBoundary wrapper |
| 4 | `mobile/apps/rider/screens/ProfileScreen.tsx` | ErrorBoundary wrapper |
| 5 | `mobile/apps/driver/screens/RideRequestsScreen.tsx` | History tab ListEmptyComponent with icon/title/subtitle |
| 6 | `mobile/apps/driver/screens/EarningsScreen.tsx` | Empty state for zero earnings + styles |
| 7 | `mobile/apps/driver/screens/TripHistoryScreen.tsx` | Enhanced empty state with icon circle + subtitle |

---

## Verification Checklist

- [x] Quick tiles scale to 0.95 on press in HomeScreen
- [x] Recent items scale to 0.95 on press in HomeScreen
- [x] Menu items scale to 0.97 on press in RestaurantMenuScreen
- [x] HomeScreen wrapped in ErrorBoundary
- [x] RestaurantListScreen wrapped in ErrorBoundary
- [x] RestaurantMenuScreen wrapped in ErrorBoundary
- [x] ProfileScreen wrapped in ErrorBoundary
- [x] `statCard.borderRadius` changed from 16 to 18
- [x] RideRequestsScreen history tab has empty state
- [x] EarningsScreen shows empty state when no earnings
- [x] TripHistoryScreen empty state has icon + title + subtitle
