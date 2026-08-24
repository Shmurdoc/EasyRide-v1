# EasyRyde — Critical Bug Register (Open)

> **Segment**: 04-QA-AUDIT · **Status**: REFRESHED 2026-08-14 — v1's C-001/C-002/C-003 are FIXED (verified in code) and removed from the open list.  
> **Linked**: `../../docs/flow/05-production-readiness/bug-inventory.md` (full inventory), `../01-REQUIREMENTS/BACKLOG.md` (remediation), `../09-OPS/RUNBOOKS.md`

---

## 1. Open by Severity

| Severity | Count | Notes |
|---|---|---|
| CLASS 0 (blocks launch) | 0 | all three historical class-0s fixed |
| High | 5 | money/state correctness, below |
| Medium | 8 | parity + UX gaps |
| Low | ~11 | hardening backlog (see bug-inventory) |

## 2. High (open)

| ID | Issue | Evidence | Fix path |
|---|---|---|---|
| H-001 | **Fare fallback hardcodes R50** when route service fails/returns invalid (`calculateFinalFare` returns 50.0 for total_fare ≤ 0) | `FareCalculationService.php:56` | B-203: explicit failure state + client disclosure, cap fallback |
| H-002 | **OpenAPI drift** — 4 live routes absent (`/admin/stats`, `/restaurants`, `/food-orders`, `/pool-rides`) | audit §5a | B-005 regenerate + CI parity check |
| H-003 | **Socket-server coverage thin**; dispatch paths (claim lock, re-offer, token expiry mid-session) not fully tested | `socket-server` tests small | extend suite (TEST-COVERAGE gap) |
| H-004 | **Prod load evidence missing** — 12 k6 scenarios never run against prod container | `load-tests/` all pending | B-001 schedule post-deploy run |
| H-005 | **Wrong default map center** — `PHALABORWA_CENTER` longitude `31.0830` (≈110 km east of Phalaborwa); city's real center `-23.9468, 29.4726` is what backend `system_settings` defaults use. Map/`MAP_REGION` opens displaced; search-radius rings draw around the wrong point | `mobile/packages/shared/src/constants/index.ts:300` (also reflected in `../06-DESIGN-SYSTEM/TOKENS.md`) | fix constant to `-23.9468, 29.4726`, align TOKENS.md, re-verify rider booking default region |

## 3. Medium (selected)

| ID | Issue | Evidence |
|---|---|---|
| M-001 | Mobile client lacks wallet/confirm, stripe intent, refund/dispute, scheduled, referrals, pool, incidents, data-export, chat REST | `mobile/packages/shared/src/api/` |
| M-002 | No scheduled-ride / pool / referral UI | screens inventory |
| M-003 | Restaurant-side order workflow only via admin (no standalone restaurant app) | FOOD-FLOWS §6 |
| M-004 | TOTP recovery: no self-service; admin locked out without super-admin (SOP undocumented) | AUTH-FLOWS §5, F-AD-02 |
| M-005 | Payout ETA not shown to drivers in-app | DRIVER-FLOWS §5 |
| M-006 | No alerting on job failures / zero-queue-deadlock | MONITORING (Grafana dashboards, no alerts yet) |
| M-007 | `sleep` location throttle 30/min vs 60 defined in two places (bootstrap vs AppServiceProvider) | kernel alias audit — reconcile |
| M-008 | i18n single locale; `en-ZA` formatting gaps | shared i18n |

## 4. Recently Fixed (keep as regression guard)

| ID | Was | Fixed in |
|---|---|---|
| C-001 | `Alert.alert('No drivers found')` crash | BookRideScreen.tsx:5 (Alert imported) |
| C-002 | RatingScreen unregistered route | App.tsx:132 |
| C-003 | PCI client-side card fields | removed; Stripe intents only |
| CRIT (audit 07-30) | webhook partner no IP check; missing per_page caps; sanitize gaps; weak limits | middleware + controllers + limits |

## 5. Rules

1. Before reporting a bug: reproduce against HEAD, capture log/screenshot, check it's not already here.
2. Class-0 may only be opened with a repro + fix owner; fixing follows `../09-OPS/RUNBOOKS.md` process.
3. After each release, run `../08-TESTING/API-TESTS.md` route matrix; anything failing = new High.

## References

- Full inventory: `../../docs/flow/05-production-readiness/bug-inventory.md` (677 lines, all severities + flow contexts) · Remediation: `../01-REQUIREMENTS/BACKLOG.md`