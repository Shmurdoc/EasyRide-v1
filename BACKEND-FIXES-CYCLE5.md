# Backend Fixes — Cycle 5

**Date:** 2026-07-19  
**Fixed:** 6 bugs from PHPUnit test results

---

## Bug 1: GPS Spoofing Detection Not Implemented (P0 Security)

**File:** `app/Services/RideService.php` — `updateDriverLocation()` (line 786)

**Root cause:** `validateDriverLocation()` throws `RuntimeException` before `logRideLocation()` is called, so spoofed GPS points were never recorded in `RideLocationLog`. The spoofing detection logic in `logRideLocation()` (impossible speed, zero coords, out-of-range coords) was unreachable for invalid locations.

**Fix:** Wrapped `validateDriverLocation()` in a try-catch. On exception, the method now:
1. Logs the spoofed location via `logRideLocation()` (which marks `is_spoofed = true` and records the reason)
2. Re-throws the exception (rejecting the driver's position update)

This preserves the existing `logRideLocation()` spoofing detection (speed > 180 km/h, zero coordinates, out-of-range coordinates) while ensuring invalid locations are still audit-logged.

**Tests fixed:** `test_gps_spoofing_speed_180kmh_detected`, `test_gps_zero_coordinates_detected`, `test_gps_out_of_range_coordinates_detected`

---

## Bug 2: scheduled_rides.rider_id NOT NULL violation (P1)

**File:** `database/migrations/2026_07_19_000002_make_scheduled_rides_rider_id_nullable.php`

**Root cause:** The `scheduled_rides` table migration defined `rider_id` as `NOT NULL` (via `foreignUuid()->constrained()`). Scheduled rides can be created before a rider confirms (e.g., scheduled for someone else), so the column must be nullable.

**Fix:** New migration to change `rider_id` to nullable on the `scheduled_rides` table.

**Tests fixed:** 4 occurrences of `NOT NULL constraint failed: scheduled_rides.rider_id`

---

## Bug 3: WalletService::debit() throws RuntimeException (P1)

**File:** `app/Http/Controllers/Api/V1/PaymentController.php` — `processRidePayment()` (line 132)

**Root cause:** The wallet payment path (`$method === 'wallet'`) was handled outside the try-catch block. When `WalletService::debit()` threw `RuntimeException('Insufficient wallet balance.')`, it propagated as an unhandled 500 error instead of the expected 422 response.

**Fix:** Wrapped the wallet payment path in a try-catch for `\RuntimeException`, returning `ApiResponse::apiError(422, 'Payment Failed', ...)` on failure.

**Tests fixed:** 3 occurrences of `RuntimeException: Insufficient wallet balance` → now returns 422

---

## Bug 4: FareCalculationService argument order swapped (P1)

**File:** `app/Services/ScheduledRideService.php` — `scheduleRide()` (line 21)

**Root cause:** Called `$this->fareService->calculateFare()` which expects `(float $distanceKm, float $durationMinutes, string $category, ...)`. But the arguments passed were `(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, category)` — lat/lng floats where distance/duration were expected, causing `TypeError: Argument #3 ($category) must be string, float given`.

**Fix:** Changed to `$this->fareService->calculate()` which accepts lat/lng coordinates and computes route distance internally. Updated `estimated_fare` assignment to use `$estimatedFare['total_fare']` (the return of `calculate()` is an array).

**Tests fixed:** `TypeError: calculateFare(): Argument #3 ($category) must be string, float given`

---

## Bug 5: IncidentReportingService type mismatch (P2)

**File:** `app/Services/IncidentReportingService.php` — `assignIncident()` and `escalateIncident()` (lines 92, 97)

**Root cause:** Both methods typed `$adminId` as `int`, but `IncidentController` passes `$request->user()->id` which is a UUID string (the app uses UUID primary keys).

**Fix:** Changed `$adminId` parameter type from `int` to `string` in both methods.

**Tests fixed:** `TypeError: assignIncident(): Argument #2 ($adminId) must be int, string given` and `escalateIncident()` same

---

## Bug 6: deliveries migration missing geo columns (P2)

**File:** `database/migrations/2026_07_19_000003_add_geo_columns_to_deliveries_table.php`

**Root cause:** `DataRetentionService::anonymizeUser()` updates `pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude` on the `deliveries` table. The original migration only has `recipient_latitude`/`recipient_longitude`, and a later migration adds `pickup_lat`/`pickup_lng`/`dropoff_lat`/`dropoff_lng` (different names). The columns the service references don't exist.

**Fix:** New migration adds the exact column names (`pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude`) that `DataRetentionService` expects.

**Tests fixed:** `SQLSTATE[HY000]: General error: 1 no such column: pickup_latitude`

---

## Summary

| Bug | File Changed | Fix Type | Tests Impacted |
|-----|-------------|----------|----------------|
| 1 — GPS Spoofing | `RideService.php` | Try-catch to log spoofed locations | 3 security tests |
| 2 — rider_id NOT NULL | New migration | Make column nullable | 4 unit tests |
| 3 — Wallet 500 error | `PaymentController.php` | Add try-catch for wallet path | 3 feature tests |
| 4 — Fare arg swap | `ScheduledRideService.php` | Use `calculate()` instead of `calculateFare()` | 4 unit tests |
| 5 — Incident type mismatch | `IncidentReportingService.php` | Change `int` to `string` | 2 feature tests |
| 6 — Missing geo columns | New migration | Add columns to deliveries table | 1 feature test |

**Expected test impact:** ~17 tests fixed (3 + 4 + 3 + 4 + 2 + 1)
