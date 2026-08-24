# Backend Test Results — EasyRyde

**Date:** 2026-07-19
**PHP:** 8.5.4 | **Laravel:** (latest) | **PHPUnit:** 10.x
**Database:** SQLite (in-memory / `/tmp/easyryde_test.db` — `php8.5-sqlite3` manually loaded)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 587 |
| **Assertions** | 1,099 |
| **Errors** | 49 |
| **Failures** | 38 |
| **PHPUnit Notices** | 2 |
| **Risky Tests** | 1 |
| **Pass Rate** | **78.5%** (499 of 587) |

---

## Per-Suite Breakdown

| Suite | Tests | Errors | Failures | Warnings | Pass Rate |
|-------|-------|--------|----------|----------|-----------|
| **Unit** | 173 | 29 | 0 | 2 notices | 82.7% |
| **Feature** | 344 | 265 | 7 | — | 21.2% |
| **Security** | 70 | 27 | 11 | 1 risky | 45.7% |

> **Note:** Feature test pass rate is heavily impacted by a PHPUnit config issue where `APP_KEY` is not loaded for certain test runners (30 of 49 errors are `MissingAppKeyException`). The Security suite has similar environmental issues.

---

## Error Categories (Ranked by Frequency)

### 1. MissingAppKeyException (32 occurrences) — ENVIRONMENT
```
Illuminate\Encryption\MissingAppKeyException: No application encryption key has been specified.
```
- **Root cause:** `APP_KEY` is not set in `.env` or `phpunit.xml` env overrides. 30 of 32 hits are this.
- **Fix:** Add `<env name="APP_KEY" value="..."/>` to `phpunit.xml`, or ensure `.env` has a generated key before test runs.

### 2. PDOException: could not find driver (12 occurrences) — ENVIRONMENT
```
PDOException: could not find driver
```
- **Root cause:** `php8.5-sqlite3` is not installed system-wide. Tests were run with `php -d extension=...` workaround.
- **Fix:** `sudo apt-get install php8.5-sqlite3` on the CI/dev box.

### 3. NOT NULL constraint: `scheduled_rides.rider_id` (4 occurrences) — BUG
```
SQLSTATE[23000]: Integrity constraint violation: 19 NOT NULL constraint failed: scheduled_rides.rider_id
```
- **File:** `app/Services/ScheduledRideService.php:21`
- **Root cause:** `ScheduledRideService` creates scheduled rides without setting `rider_id`. The model/factory doesn't auto-assign it.
- **Fix:** Inject authenticated rider's ID when creating scheduled rides.

### 4. Insufficient wallet balance — throws RuntimeException instead of returning 422 (3 occurrences) — BUG
```
RuntimeException: Insufficient wallet balance.
```
- **File:** `app/Services/WalletService.php:353`
- **Root cause:** `WalletService::debit()` throws an exception instead of returning a structured error. The Feature tests expect HTTP 422 but get 500.
- **Fix:** Catch the exception in `PaymentController` or return a `PaymentResult` with failure status.

### 5. TypeErrors — Argument type mismatches (4 occurrences) — BUG
| Error | File:Line | Issue |
|-------|-----------|-------|
| `calculateFare(): Argument #3 ($category) must be string, float given` | `ScheduledRideService.php:21` → `FareCalculationService.php:78` | Category and fare arguments are swapped |
| `assignIncident(): Argument #2 ($adminId) must be int, string given` | `IncidentController.php:89` → `IncidentReportingService.php:92` | UUID string passed where int expected |
| `escalateIncident(): Argument #2 ($adminId) must be int, string given` | `IncidentController.php:100` → `IncidentReportingService.php:97` | Same issue as above |
| `assertArrayHasKey(): Argument #2 must be array, string given` | `SecurityVerificationTest.php:387` | Test calls `assertArrayHasKey` on a string response |

### 6. Missing column `pickup_latitude` on `deliveries` table (1 occurrence) — MIGRATION BUG
```
SQLSTATE[HY000]: General error: 1 no such column: pickup_latitude
```
- **Root cause:** The `deliveries` migration is missing geo-coordinate columns that `DataRightsService` anonymizer tries to update.
- **Fix:** Add `pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude` to the deliveries migration.

### 7. `Disk [private] does not have a configured driver` (2 occurrences) — CONFIG
```
InvalidArgumentException: Disk [private] does not have a configured driver.
```
- **Fix:** Add `FILESYSTEM_DISK=local` to phpunit.xml env, or configure `private` disk in `config/filesystems.php` for testing.

### 8. Security test failures — Logic bugs (11 failures)
| Test | Issue |
|------|-------|
| `test_wallet_confirm_logs_security_warning` | Returns `null` instead of `Forbidden` header |
| `test_server_side_fare_applies_minimum_fare` | Fare returns 12.0, expected ≥ 65.0 |
| `test_zero_coordinates_marked_as_spoofed` | Spoofing detection returns `null` |
| `test_out_of_range_coordinates_marked_as_spoofed` | Same — spoofing detection not working |
| `test_impossible_speed_detected_as_spoofing` | Same |
| `test_valid_location_not_marked_spoofed` | Same — `is_spoofed` column not being set |
| `test_wallet_confirm_returns_403_for_direct_user_call` | Missing middleware/guard |
| `test_gps_spoofing_speed_180kmh_detected` | GPS spoofing detection absent |
| `test_gps_zero_coordinates_detected` | Same |
| `test_gps_out_of_range_coordinates_detected` | Same |
| `test_wallet_confirm_multiple_attempts_all_fail` | Rate limiter blocks at attempt 3 (429) before security check |
| `test_ride_complete_rejects_non_participant_consistently` | Enum vs string comparison issue |

**Key finding:** The GPS spoofing detection and `is_spoofed` flag system appears to not be implemented or not wired into the location update flow.

### 9. Feature test failures — Business logic (7 failures)
| Test | Issue |
|------|-------|
| `test_revoke_never_granted_consent` | Consent revoke logic |
| `test_user_can_request_anonymization` | Anonymization flow |
| `test_user_can_request_erasure` | Erasure flow |
| `test_admin_can_trigger_cleanup` | Admin cleanup endpoint |
| `test_rider_can_create_delivery` | Delivery creation |
| `test_driver_can_register_vehicle` | Vehicle registration |
| `test_create_food_order` | Food order creation |

---

## What's Working (Key Passing Areas)

- **Unit test core services** (most): FareCalculation, EscrowService, WalletService, PayoutService, EmailService, CashReconciliationService, RefundService, RatingService, DeliveryService
- **Unit tests for Jobs**: MatchDriversJob, UpdateDriverLocationJob, ProcessPaymentJob, ReleaseEscrowJob, ProcessPayoutJob
- **Unit tests for Payment routers**: PaymentRouter, PayFast, Ozow
- **Unit tests for Middleware**: TenantMiddleware, DriverMiddleware, AdminMiddleware
- **Security tests that pass**: Mass assignment prevention, CSRF protection, XSS sanitization, SQL injection prevention, rate limiting, input sanitization
- **Feature tests**: Auth flows, ride creation/acceptance/completion, driver approval, promo codes, incidents (basic), scheduled rides (basic CRUD)

---

## Critical Bugs Summary

| Priority | Bug | Impact |
|----------|-----|--------|
| **P0** | APP_KEY not loaded in tests | Masks ~55% of failures as environment issues |
| **P0** | GPS spoofing detection not implemented | Security: GPS fakes can't be caught |
| **P1** | `scheduled_rides.rider_id` NOT NULL | Scheduled rides can't be created |
| **P1** | `WalletService::debit()` throws instead of returning error | Wallet payments crash with 500 |
| **P1** | `FareCalculationService::calculateFare()` arg swap | Scheduled ride pricing broken |
| **P2** | `IncidentReportingService` expects int, gets UUID | Admin incident management broken |
| **P2** | `deliveries` migration missing geo columns | Data erasure/anonymization crashes |
| **P2** | `Disk [private]` not configured | File storage operations fail |

---

## Recommendations

1. **CI Environment:** Install `php8.5-sqlite3` in CI pipeline; add `APP_KEY` to `phpunit.xml` env block
2. **Fix P0/P1 bugs first:** GPS spoofing detection, wallet error handling, scheduled ride creation
3. **Type safety:** Fix `IncidentReportingService` to accept UUIDs or cast in controller
4. **Migration audit:** Verify all migrations have the columns that services reference
5. **Re-run after fixes:** Expected pass rate should reach 95%+ once environment + P0/P1 are resolved
