# EasyRyde — Mobile Gap Analysis (HTML/Demo vs React Native)

> **Segment**: 04-QA-AUDIT · **Status**: RE-FRESHED 2026-08-14 — supersedes v1 scores (25% overall) which predated map + SOS + food implementations.

---

## 1. Scope

The `web/` directory and legacy HTML demos were the visual spec. The RN apps (rider/driver/admin) are the shipping clients. This gap = **what a user can see/do in demos but cannot in the apps**.

## 2. Coverage by Area (current code state)

| Area | Rider | Driver | Admin(Expo) | Notes |
|---|---|---|---|---|
| Interactive map (pickup/dropoff, markers) | ✅ MapView+Marker+Polyline, fallback straight-line | ✅ live map | ✅ dashboards + live map screen | |
| Ride booking wizard | ✅ | — | — | |
| Fare estimate + vehicle select | ✅ | — | — | |
| Live tracking (driver marker anim) | ✅ pkgs/maps AnimatedDriverMarker | ✅ active ride map | — | |
| Payment methods UI (cash/wallet/PAYFAST/OZOW/Stripe) | ✅ method sheet | — | ✅ payout screens | provider redirects handled client-side simply |
| Food ordering (list→menu→cart→checkout→track) | ✅ 4 screens | ✅ available/my orders | ✅ admin food pages (web panel) | |
| SOS | ✅ trigger/cancel (REST+socket) | — | ✅ ack/resolve (admin) | Alert stub removed |
| Wallet (top-up, transactions, withdraw) | ✅ | ✅ earnings | ✅ wallet ops | |
| Chat in ride | ✅ | ✅ | — | socket only, no REST read in client |
| Scheduled rides | ❌ no UI | — | — | backend + jobs exist (B-103) |
| Pool rides | ❌ minimal UI | ❌ passenger list UI | — | backend complete (B-104) |
| Referrals | ❌ | — | — | backend exists (B-105 partial) |
| Promo codes | ✅ validate+apply on checkout/ride | — | ✅ admin CRUD | |
| KYC/document upload | ✅ via drivers DocumentsScreen + kyc submit | ✅ | ✅ review screens | |
| Notifications (in-app + push + prefs) | ✅ | ✅ | ✅ admin send | |
| Ratings (ride + food) | ✅ | — | — | |
| Offline queue + banners | ✅ (shared) | ✅ (shared) | — | |
| Inspect & debug dashboards | — | — | ✅ inspector screen (mobile) + web | |
| Light/dark theme + business theming | ✅ 3 business themes | ✅ dark driver theme | ✅ admin theme | |

## 3. Remaining Gaps (prioritized)

| Priority | Gap | Evidence | Owner |
|---|---|---|---|
| P1 | Scheduled-ride UI (create/list/cancel) | backend `ScheduledRideController` + jobs; no app screen | mobile |
| P1 | Pool ride: rider join + driver passenger pickup/dropoff UI | backend `PoolController` complete | mobile |
| P1 | Referral screens (my code, apply, stats) | `ReferralController` complete | mobile |
| P2 | In-app chat read/unread REST; typing indicators | REST exists, client socket-only | mobile |
| P2 | Wallet confirm after gateway redirect (await `wallet/confirm`) | API exists, client missing | mobile |
| P2 | POPIA self-service (export / erasure request) in-profile | `/data/*` API exists | mobile |
| P3 | Maestro parity for food + payment flows | 6 maestro flows cover auth/booking/online only | mobile |

## 4. What the Web Admin Has That Expo Admin Lacks

`web/` (Vite): LiveMap (leaflet), FinancialDashboard, Pricing (peak/surge), Compliance (KYC/incidents), AuditLog, NotificationManager, Restaurants, SOS alerts — with Playwright e2e.
Expo admin app: mobile ops via REST + inspector stats. **Decision needed**: single admin target (web) vs mobile-first (see `../10-BUSINESS/EXPANSION.md`).

## References

- Backend counterpart: `BACKEND-GAP-ANALYSIS.md` · Screen inventory: mobile-inventory (INDEX → screens map) · Bug list: `CRITICAL-BUGS.md`