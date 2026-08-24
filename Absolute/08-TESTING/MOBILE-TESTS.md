# EasyRyde — Mobile Tests Guide

> **Segment**: 08-TESTING · **Status**: VERIFIED 2026-08-14  
> **Linked**: `TEST-STRATEGY.md`, `../04-QA-AUDIT/TEST-COVERAGE.md`, `../01-REQUIREMENTS/SYSTEM-OVERVIEW.md` (screens)

---

## 1. Run Commands (from `mobile/`)

```bash
npm run test:rider    # Jest rider (preset jest-expo)
npm run test:driver   # Jest driver
npm run test:admin    # Jest admin (Expo)
npm run test:shared   # jest packages/shared
npm run typecheck     # tsc --noEmit all apps
npm run lint          # eslint (turbo)
npm run test:e2e      # Detox (needs emulator Pixel_4_API_34 + debug APKs)
# Maestro:
maestro test .maestro/rider/login-flow.yml   (device must be booted)
```

## 2. What's Covered (by app)

| App | Jest files | Key suites |
|---|---|---|
| rider (23) | every screen (BookRide, Home, RideTracking, Payment, Wallet, Promo, Food×4, Chat, Consent, Profile, Rating, RideHistory/Detail, Notifications, Support, Login/Register/Forgot) | screen renders + interactions, mocks API |
| driver (14) | Dashboard (online toggle/offers), RideRequests (15s countdown), ActiveRide (phases), Earnings, Trips, Food×2, Documents, Login/Forgot, Profile, Consent, Chat, Support | |
| admin (≈24) | screens + adminApi.test + hooks (useAdminDashboard/Drivers/Rides/Settings/Users/PeakHours/SurgePricing, useInspectorStats) | |
| shared (14) | apiClient (envelope, cache, retry, offline queue), useSocket (connect/reconnect/dedupe), useActiveRide (socket+state), useAuth (token life), useRideStore, i18n, mapUtils, ThemeContext, businessThemes, foodDelivery, useNotifications, useNetworkStatus | |

## 3. E2E (Detox + Maestro + Playwright)

| Suite | Flows |
|---|---|
| Detox rider | login validation, smoke, **book ride Phalaborwa Mall→Airport (cancel)** , wallet + deposit via payfast-option |
| Detox driver | login, smoke, goOnline + earnings cards |
| Detox root | rider/driver/admin smokes (`e2e/*.test.ts`) |
| Maestro | auth (rider+driver), ride-booking (Where to? → Mall → Economy → Request), shared assertions |
| Playwright (web/) | admin: login, rides, drivers, payouts, pricing, audit-log, food-orders, restaurants, sos-alerts |

## 4. Test Data Conventions

- Demo users via backend seeders: `rider@easyryde.com` / `driver@easyryde.com` / `admin@easyryde.com` (password `password`).
- Phalaborwa fixtures: `PHALABORWA_LOCATIONS` (Mall, Airport…); center -23.9468, 29.4726.
- Maestro appId `za.co.easyryde.rider` (driver `za.co.easyryde.driver`).

## 5. Writing Rules

1. New screen → screen test in app `__tests__/` (mock shared `api`).
2. New shared util/hook → test in `packages/shared/src/__tests__/`.
3. UI flows that cross screens → Maestro/Detox, not Jest.
4. Never `console.log` assertions; use jest-expo matchers; deterministic (no real timeouts).
5. Screens import from `@easyryde/shared` (mapped in jest config moduleNameMapper).

## References

- Coverage verdict: `../04-QA-AUDIT/TEST-COVERAGE.md` · Strategy: `TEST-STRATEGY.md` · Screen inventory: `../01-REQUIREMENTS/SYSTEM-OVERVIEW.md` §Mobile