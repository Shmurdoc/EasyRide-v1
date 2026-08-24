# EasyRyde — Expansion Roadmap (Phalaborwa → Limpopo → SA → Africa)

> **Segment**: 10-BUSINESS · **Status**: 2026-08-14 · Aligned to the true goal (SYSTEM-OVERVIEW §1)  
> **Linked**: `BUSINESS-ENTITIES.md`, `ADVERTISING.md`, `../02-DATA-MODEL/ENTITIES.md` (tenancy), `../07-INFRASTRUCTURE/DEPLOYMENT.md`

---

## 1. Phases

| Phase | Scope | Enablers (already built) | Gaps |
|---|---|---|---|
| **P0 — Phalaborwa city** | rides + food + admin panel live, trusted | everything in this doc set | load evidence, ops SOPs, launch checklist (docs/flow) |
| **P1 — Limpopo region** (Tzaneen, Polokwane, Hoedspruit) | expand driver/rider supply; region config | `tenants.region`, per-tenant settings, geo seeds, PhalaborwaLocationSeeder pattern | region-specific pickup lists; local language packs |
| **P2 — SA metros** | food vertical depth + partner restaurants | food stack complete; PayFast/Ozow/Stripe national gateways | metro map tile strategy, support team, PCI ops review |
| **P3 — PHBIMH umbrella tenants** (stays, rentals) | new tenant modules on same core | `tenants` + multi-segment design; BusinessTheme per slug | tenant module scaffolding (stays/rentals tables) |
| **P4 — Pan-Africa** | currency/multi-market | ZAR→configurable currency; `tenants.currency` field | regional payment rails (M-Pesa etc.), compliance per country |

## 2. What Already Supports Expansion (verified)

| Capability | Evidence |
|---|---|
| Multi-tenant from day one | `tenants` + `tenant_id` FK on rides/payments/food/promos/settings/peak/surge/payouts |
| Regional config without code | `system_settings` typed values; `PhalaborwaLocationSeeder` pattern per region |
| Business theming per tenant slug | `businessThemes.ts` (`rides|food|admin`) + BusinessIdentity types |
| Gateway diversity | cash, wallet, Stripe, PayFast, Ozow — Ozow/SANRAL-friendly ZA rails; PHBIMH B2B webhooks |
| i18n hook | `i18n/index.ts` + `expo-localization` (en only today — B-3xx adds Sepedi/Tsonga) |
| Admin at scale | web admin + Expo admin; report endpoints aggregate by period & region |

## 3. Tenant Launch Recipe (repeatable)

```
1 Tenant row (name/slug/domain/region/currency)        5 Geo: region lat/lng + pickup-point seeds
2 Settings copy (fare tables, fee %, radius, surge cap) 6 Admin user seeded (tenant-scoped)
3 Payments: gateway config per tenant (PayFast/Ozow keys) 7 Business theme slug (branding)
4 Promos: regional promo set (WELCOME10 pattern)       8 Load test + launch checklist (flow docs)
```

## 4. Constraints & Risks

| Risk | Mitigation |
|---|---|
| Single-host prod → region scale fails | HA pair + blue/green (deployment docs), pgbouncer already in stack |
| Search-radius model (5 km) may not fit metro scale | `expandSearchRadius` + radius setting; revisit with geo-partitioning when >10k active drivers |
| OSRM single instance | HA/routing provider choice (B-204) |
| Regional compliance (P4) | POPIA-first stack; per-country DPIA + local payment rails |
| Cash-first economics don't transfer to metros | wallet + card rails strong; monitor cash reconciliation cost |

## 5. Expansion Definition-of-Done

Per new region/tenant, run: test suite green → region seed applied → route matrix pass → k6 smoke (rides+location) → health-check.sh pass → ops checklist (RUNBOOKS R-ADMIN-SOP) → post-launch 7-day monitoring review (SLO-SLI).

## References

- Business model: `BUSINESS-ENTITIES.md` · Ads: `ADVERTISING.md` · Ops: `../09-OPS/RUNBOOKS.md` · Deploy: `../07-INFRASTRUCTURE/DEPLOYMENT.md`