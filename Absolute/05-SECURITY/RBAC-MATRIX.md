# EasyRyde — RBAC Matrix (Who Can Do What)

> **Segment**: 05-SECURITY · **Status**: VERIFIED 2026-08-14 — matches middleware aliases + route groups  
> **Linked**: `../01-REQUIREMENTS/ACTORS.md`, `../03-WORKFLOWS/AUTH-FLOWS.md`, `../../docs/flow/03-admin/admin-system-flow.md`

---

## 1. Roles & Guards

| Role | Guard(s) | Created by | Notes |
|---|---|---|---|
| rider | web, api | DatabaseSeeder, RolesAndPermissionsSeeder | default on register |
| driver | web, api | role assignment via `createDriver` / admin | gated by `DriverMiddleware` (`hasRole('driver')`) |
| admin | web, api | seeders | `AdminMiddleware` (`hasAnyRole(['admin','super-admin'])`) |
| super-admin | web, api | `seed-admin.sh` / seeder | same API surface as admin + implied perms |

**Route aliases**: `role` (spatie), `admin`, `driver`, `admin.totp`, `tenant` (merges tenant_id), `webhook.ip`.

## 2. Permission Matrix (permission objects from seeders)

| Permission | rider | driver | admin | super-admin |
|---|---|---|---|---|
| view-dashboard | ❌ | ❌ | ✅ | ✅ |
| manage-users | ❌ | ❌ | ✅ | ✅ |
| manage-rides | ❌ | ❌ | ✅ | ✅ |
| manage-drivers | ❌ | ❌ | ✅ | ✅ |
| manage-payments | ❌ | ❌ | ✅ | ✅ |
| manage-promotions | ❌ | ❌ | ✅ | ✅ |
| manage-deliveries | ❌ | ❌ | ✅ | ✅ |
| manage-settings | ❌ | ❌ | ✅ | ✅ |
| *(legacy space-named set from RolesAndPermissionsSeeder)* | ❌ | ❌ | ✅ | ✅ |

## 3. Route-Level Enforcement (the real gate)

| Route family | Guard |
|---|---|
| `/rides/{id}/driver-accept\|driver-arrived\|start\|complete`, `/drivers/*` (profile/vehicle/online/earnings/trips/stats/location), `/driver/food/*`, `/driver/pool/*` | `role:driver` |
| `/admin/*`, `/admin/manage/*`, `/inspector/*`, `/admin/reports/*`, `/admin/totp/*`, refund, `admin/compliance/*`, `admin/wallets/*` | `role:admin|super-admin` (+`admin.totp` when enabled) |
| `/admin/totp/disable` | role + `admin.totp` |
| `/payments/{payment}/refund` | `role:admin|super-admin` |
| `/deliveries/{delivery}/assign` | `role:admin|super-admin` |
| Everything else authed | any role |
| Public (health, config, auth, fare-estimate, places, promo validate, webhooks) | none |

## 4. Channel-Level (socket)

| Channel | Allowed |
|---|---|
| `ride.{rideId}` | ride rider, ride driver, admin |
| `driver.{driverId}`, `driver.{driverId}.tracking` | self or admin |
| `riders.{riderId}` | self or admin |
| `deliveries.{id}` | open (closure true) |
| `admin` | admin role |

## 5. Semantics & Pitfalls

- `DriverMiddleware` checks `hasRole('driver')` — **tests must assign roles** (`$user->assignRole('driver')`) per AGENTS.md.
- **Roles are per-guard** — seeders create roles for both `web` and `api`; assigning only `web` role leaves the API unprotected.
- No policy classes exist (`app/Policies` absent) — all authz is route middleware + service ownership checks. Keep it that way or add policies deliberately.
- Admin audit log covers `admin/*` mutations; ride transitions audited by `ride_status_histories`.

## 6. Test Contracts

| Test | Asserts |
|---|---|
| `AdminMiddlewareTest`, `DriverMiddlewareTest`, `TenantMiddlewareTest` | role rejection 403, tenant merge |
| `SecurityTest` | rider→driver endpoint 403 |
| `SecurityFixTest` | wallet-confirm 403 for wrong user |

## References

- Actors: `../01-REQUIREMENTS/ACTORS.md` · Threat: `THREAT-MODEL.md` · Audit trail: `../09-OPS/RUNBOOKS.md`