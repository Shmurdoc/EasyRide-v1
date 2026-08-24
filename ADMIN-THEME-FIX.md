# Admin Theme Fix — Maroon → Brand Green

## Problem
Visual QA found the Admin app used **dark red/maroon gradients** (`#3D0C0E → #7A1518 → #C1272D`) in all screen headers, plus indigo `#6366f1` in several components. Should be **brand green `#0A7C4E`**.

## Root Cause
`ADMIN_GRADIENTS.header` in `constants/theme.ts:21` was set to red/maroon values. All screens import this gradient for their `LinearGradient` headers. Several components also had hardcoded indigo (`#6366f1`) instead of using the theme.

## Files Changed

| File | Line | Old | New |
|------|------|-----|-----|
| `constants/theme.ts` | 21 | `['#3D0C0E', '#7A1518', '#C1272D']` | `['#0B3B2A', '#0A7C4E', '#12A86B']` |
| `screens/LoginScreen.tsx` | 87 | `['#6366f1', '#4f46e5']` | `['#0A7C4E', '#12A86B']` |
| `components/common/StatCard.tsx` | 15 | `['#6366f1', '#4f46e5']` | `['#0A7C4E', '#12A86B']` |
| `components/common/ProgressBar.tsx` | 15 | `['#6366f1', '#16a34a']` | `['#0A7C4E', '#12A86B']` |
| `components/common/Avatar.tsx` | 14 | `['#6366f1', '#16a34a', ...]` | `['#0A7C4E', '#12A86B', ...]` |
| `components/menu/LuxuriousMenu.tsx` | 22 | Dashboard gradient `['#6366f1', '#4f46e5']` | `['#0A7C4E', '#12A86B']` |
| `components/menu/LuxuriousMenu.tsx` | 232 | `shadowColor: '#6366f1'` | `shadowColor: '#0A7C4E'` |

## Screens Affected (via ADMIN_GRADIENTS.header)
All screens that use `<LinearGradient colors={ADMIN_GRADIENTS.header}>` now render green headers:
- AdminDashboardScreen
- DriversScreen, DriverDetailScreen
- RidesScreen, RideDetailScreen
- UsersScreen, UserDetailScreen
- SettingsScreen
- SurgePricingScreen, SurgeZonesScreen
- PeakHoursScreen
- LoginScreen

## Brand Color Spec (PHBIMH)
| Token | Value |
|-------|-------|
| Primary | `#0A7C4E` |
| Primary Light | `#12A86B` |
| Primary Dark | `#0B3B2A` |
| Background | `#F2F4F1` |
| Card/Surface | `#FFFFFF` |
| Dark | `#1A1A2E` |
| Text | `#1A1A2E` |
| Accent | `#D4A843` |
