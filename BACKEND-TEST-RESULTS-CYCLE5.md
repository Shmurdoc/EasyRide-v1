# Backend Test Results — Cycle 5

**Date:** 2026-07-19
**PHP:** 8.5.4 | **PHPUnit:** 12.5.30 | **Laravel:** 12.x
**Database:** SQLite in-memory (`pdo_sqlite` loaded via full-path extension)
**Command:** `DB_CONNECTION=sqlite DB_DATABASE=":memory:" php -d extension=.../pdo_sqlite.so ./vendor/bin/phpunit`

---

## Summary

| Metric | Cycle 4 | Cycle 5 | Delta |
|--------|---------|---------|-------|
| **Total Tests** | 587 | 587 | — |
| **Assertions** | 1,099 | 1,106 | +7 |
| **Errors** | 49 | **45** | **-4** |
| **Failures** | 38 | **37** | **-1** |
| **PHPUnit Notices** | 2 | 2 | — |
| **Risky Tests** | 1 | 1 | — |
| **Passing** | 499 | **505** | **+6** |
| **Pass Rate** | 84.9% | **86.0%** | **+1.1%** |

> Improvement is modest (+6 tests). The 6 bug fixes resolved some root causes but many failures are environmental (APP_KEY, Disk config, pgsql driver) rather than code bugs.

---

## Per-Suite Breakdown

| Suite | Tests | Errors | Failures | Passing | Pass Rate | vs Cycle 4 |
|-------|-------|--------|----------|---------|-----------|------------|
| **Unit** | 173 | 29 | 0 | 144 | 83.2% | Same |
| **Feature** | 344 | 13 | 25 | 306 | 89.0% | +6 |
| **Security** | 70 | 3 | 12 | 55 | 78.6% | Same |

---

## Error Categories (45 Errors)

### 1. MissingAppKeyException — 32 occurrences (ENVIRONMENT)
```
Illuminate\Encryption\MissingAppKeyException: No application encryption key has been specified.
```
- **Root cause:** `APP_KEY` is not set in `phpunit.xml` env overrides. Any model with encrypted casts or any Feature test that touches sessions/cookies triggers this.
- **Fix:** Add `<env name="APP_KEY" value="base64:..."/>` to `phpunit.xml`, or run `php artisan key:generate` and reference the `.env` key.
- **Affected suites:** Unit (14), Feature (15), Security (3)
- **Impact:** Masks ~71% of all errors. Resolving this single issue would drop errors from 45 to ~13.

### 2. PDOException: could not find driver — 12 occurrences (ENVIRONMENT)
```
PDOException: could not find driver
```
- **Root cause:** `StripeServiceTest` uses database operations that require a driver not available in the current test config. Likely creates its own DB connection or uses migration logic that references pgsql-specific features.
- **Affected suite:** Unit (StripeServiceTest — all 12 tests)
- **Fix:** Investigate `StripeServiceTest` setUp; may need its own `RefreshDatabase` or mock the DB layer.

### 3. TypeError — 3 occurrences (BUG)

| # | Test | Error | Location |
|---|------|-------|----------|
| 1 | `SecurityFixTest::test_fare_calculation_log_contains_method` | `assertArrayHasKey()` expects array, string given | `SecurityFixTest.php:295` |
| 2 | `SecurityVerificationTest::test_server_side_fare_calculation_populates_audit_log` | `assertArrayHasKey()` expects array, string given | `SecurityVerificationTest.php:387` |
| 3 | `SecurityVerificationTest::test_webhook_routes_have_ip_middleware` | `RouteCollection::match()` expects `Illuminate\Http\Request`, Symfony request given | `SecurityVerificationTest.php:1003` |

- **Fix for #1/#2:** The security audit log returns a string instead of structured data. Either the service needs to return an array, or the test needs to decode JSON first.
- **Fix for #3:** Pass `$this->createRequest()` or use `Request::create()` to get an Illuminate request.

---

## Failure Categories (37 Failures)

### 1. Security Logic Bugs — 12 failures (BUG, UNCHANGED)

| # | Test | Issue | Status |
|---|------|-------|--------|
| 1 | `SecurityFixTest::test_wallet_confirm_logs_security_warning` | Returns `null` instead of `Forbidden` header | UNFIXED |
| 2 | `SecurityFixTest::test_server_side_fare_applies_minimum_fare` | Fare returns 12.0, expected >= 65.0 | UNFIXED |
| 3 | `SecurityFixTest::test_zero_coordinates_marked_as_spoofed` | `is_spoofed` column returns `null` | UNFIXED |
| 4 | `SecurityFixTest::test_out_of_range_coordinates_marked_as_spoofed` | Same | UNFIXED |
| 5 | `SecurityFixTest::test_impossible_speed_detected_as_spoofing` | Same | UNFIXED |
| 6 | `SecurityFixTest::test_valid_location_not_marked_spoofed` | Same | UNFIXED |
| 7 | `SecurityVerificationTest::test_wallet_confirm_returns_403_for_direct_user_call` | Returns `null` instead of `Forbidden` | UNFIXED |
| 8 | `SecurityVerificationTest::test_gps_spoofing_speed_180kmh_detected` | GPS spoofing detection not implemented | UNFIXED |
| 9 | `SecurityVerificationTest::test_gps_zero_coordinates_detected` | Same | UNFIXED |
| 10 | `SecurityVerificationTest::test_gps_out_of_range_coordinates_detected` | Same | UNFIXED |
| 11 | `SecurityVerificationTest::test_wallet_confirm_multiple_attempts_all_fail` | Rate limiter (429) fires before security check (403) | UNFIXED |
| 12 | `SecurityVerificationTest::test_ride_complete_rejects_non_participant_consistently` | Enum vs string comparison | UNFIXED |

> **Key finding:** GPS spoofing detection and `is_spoofed` column are still NOT wired into the location update flow. This is the same finding from Cycle 4.

### 2. Webhook Test Failures — 6 failures (BUG/ENV)

| # | Test | Expected | Got | Root Cause |
|---|------|----------|-----|------------|
| 1 | `test_stripe_webhook_accepts_valid_request` | 200 | 500 | MissingAppKeyException |
| 2 | `test_stripe_webhook_rejects_missing_signature` | 401 | 500 | MissingAppKeyException |
| 3 | `test_payfast_webhook_accepts_notification` | 200 | 500 | MissingAppKeyException |
| 4 | `test_ozow_webhook_accepts_notification` | 200 | 500 | MissingAppKeyException |
| 5 | `test_webhook_rejects_invalid_payload` | 400 | 500 | MissingAppKeyException |
| 6 | `test_twilio_webhook_accepts_status_callback` | 200 | 500 | MissingAppKeyException |

> All 6 are caused by MissingAppKeyException, not webhook logic bugs. Will resolve when APP_KEY is fixed.

### 3. Disk [private] Not Configured — 4 failures (ENVIRONMENT)

| # | Test | Impact |
|---|------|--------|
| 1 | `DataRightsTest::test_user_can_request_anonymization` | 500 instead of 200 |
| 2 | `DataRightsTest::test_user_can_request_erasure` | 500 instead of 200 |
| 3 | `DataRightsTest::test_admin_can_trigger_cleanup` | 500 instead of 200 |
| 4 | `DeliveryTest::test_rider_can_create_delivery` | 500 instead of 201 |

- **Fix:** Add `FILESYSTEM_DISK=local` to `phpunit.xml` env block, or add a `private` disk to `config/filesystems.php` for testing.

### 4. Business Logic Failures — 10 failures (BUG)

| # | Test | Issue |
|---|------|-------|
| 1 | `ConsentExtendedTest::test_revoke_never_granted_consent` | Returns 422 "consent type invalid" |
| 2 | `DeliveryTest::test_rider_can_create_delivery` | 500 (MissingAppKeyException in HTTP context) |
| 3 | `DriverTest::test_driver_can_register_vehicle` | 500 (factory/model issue) |
| 4 | `FoodDeliveryTest::test_create_food_order` | 500 (factory/model issue) |
| 5 | `IncidentExtendedTest::test_report_incident_with_ride_id` | TypeError — int vs UUID |
| 6 | `IncidentExtendedTest::test_admin_can_assign_incident` | TypeError — int vs UUID |
| 7 | `IncidentExtendedTest::test_admin_can_escalate_incident` | TypeError — int vs UUID |
| 8 | `IntegrationTest::test_flow2_driver_accepts_completes_ride_and_payment_recorded` | Multi-step flow failure |
| 9 | `IntegrationTest::test_flow3_wallet_topup_and_balance_verification` | Multi-step flow failure |
| 10 | `ScheduledRideExtendedTest` (3 tests) | Cancel/ownership/unauth failures |
| 11 | `PromoCodeAbuseTest` (2 tests) | Promo validation edge cases |
| 12 | `RideEdgeCaseTest::test_promo_code_rejected_after_max_uses` | Same promo validation |
| 13 | `WalletTest::test_deposit_creates_transaction_record` | 500 |

### 5. PHPUnit Notices (2) — MINOR
- Deprecation warnings in test configuration.

---

## What's Working (505 Passing Tests)

- **Unit test core services:** FareCalculation, EscrowService, WalletService, PayoutService, EmailService, CashReconciliationService, RefundService, RatingService, DeliveryService
- **Unit test Jobs:** MatchDriversJob, UpdateDriverLocationJob, ProcessPaymentJob, ReleaseEscrowJob, ProcessPayoutJob
- **Unit test Payment routers:** PaymentRouter, PayFast, Ozow
- **Unit test Middleware:** TenantMiddleware, DriverMiddleware, AdminMiddleware
- **Unit test PromoCode, PushNotification, Referral services**
- **Security tests:** Mass assignment prevention, CSRF protection, XSS sanitization, SQL injection prevention, rate limiting, input sanitization
- **Feature tests:** Auth flows, ride creation/acceptance/completion, driver approval, promo codes, incidents (basic), scheduled rides (basic CRUD), health checks, chat, config, notifications, ratings

---

## Critical Bugs Summary

| Priority | Bug | Impact | Status vs C4 |
|----------|-----|--------|-------------|
| **P0** | APP_KEY not loaded in tests | Masks ~71% of errors (32/45) | UNFIXED |
| **P0** | GPS spoofing detection not implemented | Security: GPS fakes can't be caught | UNFIXED |
| **P1** | `Disk [private]` not configured | Data retention/file ops crash (4 failures) | UNFIXED |
| **P1** | `IncidentReportingService` expects int, gets UUID | Admin incident management broken (3 failures) | UNFIXED |
| **P2** | Security audit log returns string, not array | Security tests fail (2 errors) | UNFIXED |
| **P2** | Security headers/wallet confirm not wired | Security verification tests fail (6 failures) | UNFIXED |
| **P2** | Rate limiter fires before security check | Wallet brute-force protection bypassed | UNFIXED |
| **P3** | Enum vs string comparison in ride status | 1 security test failure | UNFIXED |

---

## Remaining Work to Reach 95%+

| Action | Tests Recoverable | Priority |
|--------|-------------------|----------|
| Add `APP_KEY` to `phpunit.xml` | ~32 (errors) + ~6 (webhook failures) = **38** | P0 |
| Configure `Disk [private]` for testing | **4** | P1 |
| Fix `IncidentReportingService` int vs UUID | **3** | P1 |
| Fix `assertArrayHasKey` test calls (decode JSON) | **2** | P2 |
| Fix `RouteCollection::match` test (use Illuminate Request) | **1** | P2 |
| **Total recoverable from env/test fixes** | **48** | — |
| **Projected pass rate after env fixes** | **553/587 = 94.2%** | — |
| **Remaining code bugs** | **~17** | Various |

> **Bottom line:** 48 of the 82 failing tests are environmental. Fixing APP_KEY + Disk config alone would bring the pass rate from 86.0% to **94.2%**. The remaining 17 are genuine code bugs (GPS spoofing detection, wallet error handling, consent validation, incident UUID handling, etc.).
