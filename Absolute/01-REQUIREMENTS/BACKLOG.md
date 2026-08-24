# EasyRyde — Backlog & Priorities

> **Segment**: 01-REQUIREMENTS · **Status**: 2026-08-14 · Priorities aligned to the true goal (§1 of SYSTEM-OVERVIEW)  
> **Linked**: `../04-QA-AUDIT/CRITICAL-BUGS.md`, `CRITICAL-BUGS` remediation, `../../docs/flow/05-production-readiness/missing-features-analysis.md`

**Priority scale**: P0 = blocks production trust · P1 = must ship this cycle · P2 = should ship · P3 = nice / expansion.

---

## P0 — Trust & Safety (launch blockers)

| # | Item | Evidence | Effort |
|---|---|---|---|
| B-001 | Production load validation (k6 suite exists, never run against prod) | `load-tests/` 12 scenarios | M |
| B-002 | Driver identity verification enforcement at scale (KYC review queue SLA) | `admin/manage/kyc` + `KycService` | S |
| B-003 | Escrow + dispute window policy sign-off (release 24–48h after completion; shortfall handling) | `EscrowService`, `disputes` | S |
| B-004 | Cash reconciliation cadence + admin SOP | `CashReconciliationService` | S |
| B-005 | Restore/doc `docs/api/openapi.yaml` parity: missing 4 routes (`/admin/stats`, `/restaurants`, `/food-orders`, `/pool-rides`) | audit §5a | S |

## P1 — Completeness (this cycle)

| # | Item | Notes | Effort |
|---|---|---|---|
| B-101 | Mobile client gaps vs API: wallet/confirm, stripe intents, refund/dispute, scheduled-rides, referrals, pool, incidents, data export/erasure, chat REST | shared client inventory §5b | M |
| B-102 | Food flow parity: restaurant prep status UI hook (restaurant is admin-panel-managed today) | `FoodAdminController` | M |
| B-103 | Scheduled ride UI in rider app | backend + jobs done; no screen | S |
| B-104 | Pool rides: rider join UI + driver passenger list UI | backend complete; mobile minimal | M |
| B-105 | Ride chat: REST read/unread + typing indicators | partial (socket send only) | S |
| B-106 | i18n: single `en` locale — add `en-ZA` formatting (currency/phone) | `i18n/en.ts` | S |
| B-107 | Admin web (Vite) parity with Expo admin app (reports/pricing/compliance live-map are web-only) | `web/` app exists | M |
| B-108 | API docs for the 4 missing routes + regenerate openapi | — | S |

## P2 — Hardening

| # | Item | Notes |
|---|---|---|
| B-201 | Sentry alert routing + alerts on failed jobs | config exists, alerts TBD |
| B-202 | Horizon dashboard auth (basic-auth / TOTP) | `/horizon` exposed on dev |
| B-203 | OSRM fallback when route service down + fare fallback audit (`calculateFinalFare` R50 fallback) | known quirk |
| B-204 | Log rotation + retention policy for nginx/docker logs | noted in DOCKER-ARCH known issues |
| B-205 | Grafana dashboards for rides/hour, driver online rates | 2 dashboards exist |
| B-206 | Mobile a11y sweep (contrast, touch targets, screen readers) | NFR-604 |
| B-207 | API versioning strategy doc (v1 frozen? additive?) | — |

## P3 — Expansion (aligned with true goal)

| # | Item | Notes |
|---|---|---|
| B-301 | Stays / rentals tenant modules (PHBIMH umbrella) | `tenants` ready |
| B-302 | In-app advertising (`advertisements` planned table) | `10-BUSINESS/ADVERTISING.md` |
| B-303 | Referral reward scaling (bonus amounts config) | `ReferralService` |
| B-304 | Multi-language (Sepedi/Xitsonga/English) for Phalaborwa | i18n framework in place |
| B-305 | Pan-Africa expansion: currency/multi-tenant pricing per region | `10-BUSINESS/EXPANSION.md` |

## P0.5 — Anti-Fraud Conduct Engine (approved design → implement)

| # | Item | Notes |
|---|---|---|
| B-401 | `enum` setting type + `options` column (system_settings) | admin select rendering; schema migration |
| B-402 | `SettingService` (300 s cache, bust on write) + fix fare-key mismatch (`fare_standard_base` vs `fare_standard_base_fare`) | `AdminController::updateSettings` must bust; G-13/G-14 |
| B-403 | `driver_violations` table + 6 fraud settings (fines, radius, collusion) | `03-WORKFLOWS/ANTI-FRAUD-CANCEL-GUARD.md` §3 |
| B-404 | `DriverFraudGuardService` wired into `RideService::cancelRide` + wallet debit (`driver_fine`) | R1/R2 rules; pending-debt path |
| B-405 | Admin fraud console (list/waive/charge/dispute-resolve) + audit logs | new `/admin/fraud/violations*` |
| B-406 | Collusion detection (pair cancel threshold, advisory) + unpaid-fines payout offset + block-rides gate | SettlementService change |
| B-407 | Fleet modes: `driver_profiles.fleet_type` + `rides_pool_mode` + dispatch filters | `FLEET-POOL-MODES.md` |
| B-408 | `food_pool_mode` + filters in food/delivery availability + cross-vertical accept guard | separate setting per vertical |
| B-409 | Payout offset for unpaid fines | `available = balance − Σ unpaid` |
| B-410 | Parcel engine: deliveries state machine + new columns + weight-tier pricing | `PARCEL-DELIVERY-ENGINE.md` |
| B-411 | Parcel API (book/track/cancel driver accept/status/POD) | rider + driver + admin routes |
| B-412 | Parcel admin ops (assign/dispute/failed-confirm) + POD evidence view | |
| B-413 | Parcel fraud parity (R-P1/P2 fines) | fraud engine extension |
| B-414 | OpenAPI regenerate + `ParcelDeliveryTest` + `FleetModeTest` + `FraudGuardTest` | H-002 parity rule |
| B-415 | Mobile: rider parcel booking screen + driver delivery screens (accept/status/POD camera) | jetpack of `FoodDelivery` screens |
| B-416 | Driver "Violations" screen + fine notices (deep link from notification) | |
| B-417 | PHBIMH umbrella adoption: `SEG-14-LOCAL-DELIVERY-ENGINE.md` + gateway integration | `/home/madoc-hp/Documents/PHBIMH` |
| B-418 | Charge existing no-show fee (R25) via same debt mechanism | closes the only other uncollected fee |

## Prioritization Rules

1. Fix class-0 defects before new features (`04-QA-AUDIT/CRITICAL-BUGS.md`).
2. Anything that erodes rider/driver trust (safety, payment correctness, payout reliability) is P0.
3. Expansion features must not touch core ride/payment paths without regression coverage.
4. Every item above has an evidence link — if evidence is stale, re-verify before estimating.

## References

- Missing-features deep dive: `../../docs/flow/05-production-readiness/missing-features-analysis.md`
- QA state: `../04-QA-AUDIT/TEST-COVERAGE.md`