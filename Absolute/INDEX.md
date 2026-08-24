# EasyRyde — Absolute System Documentation (INDEX / Memory Hub)

> **Status**: REFERENCE ARCHIVE — v2.0 · **Verified**: 2026-08-14 against HEAD `650d3b1`  
> **Role**: This index is the **memory and navigation hub** of the project. Every doc below is cross-linked; read this first, then the segment docs relevant to your task. If a claim in a doc disagrees with code, the code wins and the doc must be fixed (see §8).  
> **Sibling knowledge**: `../docs/flow/` (36 flow drills) · `../docs/api/openapi.yaml` (215 paths) · graphify graphs (backend 2003 nodes/5241 edges; mobile 1592 nodes/3106 edges)

---

## 1. The True Goal (north star)

> EasyRyde = the mobility + local-commerce arm of the **PHBIMH (Phalaborwa In My Hand)** umbrella: a **multi-tenant super-app** for Phalaborwa, Limpopo — safe, affordable, cash-friendly transport (rides + food delivery) with a production-grade backend that can expand to any tenant (stays, rentals) and any region (Limpopo → SA → Africa). Every doc in this archive exists to keep that goal true and to prevent guidance errors.

Full statement + capability map: [`01-REQUIREMENTS/SYSTEM-OVERVIEW.md`](01-REQUIREMENTS/SYSTEM-OVERVIEW.md)

## 2. Directory Map (46 docs — contract complete: 42 contracted + 4 evidence/context docs)

```
Absolute/
├── INDEX.md                          ← you are here (nav hub, flow maps, route maps)
├── 01-REQUIREMENTS/
│   ├── SYSTEM-OVERVIEW.md            ← true goal, topology, 5W, key numbers
│   ├── ACTORS.md                     ← 9 actors + edge-case personas
│   ├── FUNCTIONAL-REQS.md            ← FR-1…FR-8 with acceptance + endpoints
│   ├── NONFUNCTIONAL-REQS.md         ← perf/security/compliance/UX targets
│   └── BACKLOG.md                    ← P0–P3 with evidence links
├── 02-DATA-MODEL/
│   ├── ENTITIES.md                   ← 73 tables, field reference
│   ├── RELATIONSHIPS.md              ← ER map, FKs, integrity rules
│   ├── MIGRATIONS.md                 ← 73-file evolution history + rules
│   └── ENCRYPTION.md                 ← PII inventory + protection rules
├── 03-WORKFLOWS/
│   ├── RIDER-FLOWS.md · DRIVER-FLOWS.md · ADMIN-FLOWS.md
│   ├── FOOD-FLOWS.md · AUTH-FLOWS.md · PAYMENT-FLOWS.md
│   ├── ANTI-FRAUD-CANCEL-GUARD.md (design — driver fines, admin-editable radius)
│   ├── FLEET-POOL-MODES.md (design — private/employee pools, per vertical)
│   ├── PARCEL-DELIVERY-ENGINE.md (design — food⇄parcel engine)
│   └── FAILURE-MODES.md              ← F-RB/DF/AD/PM/FD/AU/CM + F-FR/PL/PR register
├── 04-QA-AUDIT/
│   ├── README.md · MOBILE-GAP-ANALYSIS.md · BACKEND-GAP-ANALYSIS.md
│   ├── TEST-COVERAGE.md · CRITICAL-BUGS.md
├── 05-SECURITY/
│   ├── THREAT-MODEL.md · RBAC-MATRIX.md · PCI-DSS.md
│   ├── POPIA-GDPR.md · INCIDENT-RESPONSE.md · AUDIT-2026-07-30.md (raw audit)
├── 06-DESIGN-SYSTEM/
│   ├── TOKENS.md · COMPONENT-CATALOG.md · THEME.md
│   ├── DESIGN-ISSUES.md · BUSINESS-THEMES.md
├── 07-INFRASTRUCTURE/
│   ├── DOCKER-ARCH.md · DEPLOYMENT.md · CI-CD.md · MONITORING.md
├── 08-TESTING/
│   ├── TEST-STRATEGY.md · MOBILE-TESTS.md · API-TESTS.md
│   └── TASK-QA-002-REPORT.md (route-matrix evidence)
├── 09-OPS/
│   ├── SLO-SLI.md · BACKUP-DR.md · RUNBOOKS.md
└── 10-BUSINESS/
    ├── BUSINESS-ENTITIES.md · ADVERTISING.md · EXPANSION.md
```

## 3. Platform Flow Map (one picture)

```
┌─ RIDER APP (Expo) ──────────────┐   ┌─ DRIVER APP (Expo) ────────────────┐
│ Home→BookRide→Tracking→Pay→Rate │   │ Dashboard(on) → Requests(15s) →    │
│ Food: List→Menu→Checkout→Track  │   │ ActiveRide → Earnings → Trips      │
│ Wallet · Promo · SOS · Chat     │   │ Food tab · KYC Documents           │
└──────────┬──────────────────────┘   └──────────┬─────────────────────────┘
           │ REST (Bearer er_*)                  │ REST + Socket.io
           ▼                                     ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ NGINX (3082 dev / 443 prod)  →  Laravel 11 API (/api/v1)      │
   │   auth:sanctum · role/driver/admin · admin.totp · throttles   │
   │   Controllers → 56 Services → 41 Models → PostgreSQL 16       │
   │   Events → Redis broadcast → socket-server rooms              │
   │   Jobs (20) → Horizon (rides/payments/notifications)          │
   │   Webhooks ← PayFast/Ozow/Stripe/Twilio/PHBIMH (IP+HMAC)      │
   │   Socket.io :3001 — dispatch, tracking, chat, admin live map  │
   └──────────────────────────────────────────────────────────────┘
   ┌─ ADMIN: web (Vite :3001, 12 pages) + Expo admin + web/panel    ┐
   └─ OPS: Prometheus/Grafana/Sentry · backups · blue-green deploy  ┘
```

## 4. Functionality Routes (feature → docs → code)

| Feature | Read first | Code pointers | Flow drills |
|---|---|---|---|
| Ride booking → tracking → payment | `03-WORKFLOWS/RIDER-FLOWS.md` | `RideController`, `RideService`, `useActiveRide` | `../docs/flow/01-rider/*` |
| Dispatch & driver trip | `03-WORKFLOWS/DRIVER-FLOWS.md` | `RideMatchingService`, `socket-server/handlers/ride.js` | `../docs/flow/02-driver/*` |
| Payments/wallet/escrow/payouts | `03-WORKFLOWS/PAYMENT-FLOWS.md` | `PaymentController`, `PaymentRouter`, `EscrowService`, `WalletService` | `../docs/flow/04-cross-cutting/payment-flow.md` |
| Food delivery | `03-WORKFLOWS/FOOD-FLOWS.md` | `FoodDeliveryController`, `FoodOrderService` | `food-delivery-flow.md` |
| Auth/consent/TOTP | `03-WORKFLOWS/AUTH-FLOWS.md` | `AuthController`, `TotpController`, `useAuth` | `authentication-flow.md` |
| Admin ops | `03-WORKFLOWS/ADMIN-FLOWS.md` | `admin/*` controllers | `../docs/flow/03-admin/*` |
| Realtime comms | `03-WORKFLOWS/DRIVER-FLOWS.md` §3 | `socket-server/src/handlers/*` | `realtime-communication-flow.md` |
| Data model | `02-DATA-MODEL/ENTITIES.md` | migrations/ | — |
| Security/compliance | `05-SECURITY/*` | middleware/, `EncryptsPii` | `../docs/flow/05-production-readiness/security-hardening-checklist.md` |
| Deploy/ops | `07-INFRASTRUCTURE/*` + `09-OPS/*` | compose files, `deployment/scripts` | `../docs/flow/05-production-readiness/launch-checklist.md` |

## 5. Cross-Reference Matrix (which docs answer which question)

| Question | Doc |
|---|---|
| Why does this system exist? | `01-REQUIREMENTS/SYSTEM-OVERVIEW.md` §1 |
| Who can do what? | `05-SECURITY/RBAC-MATRIX.md` + `01-REQUIREMENTS/ACTORS.md` |
| How do we stop drivers gaming cancellations? | `03-WORKFLOWS/ANTI-FRAUD-CANCEL-GUARD.md` |
| Private vs EasyRyde-employee fleets? | `03-WORKFLOWS/FLEET-POOL-MODES.md` |
| Parcel / local delivery engine? | `03-WORKFLOWS/PARCEL-DELIVERY-ENGINE.md` + PHBIMH `SEG-14` |
| What are the tables/fields? | `02-DATA-MODEL/ENTITIES.md` + `RELATIONSHIPS.md` |
| How does a ride flow end-to-end? | `03-WORKFLOWS/RIDER-FLOWS.md` + `FAILURE-MODES.md` |
| Where does money move? | `03-WORKFLOWS/PAYMENT-FLOWS.md` + `02-DATA-MODEL/ENTITIES.md` §3 |
| What is broken / open? | `04-QA-AUDIT/CRITICAL-BUGS.md` + `../docs/flow/05-production-readiness/bug-inventory.md` |
| What is tested? | `04-QA-AUDIT/TEST-COVERAGE.md` + `08-TESTING/*` |
| How do I deploy? | `07-INFRASTRUCTURE/DEPLOYMENT.md` + `DOCKER-ARCH.md` |
| What if something breaks at 3 AM? | `05-SECURITY/INCIDENT-RESPONSE.md` + `09-OPS/RUNBOOKS.md` |
| How do we make money / grow? | `10-BUSINESS/BUSINESS-ENTITIES.md` + `EXPANSION.md` |
| Is card data safe? | `05-SECURITY/PCI-DSS.md` |
| What are the SLOs? | `09-OPS/SLO-SLI.md` |

## 6. Segment Dependency Graph (read order for onboarding)

```
SYSTEM-OVERVIEW ─→ ACTORS ─→ FUNCTIONAL-REQS ─→ ENTITIES ─→ WORKFLOWS
      │                                                       │
      ├────────→ SECURITY ─→ QA-AUDIT ─→ TESTING               ├──→ INFRA ─→ OPS
      └────────→ DESIGN-SYSTEM ─────────────┘                 └──→ BUSINESS (later)
```
**Onboarding path (token-light)**: `INDEX → SYSTEM-OVERVIEW → ACTORS → ENTITIES → RIDER-FLOWS → PAYMENT-FLOWS → DOCKER-ARCH → TEST-STRATEGY`.

## 7. Token-Sensitive Reading Protocol

1. Start at INDEX; read only the segment(s) your task touches.
2. Prefer table rows and links over prose; each concept is documented **once** and referenced elsewhere.
3. Use docs as **pointers to code** (`file:line` where noted) — open the file only when implementing.
4. Never re-read a full flow doc when a 1-line pointer exists; `docs/flow/*` and `Absolute/*` intentionally cover complementary angles (deep drills vs reference).
5. If a doc is stale (disagrees with code), fix it the same change — stale docs are the #1 source of guidance errors.

## 8. Verification & Maintenance

| Command | Verifies |
|---|---|
| `docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml` | test suite (live count) |
| `docker compose exec backend php artisan route:list --path=v1` | API surface vs FUNCTIONAL-REQS |
| `docker compose exec backend php artisan migrate:status` | schema vs MIGRATIONS |
| `cd mobile && npm run typecheck && npm run lint` | mobile truth |
| `rg -n "TODO|FIXME|stale|not implemented" Absolute/` | doc debt sweep |

Rules: (1) doc updates ship with the code change that invalidates them; (2) audits dated in filenames (`AUDIT-2026-07-30.md`) are immutable evidence, quoted but never edited; (3) this INDEX is the contract — new docs must be added here.

## 9. Version History

| Date | Version | Changes |
|---|---|---|
| 2026-07-29 | v1.0 | Initial documentation architecture (12 docs) |
| 2026-08-14 | **v2.0** | **Contract complete (46 docs)**: all 10 segments filled, stale claims fixed against HEAD (C-001/C-002/C-003 closed, DOCKER-ARCH port/network drift corrected, test counts refreshed, POPIA gaps closed), cross-reference matrix + flow maps + reading protocol added; every doc carries verified-status header; H-005 (wrong `PHALABORWA_CENTER` longitude) newly registered |
| 2026-08-14 | **v2.1** | **Conduct/Fleet/Parcel design set**: `ANTI-FRAUD-CANCEL-GUARD.md` + `FLEET-POOL-MODES.md` + `PARCEL-DELIVERY-ENGINE.md` (designs, no code); BACKLOG B-401…B-418, ENTITIES §6A, FAILURE-MODES F-FR/F-PL/F-PR, THREAT-MODEL T-06…T-12, BACKEND-GAP G-12…G-17; PHBIMH `SEG-14` adopted |