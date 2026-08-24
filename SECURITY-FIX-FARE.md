# SECURITY FIX: Ride Fare Manipulation Vulnerability

**Date:** 2026-07-19  
**Severity:** CRITICAL  
**CVSS:** 9.1 (Network/Low/None/Changed/High/High)

---

## Vulnerability

The `POST /rides/{ride}/complete` endpoint accepted `distance_km` and `duration_minutes` in the request body from the driver. These values were used directly to recalculate the final fare, allowing a malicious driver to:

- Set values to near-zero → rider gets free rides
- Inflate values arbitrarily → rider gets overcharged
- No bounds validation existed against the original fare estimate

## Root Cause

In `RideController::completeRide()`, the controller passed user-supplied values directly to `RideService::completeRide()`:

```php
// BEFORE (VULNERABLE)
$completedRide = $this->rideService->completeRide(
    $ride,
    (float) $request->input('distance_km', $ride->distance_km),
    (float) $request->input('duration_minutes', $ride->duration_minutes),
);
```

## Fixes Applied

### 1. Removed driver-submitted distance/duration (CRITICAL)
**File:** `app/Http/Controllers/Api/V1/RideController.php:210`

The `completeRide` endpoint no longer accepts `distance_km` or `duration_minutes` from the request body. The driver simply signals ride completion; all calculations are server-side.

```php
// AFTER (SECURE)
$completedRide = $this->rideService->completeRide($ride);
```

### 2. Server-calculated distance/duration from GPS tracking data
**File:** `app/Services/RideService.php:328` (completeRide) + new `calculateServerSideFare()` method

- During an in-progress ride, every driver location update (`POST /rides/{ride}/location`) is logged to the new `ride_location_logs` table via `logRideLocation()`
- At ride completion, GPS log points are summed using Haversine to compute actual distance
- Duration is derived from first-to-last valid GPS timestamp
- Fallback: If fewer than 3 valid GPS points exist, uses OSRM route service for distance and actual wall-clock time for duration

### 3. GPS spoofing detection
**File:** `app/Services/RideService.php` — `logRideLocation()` + enhanced `validateDriverLocation()`

Detection runs on every location update during a ride:

| Check | Threshold | Action |
|---|---|---|
| Speed between consecutive points | > 180 km/h | Point marked `is_spoofed = true` |
| Location jump | > 5 km in < 300 seconds | Point marked `is_spoofed = true` |
| Zero coordinates | lat=0, lng=0 | Point marked `is_spoofed = true` |
| Out-of-range coordinates | lat ∉ [-90,90] or lng ∉ [-180,180] | Point marked `is_spoofed = true` |

Spoofed points are **excluded** from fare distance calculations. The audit log records how many points were rejected.

### 4. Fare bounds validation (20% threshold)
**File:** `app/Services/RideService.php:387-410`

The final calculated fare is compared against the fare estimate stored at booking time (`estimated_fare_at_booking`):

```
if |calculated_fare - estimated_fare| / estimated_fare > 20%:
    clamp fare to [estimated * 0.80, estimated * 1.20]
```

This prevents both free-ride attacks and overcharge attacks, even if GPS data is manipulated. Logged as a warning for fraud investigation.

### 5. Fare calculation audit logging
**File:** `rides` table — new `fare_calculation_log` JSON column

Every fare calculation now stores a complete audit trail:

```json
{
  "method": "gps_tracking",
  "spoofed_points_detected": 2,
  "valid_points_used": 47,
  "estimated_fare_at_booking": 150.00,
  "calculated_fare": 162.50,
  "fare_deviation_pct": 8.33,
  "adjusted_to_estimate": false,
  "timestamp": "2026-07-19T14:30:00Z"
}
```

### 6. New database objects
- **Migration:** `database/migrations/2026_07_19_000001_create_ride_location_logs_table.php`
  - Creates `ride_location_logs` table (GPS audit trail per ride)
  - Adds `estimated_fare_at_booking`, `fare_calculation_log`, `server_calculated_distance_km`, `server_calculated_duration_minutes` to `rides`
- **Model:** `app/Models/RideLocationLog.php`
- **Relationship:** `Ride::locationLogs()` added

## Files Changed

| File | Change |
|---|---|
| `app/Http/Controllers/Api/V1/RideController.php` | Removed distance/duration params from completeRide |
| `app/Services/RideService.php` | Server-side fare calculation, GPS logging, spoofing detection, fare bounds validation, audit logging |
| `app/Models/Ride.php` | Added `locationLogs()` relationship, new fillable columns |
| `app/Models/RideLocationLog.php` | **New** — GPS location log model |
| `database/migrations/2026_07_19_000001_create_ride_location_logs_table.php` | **New** — migration for ride_location_logs + rides columns |

## Attack Resistance

| Attack Vector | Before | After |
|---|---|---|
| Driver sets distance=0 | Free ride | Blocked — server calculates from GPS |
| Driver sets distance=9999 | Overcharge | Blocked — fare clamped to ±20% of estimate |
| Driver sends fake GPS | N/A | Detected via speed/jump checks, excluded from calc |
| Driver skips GPS updates | N/A | Falls back to OSRM route + wall-clock duration |
| No tracking data at all | N/A | OSRM route distance + actual elapsed time |

## Deployment Notes

1. Run `php artisan migrate` to create `ride_location_logs` table and add new `rides` columns
2. The `estimated_fare_at_booking` column will be null for existing rides — fare bounds validation is skipped for rides created before this fix (the `> 0` guard handles this)
3. Consider adding an admin alert when `adjusted_to_estimate` is `true` in the fare_calculation_log — indicates potential fraud
4. The `ride_location_logs` table will grow; consider a scheduled cleanup (e.g., retain 90 days)
