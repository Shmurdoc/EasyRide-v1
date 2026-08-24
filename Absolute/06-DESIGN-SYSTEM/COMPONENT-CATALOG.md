# EasyRyde — Shared Component Catalog

> **Segment**: 06-DESIGN-SYSTEM · **Status**: VERIFIED 2026-08-14 (37 components in `mobile/packages/shared/src/components/`)  
> **Linked**: `TOKENS.md`, `THEME.md`, `../04-QA-AUDIT/MOBILE-GAP-ANALYSIS.md`

---

## 1. Shared Components (`packages/shared/src/components/`)

| Component | Purpose | Used by |
|---|---|---|
| ActivityCard, RideCard, DriverCard | list cards | rider/driver lists |
| AnimatedCheckmark, AnimatedNumber, GlowButton, GradientText | micro-interactions | booking/payment confirm |
| Avatar, Badge, Chip, ListItem | identity + status | all apps |
| Button, Input, Modal, SegmentedControl | form primitives | all screens |
| Card, GlassCard, PriceDisplay | surfaces + money | all |
| CategoryTile, VehicleSelector, QuickActionButton | home quick actions | rider home |
| EmptyState, ErrorState, LoadingOverlay, Shimmer, Skeleton | async states | all |
| Header, Typography, Divider, Rating | chrome + text | all |
| ProgressBar, RideStatusBadge | ride progress | tracking |
| OfflineBanner, ReconnectionBanner, ErrorBoundary, Toast | resilience UX | all, wired in providers |
| SplashScreen, StaggeredList | launch + lists | apps |

## 2. ui-kit (separate package, driver-heavy)

`BarChart, EmptyState, ErrorState, LoadingState, OfflineBanner` + `usePullToRefresh`.

## 3. Web admin (Vite) components

Only `Layout.tsx` (sidebar+header) — pages self-contained. → Shared admin component library is a gap (D-02).

## 4. Cross-Stack Mismatch Hotlist

| Concept | RN | Web admin |
|---|---|---|
| Currency display | `formatCurrency` (ZAR) | inline `R` formatting |
| Status badges | RideStatusBadge | inline spans |
| Charts | react-native-chart-kit | recharts (web/) |
| Maps | react-native-maps/gmaps | @react-google-maps/api (admin) + react-leaflet (web/) |

## 5. Catalog Rules

1. Cross-app components MUST live in `packages/shared/src/components` + barrel export.
2. App-private components → `apps/{app}/components/` (e.g. admin `components/menu/LuxuriousMenu.tsx`).
3. No new component without a token reference (TOKENS.md) and a Jest render test (pattern: rider `__tests__`).
4. Before building → check catalog; duplicates get removed in design review.

## References

- Screens consuming these: `../01-REQUIREMENTS/FUNCTIONAL-REQS.md` · Design debt: `DESIGN-ISSUES.md`