# EasyRyde — Fleet Pool Modes (Private vs EasyRyde-Employee Drivers)

> **Segment**: 03-WORKFLOWS · **Status**: DESIGN — 2026-08-14 (verified against HEAD)  
> **Linked**: `ANTI-FRAUD-CANCEL-GUARD.md` (conduct overlay), `FOOD-FLOWS.md`, `DRIVER-FLOWS.md`, `../02-DATA-MODEL/ENTITIES.md` (driver_profiles), `../01-REQUIREMENTS/BACKLOG.md` (B-407/B-408)

---

## 1. Requirement

Admin picks the driver pool per **vertical**, independently:

| Setting | Choices | Model |
|---|---|---|
| `rides_pool_mode` | `both` (default) / `private_only` / `easyryde_only` | applies to **ride dispatch** only |
| `food_pool_mode` | `both` (default) / `private_only` / `easyryde_only` | applies to **food & parcel delivery** only |

"Private drivers" = external vehicle owners; "EasyRyde employees" = drivers hired by EasyRyde (company vehicles, `drivers_pool` employee fleet). A driver can be **rationed by vertical** — e.g. employee fleet serves rides only while private drivers serve food only: the two settings are fully independent.

## 2. Verified Current State (gaps)

- **No per-vertical driver distinction exists.** Drivers are `users` with `role='driver'` (`UserRole` enum; `DriverMiddleware` only checks role) — same pool serves rides AND food AND future parcels.
- **Two divergent dispatch implementations** (must be unified, G-15):
  - `RideMatchingService::findNearbyDrivers` (27-46): role, is_online, no current ride, vehicle category active, 5 km haversine — **no `is_approved` check**.
  - `RideService::findNearbyDrivers` (151-175): adds `driverProfile.is_approved`.
  - Food/delivery: no radius/eligibility in `FoodDeliveryService::getAvailableOrders` (213-221); 15 km in `FoodOrderService::getAvailableOrders` (298-301); `acceptOrder` (155-178) hijacks `driver.current_ride_id` with no dual-vertical guard.
- No employee flag, no admin UI for it.

## 3. Design

### 3.1 Data — `driver_profiles.fleet_type`

New column `fleet_type varchar(20) default 'private'` — values `private` (external, default) | `easyryde` (employee). Set/updated only by admin:

- `POST /admin/manage/drivers/{id}/fleet-type` body `{fleet_type}` → `AdminAuditLog` action `set_fleet_type` (conventions of `AdminController::manage*`, api.php:355-363).
- Employee onboarding = existing KYC path + admin sets flag + optional `hired_at`; **`users.is_approved` still governs online eligibility** (unchanged).
- Admin `Drivers.tsx` gets a "Fleet" column + inline select (badge conventions).

### 3.2 Dispatch filters — every acceptance path (B-407/B-408)

| Path | File | Change |
|---|---|---|
| Ride dispatch | `RideMatchingService::findNearbyDrivers` | add pool filter + `is_approved` (closes G-15) |
| Ride dispatch (accept path) | `RideService::findNearbyDrivers` + `acceptRide` (203-293) | add pool filter |
| Food availability | `FoodOrderService::getAvailableOrders` | add `food_pool_mode` filter |
| Delivery availability | `FoodDeliveryService::getAvailableOrders` | add `food_pool_mode` filter |
| Online toggle | `DriverService::toggleOnline` (160-198) | unchanged (online is orthogonal) |
| Admin lists | `AdminController::manageDrivers` | surface `fleet_type` |

Filter helper (single source): `FleetModeService::allows(User $driver, string $vertical): bool` — reads vertical setting via `SettingService` (300 s cache, busted on write), compares `fleet_type`. `vertical ∈ {rides, food}`.

`food` vertical covers food orders **and** parcel deliveries (same `food_pool_mode`). If a future vertical needs its own mode, add a key — don't touch code.

### 3.3 Dual-vertical guard (with the fraud engine)

- `acceptRide` / `acceptOrder` / new `acceptParcel` must reject when driver `current_ride_id` is non-null **and** nominally a session is active (prevents one driver holding ride + food simultaneously) — currently only food sets it (155-178); rides path uses it too (523-525 frees on cancel). Add explicit cross-vertical check + test.
- Unpaid fines gate (from fraud engine §4): if `fraud_unpaid_fines_block_rides=true` → exclude from `getAvailableOrders`/accept paths.

### 3.4 Empty-pool protection

`rides_pool_mode=easyryde_only` with zero approved employee drivers online → no supply. Guard: admin Settings shows live counts next to each mode (`GET /admin/dashboard` already aggregates); `AdminController::updateSettings` rejects a mode change to a pool with 0 approved+online drivers unless `confirm_empty_pool=true` in the request (audit-logged override, failure mode F-PL-01).

## 4. Admin UX

- **Settings page** (`admin/src/pages/Settings.tsx`): two new selects under "Driver Pools" card — Rides mode / Food & delivery mode (enum → `<select>` convention `Settings.tsx:32,410-412`), each with live approved-Online count per fleet row.
- **Drivers page**: Fleet column + inline `fleet_type` select (audit-logged).
- Both POST via existing `/admin/settings` (rides_pool_mode, food_pool_mode) and `/admin/manage/drivers/{id}/fleet-type`.

## 5. Tests (B-407/B-408)

| Test | Assert |
|---|---|
| `FleetModeTest::test_private_only_excludes_employee_driver_rides` | employee driver never offered ride (both search paths) |
| `...::test_easyryde_only_excludes_private_driver_food` | private driver excluded from `getAvailableOrders` |
| `...::test_both_includes_everyone` | default unchanged |
| `...::test_no_approved_employee_online_rejects_mode_change` | updateSettings 422 + audit row |
| `...::test_vertical_independence` | rides=private_only unaffected by food=both |
| `...::test_cross_vertical_accept_rejected` | driver mid-ride cannot accept food/parcel |

## References

- Dispatch internals: `../02-DATA-MODEL/ENTITIES.md` (driver_profiles, users), `DRIVER-FLOWS.md`, `FOOD-FLOWS.md` · Gap G-15: `../04-QA-AUDIT/BACKEND-GAP-ANALYSIS.md` · Backlog B-407/B-408 · Threats: `../05-SECURITY/THREAT-MODEL.md` T-10