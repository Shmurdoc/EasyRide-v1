# EasyRyde — System Overview

> **Segment**: 01-REQUIREMENTS · **Status**: VERIFIED against code (2026-08-14, HEAD `650d3b1`)  
> **Sources of truth**: `backend/routes/api.php`, `docker-compose.yml`, `mobile/apps/{rider,driver,admin}/App.tsx`, `socket-server/src/index.js`

---

## 1. The True Goal

EasyRyde is the **mobility and local-commerce arm of the Phalaborwa In My Hand (PHBIMH) umbrella** — a multi-tenant super-app for Phalaborwa, Limpopo (ZA). It does not exist to be "another Uber clone". Its goal, in priority order:

1. **Provide safe, affordable, dependable transport in Phalaborwa** — rider & driver apps + a live dispatch system (socket) built for local conditions (cash-first economy, data-light clients, no-card-wallets).
2. **Be the transactional core of the PHBIMH super-app** — the platform is tenant-aware (`tenants` table, `tenant_id` on every core table) so the *same backend* powers rides, food delivery, and future stays/rentals under one brand family.
3. **Earn via commission, not gimmicks** — 15% platform fee on rides (configurable), wallet float, driver payouts, food delivery fees.
4. **Be safe and compliant enough to survive South African law** — POPIA data rights, PCI-safe payments (no card data ever touches the server), driver KYC + verification, TOTP admin 2FA, audit logs.
5. **Scale Phalaborwa → Limpopo → SA → Pan-Africa** using the same multi-tenant core (`10-BUSINESS/EXPANSION.md`).

Every architecture decision below serves goal 1–2. When a change is proposed, it must be justified against these five priorities.

## 2. Platform Capability Map

| Capability | Apps | Backend | Status |
|---|---|---|---|
| Ride booking, live tracking, fare estimate | Rider | `RideController`, `RideService`, `FareCalculationService` | LIVE |
| Driver dispatch (socket), accept/arrive/start/complete | Driver | `RideController` + `socket-server` handlers | LIVE |
| Cash, wallet, PayFast, Ozow, Stripe payments | Rider | `PaymentController`, `PaymentRouter`, 5 gateways | LIVE |
| Escrow + dispute hold on card payments | Admin | `EscrowService`, `disputes` table | LIVE |
| Food delivery ordering (restaurants, menu, cart) | Rider + Driver | `FoodDeliveryController`, `FoodOrderService` | LIVE |
| Driver onboarding: profile, vehicle, KYC docs | Driver + Admin | `DriverController`, `KycController`, `KycService` | LIVE |
| Admin panel (web Vite + mobile Expo admin) | Admin | `admin/*` routes (40+ endpoints) | LIVE |
| SOS alerts with admin ack/escalation | Rider + Admin | `SosController`, `SosService`, `EscalationService` | LIVE |
| Scheduled rides, pool rides | Rider | `ScheduledRideController`, `PoolController`, pool services | LIVE |
| Referrals, promo codes, peak hours, surge zones | Rider + Admin | `ReferralController`, `PromoCodeController`, peak/surge | LIVE |
| POPIA data rights (export/anonymize/erasure) | Rider + Admin | `DataRetentionController`, `DataRetentionService` | LIVE |
| Webhook B2B (PHBIMH partner delegation) | External | `PartnerWebhookController`, `PhbimhIntegrationService` | LIVE |
| Stays / rentals (future tenants) | — | `tenants` schema ready; no tenant modules yet | PLAN |
| In-app advertising | — | — | PLAN (`10-BUSINESS/ADVERTISING.md`) |

## 3. Architecture Topology (Runtime)

```
                    ┌─────────────────────────────────────────────┐
                    │            EASYRYDE PLATFORM                 │
   Rider (Expo/RN)  │   Nginx :3082 (dev) / 443 (prod)            │
   Driver (Expo/RN) ─┤   ├─ /api/*    → php-fpm (Laravel 11)      │
   Admin web (Vite) │   └─ /socket.io/* → socket-server :3001     │
                    │                                            │
                    │   Laravel: 90 public + 125+ authed routes   │
                    │   ── Redis (cache/queue/broadcast/geo)      │
                    │   ── PostgreSQL 16 + PostGIS (prod)         │
                    │   ── Horizon queue: rides/payments/realtime │
                    │   socket-server: rooms, geo, ride state     │
                    │   ── Redis pub/sub relay (laravel_database_*)│
                    └─────────────────────────────────────────────┘
```

Numbers: **215 OpenAPI paths**, **41 Eloquent models**, **56 services**, **20 jobs**, **15 events**, **43+ mobile screens**, **3 mobile apps + 1 web admin**.

## 4. The 5W Framework

| W | Answer | Reference |
|---|---|---|
| WHO | Riders, drivers, restaurants, admins/super-admins, PHBIMH partner system, system itself | `ACTORS.md`, `05-SECURITY/RBAC-MATRIX.md` |
| WHAT | Rides + food delivery + wallet/payments + admin ops on one tenant-aware backend | `FUNCTIONAL-REQS.md`, `02-DATA-MODEL/ENTITIES.md` |
| WHERE | Docker compose (dev) / blue-green prod (`api.easyryde.co.za`), PostgreSQL+PostGIS, Redis, socket-server | `07-INFRASTRUCTURE/DOCKER-ARCH.md` |
| WHEN | Ride lifecycle on events + jobs; 15 scheduled jobs (escrow 02:00, payouts 03:00, cleanup 03:30…) | `03-WORKFLOWS/FAILURE-MODES.md`, `07-INFRASTRUCTURE/DOCKER-ARCH.md` §Jobs |
| WHY | Local-first super-app economics + PHBIMH umbrella expansion | `10-BUSINESS/*.md` |

## 5. Key Numbers (Verified)

| Metric | Value |
|---|---|
| API routes (api.php v1) | ~215 OpenAPI paths; 467-line `api.php` |
| Models | 41 (+4 tables without models) |
| Services | 56 (5 bound with scalar ctor params) |
| Jobs | 20 (12 scheduled via `routes/console.php`) |
| Broadcast events | 7 socket events + 8 plain events |
| Migrations | 73 tables across 73 migration files |
| Backend tests | 90 files: 49 Feature, 38 Unit, 3 Security |
| Mobile test files | 76 Jest + 7 Detox e2e + 6 Maestro flows |
| Docker services (dev) | 7 (backend, nginx, database, redis, queue, scheduler, socket-server) |
| Webhook IP-whitelist gateways | 6 (payfast, ozow, stripe, twilio, partner/phbimh) |
| Default fare platform fee | 15% (`system_settings.platform_fee_percent`) |
| Currency / locale | ZAR / Africa/Johannesburg; Phalaborwa center -23.9468, 29.4726 |

## 6. Documentation Map (memory model)

```
INDEX.md ── hub with cross-reference matrix, flow maps, route maps
 ├─ 01-REQUIREMENTS   this file · ACTORS · FUNCTIONAL-REQS · NONFUNCTIONAL-REQS · BACKLOG
 ├─ 02-DATA-MODEL     ENTITIES · RELATIONSHIPS · MIGRATIONS · ENCRYPTION
 ├─ 03-WORKFLOWS      RIDER · DRIVER · ADMIN · FOOD · AUTH · PAYMENT · FAILURE-MODES
 ├─ 04-QA-AUDIT       MOBILE-GAP · BACKEND-GAP · TEST-COVERAGE · CRITICAL-BUGS
 ├─ 05-SECURITY       THREAT-MODEL · RBAC-MATRIX · PCI-DSS · POPIA-GDPR · INCIDENT-RESPONSE
 ├─ 06-DESIGN-SYSTEM  TOKENS · COMPONENT-CATALOG · THEME · DESIGN-ISSUES
 ├─ 07-INFRASTRUCTURE DOCKER-ARCH · DEPLOYMENT · CI-CD · MONITORING
 ├─ 08-TESTING        TEST-STRATEGY · MOBILE-TESTS · API-TESTS
 ├─ 09-OPS            SLO-SLI · BACKUP-DR · RUNBOOKS
 └─ 10-BUSINESS       BUSINESS-ENTITIES · ADVERTISING · EXPANSION
Flow docs (per-user/system/data/integration/error): ../docs/flow/ (36 docs)
API contract: ../docs/api/openapi.yaml (215 paths)
```

**Reading rule (token sensitivity)**: read `INDEX.md` first; read only the segment docs relevant to your task; use table rows as pointers and open source files only when you need implementation detail. Do not re-read flow docs that duplicate workflow docs — each concept is documented once and cross-referenced.

## References

- Flow drills: `../../docs/flow/00-system-overview/system-architecture-flow.md`, `service-dependency-map.md`
- Role matrix: `../05-SECURITY/RBAC-MATRIX.md`
- Data: `../02-DATA-MODEL/ENTITIES.md`, `RELATIONSHIPS.md`
- Infra: `../07-INFRASTRUCTURE/DOCKER-ARCH.md`