# EasyRyde — Actors & Personas

> **Segment**: 01-REQUIREMENTS · **Status**: VERIFIED 2026-08-14  
> **Linked**: `../05-SECURITY/RBAC-MATRIX.md` (authorization), `../03-WORKFLOWS/*.md` (per-actor flows)

---

## 1. Actor Model

| # | Actor | System identity | Apps | Goal |
|---|---|---|---|---|
| A1 | **Rider** | `User` role `rider` (default) | rider (Expo) | Book & complete rides, pay, rate, order food |
| A2 | **Driver** | `User` role `driver` + `DriverProfile` + `Vehicle` | driver (Expo) | Earn from rides/orders; stay safe; get paid on time |
| A3 | **Admin** | `User` role `admin` | admin web (Vite), admin (Expo) | Operate platform: users, rides, payments, food, ops |
| A4 | **Super-admin** | `User` role `super-admin` | same as admin | Everything admin + site settings, payouts, TOTP |
| A5 | **Restaurant** | business data (`restaurants` table); operating via admin panel | admin web | List menu, receive orders, mark prep |
| A6 | **PHBIMH partner system** | external service w/ `PartnerApiService` keys (webhooks) | none | Delegate orders (phbimh webhooks `/webhooks/phbimh`) |
| A7 | **System** | scheduler + jobs + socket-server + gateways | — | Timeout enforcement, payouts, escrow release, health |
| A8 | **Anonymous/potential user** | no `User` | — | Register, fare estimate, place search |
| A9 | **Support agent** | `admin`/`super-admin` | admin web | Disputes, incidents, SOS, refunds, KYC review |

## 2. Edge-Case Users (design must handle)

| Persona | Pain | System answer |
|---|---|---|
| Cash-only rider (no bank card) | Phalaborwa is cash-first | cash payment method + driver cash reconciliation flow (`Payment/CashReconciliationService`) |
| Low-data / old phone driver | expensive maps + heavy apps | dark low-battery-friendly driver theme; 30s throttled location; lightweight socket client |
| Rider booking for a friend | no app / no phone on rider | `deliveries` delegating sender→recipient; `booking-for-friend` flow (docs/flow) |
| Night-shift worker (Foskor mine) | surge at 04:00 | `NightModeService`, `PeakHour`, `SurgeZone` |
| Unbanked driver | no bank account for payout | wallet float + cash payments + `bank_accounts` (encrypted) |
| Tourist (Kruger Gate) | doesn't know places | seeded 15 Phalaborwa pickup points, `places/search` |
| Unverified user | must not ride/drive unverified | KYC gating on driver onboarding; consent gate on rider |
| Admin with stolen session | session hijack | TOTP (`AdminTotpMiddleware`), Sanctum tokens, audit log |
| Restaurant owner (non-tech) | can't manage menu | admin panel food CRUD (`FoodAdminController`) |

## 3. Responsibility Matrix (actor → domain)

| Domain | Rider | Driver | Admin | System |
|---|---|---|---|---|
| Ride lifecycle | book, track, cancel, rate | accept, arrive, start, complete | manage/dispute/resolve | timeouts, reassignment |
| Payments | pay (cash/wallet/card) | receive earnings | refunds, reconciliation | escrow release, payouts |
| Wallet | top up, withdraw | view earnings | approve payouts | reconciliation |
| Food | order, track, rate | accept, deliver | menus, assign drivers | status broadcasts |
| Safety | SOS, trusted contacts | profile docs | KYC review, incident close | escalation |
| Consent/POPIA | grant/revoke, export | grant/revoke | data retention cleanup | anonymize (90d?) |
| Ops config | — | — | peak hours, surge, promos, settings | apply pricing rules |

## 4. Boundaries & Rules of Thumb

- A user **can hold multiple app identities** (one `User`, many roles) — roles gate APIs, apps are separate installs.
- Driver actions only via `role:driver` endpoints; **the server never trusts client lat/lng for fares** (server-side distance, `fare_calculation_log`).
- Admins must pass `admin.totp` middleware when TOTP enabled; every destructive op writes `admin_audit_logs`.
- The system (jobs) is a first-class actor: ridership timeouts, escrow, payouts run unattended — test them as actors (`08-TESTING/API-TESTS.md`).

## References

- Auth flows / session rules: `../03-WORKFLOWS/AUTH-FLOWS.md`
- Authorization: `../05-SECURITY/RBAC-MATRIX.md`
- Driver onboarding: `../03-WORKFLOWS/DRIVER-FLOWS.md`
- Rider flows: `../03-WORKFLOWS/RIDER-FLOWS.md`, `../../docs/flow/01-rider/rider-user-flow.md`