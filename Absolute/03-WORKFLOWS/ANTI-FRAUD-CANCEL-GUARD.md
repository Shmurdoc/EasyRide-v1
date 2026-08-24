# EasyRyde — Anti-Fraud Cancellation Guard (Driver Conduct Engine)

> **Segment**: 03-WORKFLOWS · **Status**: DESIGN — 2026-08-14 (no code yet; all claims verified against HEAD 650d3b1)  
> **Linked**: `../02-DATA-MODEL/ENTITIES.md` (ledger), `PAYMENT-FLOWS.md` (money), `FAILURE-MODES.md` (F-FR-*), `../01-REQUIREMENTS/BACKLOG.md` (B-401…B-406, B-413), `../05-SECURITY/THREAT-MODEL.md` (T-06…T-12)

---

## 1. Problem (verified)

- **`cancellation_fee` is computed but NEVER charged.** Grep of `cancellation_fee`: persisted in `RideService::cancelRide` (466-543) and computed in `CancellationService` (R15-R35 per status), but **no wallet debit, no payment row, no payout offset anywhere**. A driver can cancel at any moment (incl. after pickup, incl. 20 m from dropoff) with zero financial consequence.
- `RideStateService`/`CancellationService` cancel-request flow is **dead code from the HTTP layer** (only `RideService::cancelRide` is live).
- No penalty/fine mechanism exists (`fine|penalty|violation|infraction` → zero matches in app/database).

## 2. Rules (edge cases)

| # | Trigger (driver-initiated cancel) | Rule | Fine |
|---|---|---|---|
| R1 | **Cancel after pickup** — status `in_progress` / `near_drop_off` (i.e. `picked_up_at` set) | always a violation | `fraud_fine_cancel_after_pickup` (default R50) |
| R2 | **Cancel near destination** — status `accepted…waiting_for_rider` AND haversine(driver loc → `rides.dropoff_latitude/longitude`) ≤ `fraud_near_dropoff_radius_km` (**admin-editable**, default 1.0 km) | always a violation | `fraud_fine_cancel_near_dropoff` (default R50) |
| R3 | Collusion — ≥ `fraud_collusion_pair_cancels` (default 3) cancelled rides between the **same rider+driver pair** inside `fraud_collusion_window_days` (default 7) | pair flagged, **no auto-fine**, admin review | — |
| R4 | Driver cancel before R1/R2 conditions (searching…arrived, far from dropoff) | current behavior, fee recorded only | 0 (existing `cancellation_fee` fields) |
| R5 | Rider/system/admin cancel | never fined | — |

- Distance source: latest accepted `ride_location_logs` row for the ride, else `users.current_latitude/longitude`; haversine = `RideMatchingService::calculateDistance` (81-95). GPS-spoof guard already exists (`validateDriverLocation`, MAX_LOCATION_JUMP_KM=5.0).
- Fines are ZAR, wallet-carrier debt (see §4). Cash rides: fine still accrues to `driver_violations` and offsets the next wallet payout — no cash-out loophole.

## 3. Ledger & Settings

New table **`driver_violations`** (migration B-403):

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK nullable | tenancy rule (`ENTITIES.md` §7) |
| driver_id | uuid FK users | the driver |
| rider_id | uuid FK users nullable | the ride requester (R3 tracking) |
| ride_id | uuid FK rides nullable | evidence link |
| delivery_id | uuid FK deliveries nullable | parcel parity (R-P1/P2) |
| violation_type | varchar(30) | `cancel_after_pickup`, `cancel_near_dropoff`, `collusion_flag`, `parcel_cancel_after_pickup`, `parcel_cancel_near_dropoff`, `other` |
| fine_amount | decimal(10,2) default 0 | ZAR |
| status | varchar(20) | `pending` → `paid` / `waived` / `disputed` |
| distance_to_dropoff_km | decimal(8,2) nullable | evidence |
| reason | varchar(255) | driver reason + rule id |
| evidence | json | status-history snapshot, location points, times, fare |
| decided_by | varchar(40) nullable | admin id on waive/dispute |
| decided_at | timestamp nullable | |

New `system_settings` (all numbers/enums, see B-401 for `enum` type + `options` column):

| Key | Type | Default | Who edits |
|---|---|---|---|
| `fraud_fine_cancel_after_pickup` | number | 50 | admin (Settings) |
| `fraud_fine_cancel_near_dropoff` | number | 50 | admin (Settings) |
| `fraud_near_dropoff_radius_km` | number | 1.0 | **admin (Settings) — the distance thy user asked to be editable** |
| `fraud_collusion_window_days` | number | 7 | admin |
| `fraud_collusion_pair_cancels` | number | 3 | admin |
| `fraud_unpaid_fines_block_rides` | boolean | false | admin |

Distance check is **server-computed at cancel time**; admin edits the threshold live — the setting is read per evaluation (cached 300s via new `SettingService`, busted on write — fixes G-14).

## 4. Money Mechanics (no negative balances)

`WalletService::debit()` throws on insufficient balance (350-362) — fines must not throw:

1. Violation row created → `status=pending`.
2. Try `WalletService::debit(driver wallet, fine, reference_type='driver_fine', reference_id=violation)` (+ new `driver_fine` in the `reference_type` vocabulary; `WalletTransaction` with balance_before/after for audit).
3. Insufficient balance → violation stays `pending` (debt); `SettlementService` (22-103) **must subtract unpaid fines from payable** at payout (`available = balance − Σ unpaid fines`). B-409.
4. Gate (optional): with `fraud_unpaid_fines_block_rides=true`, `acceptRide` / `getAvailableOrders` exclude drivers with unpaid fines. B-406.
5. Admin actions (audit-logged, `AdminAuditLog` pattern): `waive` (decided_by/at), `charge` (retry debit), `dispute` (driver can open; admin verdict).

## 5. Flow — wiring

```
Driver POST /rides/{ride}/cancel  (RideController::cancel 85-104)
  → RideService::cancelRide (466-543)
    → NEW DriverFraudGuardService::evaluateCancellation($ride, $driver, $reason)
        reads settings (SettingService) → R1/R2 checks → violation + debit
        → detectCollusion($rider, $driver) → R3 flag (queued admin notice)
    → existing transition + history + driver release (unchanged)
  → 201 cancelled (fine summary in response: fine_amount, violation_id, status)
    → driver notified (existing notifications pipeline) + admin dashboard badge
      (dashboard metrics pattern: add pending_violations count)
```

Service contract (`DriverFraudGuardService`):
- `evaluateCancellation(Ride $ride, User $driver, ?string $reason): ?DriverViolation`
- `evaluateParcelCancellation(Delivery $delivery, User $driver): ?DriverViolation` (parcel parity)
- `detectCollusion(User $rider, User $driver, ?int $days = null): ?DriverViolation`
- `unpaidFinesTotal(User $driver): float` · `hasUnpaidFines(User $driver): bool`
- `applyFine(DriverViolation $v, float $amount): string` (returns paid|pending-debt)

## 6. Admin Console

| Endpoint | Purpose |
|---|---|
| `GET /admin/fraud/violations` (filters: status, type, driver_id, from/to) | register (new page, conventions of `Drivers.tsx` table + badges) |
| `POST /admin/fraud/violations/{id}/waive` | waive + audit log `waive_violation` |
| `POST /admin/fraud/violations/{id}/charge` | retry debit |
| `POST /admin/fraud/violations/{id}/dispute-resolve` | verdict on disputed |
| settings | existing `POST /admin/settings` upsert loop (`Settings.tsx:166-182`) + new fields; distance/fines editable here |

## 7. False-Positive Controls

1. Radius fine needs **2+ accepted location logs** for the ride (single-ping spoof won't trigger).
2. Collusion flag is advisory-only (no auto-fine) — human review, `admin_audit_logs`.
3. `cancelled_by_system` / admin / rider cancels are never fined (R5).
4. Every fine renderable with full evidence json; waiver is reversible via new violation (re-offence history retained).
5. Driver sees fine + reason + distance in app (notification deep link → new "Violations" driver screen, B-416).

## References

- Cancel internals: `../02-DATA-MODEL/ENTITIES.md` (rides), `PAYMENT-FLOWS.md`, `FAILURE-MODES.md` F-FR-01..04 · Threats T-07/08/09/11 · Backlog B-401…B-406, B-413, B-416 · Runbook: `../09-OPS/RUNBOOKS.md` R-ADMIN-SOP pattern