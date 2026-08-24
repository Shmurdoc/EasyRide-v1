# Security Fix Cycle 1 — C-03, C-05, C-07

**Date:** 2026-07-19
**Scope:** 3 critical vulnerabilities from SECURITY-AUDIT.md
**Status:** FIXED

---

## C-03 — Webhook IP Bypass via APP_ENV

### Vulnerability
The `isWebhookIpAllowed()` method in `PaymentController.php` defaulted to `true` when the config key was missing, meaning a misconfigured `APP_WEBHOOK_BYPASS` env var would silently bypass all webhook IP validation. Additionally, webhook routes had no middleware-level IP protection — only the controller checked IPs.

### Root Cause
- `PaymentController.php:47` — `config('webhook_ips.bypass_in_local', true)` — default was `true`
- Webhook routes in `api.php` had no IP-check middleware

### Changes Made

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/V1/PaymentController.php:47` | Changed default from `true` to `false` |
| `app/Http/Middleware/VerifyWebhookSignature.php` | **NEW** — Middleware that validates webhook IPs against config whitelist, logs bypass attempts |
| `bootstrap/app.php:117` | Registered `webhook.ip` middleware alias |
| `routes/api.php:67-78` | Added `middleware('webhook.ip')` to all webhook POST routes (payfast, ozow, stripe, twilio, phbimh) |

### Defense Layers (now 3)
1. **Middleware** (`webhook.ip`) — rejects requests from non-whitelisted IPs before reaching the controller
2. **Controller** (`isWebhookIpAllowed()`) — second check with fail-closed default
3. **Signature verification** — payfast ITN, ozow webhook, stripe webhook, PHBIMH signature all verified after IP check

---

## C-05 — TOTP 2FA Bypass

### Vulnerability
The TOTP disable endpoint lacked defense-in-depth. While the `admin.totp` middleware was applied, the controller had no audit logging, and TOTP verification endpoints had no rate limiting (brute force vector).

### Root Cause
- `TotpController::disable()` did not log TOTP disable events
- No rate limiting on TOTP verify/enable/disable endpoints
- Middleware + controller redundancy was good but lacked observable security events

### Changes Made

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/V1/Auth/TotpController.php:75-79` | Added audit logging for TOTP disable events (user_id, IP, user_agent) |
| `bootstrap/app.php:97-99` | Added `totp-verify` rate limiter (5 attempts/minute per user) |
| `routes/api.php:263-264` | Added `throttle:totp-verify` to enable/verify endpoints |
| `routes/api.php:268` | Added `throttle:totp-verify` to disable endpoint |

### Protection Summary
- **Disable route**: `role:admin|super-admin` + `admin.totp` middleware + `throttle:totp-verify` + controller TOTP verification + audit logging
- **Enable/verify routes**: `role:admin|super-admin` + `throttle:totp-verify` (TOTP not yet enabled, so `admin.totp` correctly not applied)
- **All 3 layers**: rate limiting (5/min) → middleware TOTP check → controller TOTP verification

---

## C-07 — Mass Assignment Role Escalation

### Vulnerability
The User model's `$fillable` array contained sensitive fields (`role`, `is_kyc_verified`, `kyc_verified_at`, `anonymized_at`, `failed_attempts`, `locked_until`) that should only be set by explicit server-side actions, not mass assignment.

### Root Cause
- `User.php:26-33` — `$fillable` included `role`, `is_kyc_verified`, `kyc_verified_at`, `anonymized_at`, `failed_attempts`, `locked_until`
- While API endpoints (`UserUpdateRequest`, `Admin\UserController::update`) didn't allow these fields, the model-level protection was missing

### Changes Made

| File | Change |
|------|--------|
| `app/Models/User.php:26-32` | Removed `role`, `is_kyc_verified`, `kyc_verified_at`, `anonymized_at`, `failed_attempts`, `locked_until` from `$fillable` |
| `app/Http/Controllers/Api/V1/AuthController.php:64-82` | Changed `failed_attempts`/`locked_until` updates from mass assignment to direct property assignment |
| `app/Services/DataRetentionService.php:150` | Changed `anonymized_at` update from mass assignment to direct property assignment |

### Fields Now in $fillable (whitelist)
```
tenant_id, name, email, password, phone_number,
is_active, is_online, is_approved, email_verified_at,
current_latitude, current_longitude,
last_location_update, current_ride_id
```

### Fields Removed from $fillable (must use direct property assignment)
- `role` — only settable via `AuthController::register()`, `createDriver()`, social auth
- `is_kyc_verified` — only settable via `KycController::approve()`
- `kyc_verified_at` — only settable via `KycController::approve()`
- `anonymized_at` — only settable via `DataRetentionService::runCleanup()`
- `failed_attempts` — only settable via `AuthController::login()`
- `locked_until` — only settable via `AuthController::login()`

---

## Files Modified (8 total)

1. `app/Http/Controllers/Api/V1/PaymentController.php` — Changed bypass default to `false`
2. `app/Http/Middleware/VerifyWebhookSignature.php` — **NEW** webhook IP validation middleware
3. `bootstrap/app.php` — Registered `webhook.ip` alias + `totp-verify` rate limiter
4. `routes/api.php` — Added `webhook.ip` + `throttle:totp-verify` middleware to routes
5. `app/Http/Controllers/Api/V1/Auth/TotpController.php` — Added audit logging for TOTP disable
6. `app/Models/User.php` — Removed 6 sensitive fields from `$fillable`
7. `app/Http/Controllers/Api/V1/AuthController.php` — Direct property assignment for lockout fields
8. `app/Services/DataRetentionService.php` — Direct property assignment for anonymized_at

## Verification

- **C-03**: Webhook bypass now defaults to `false`. Middleware adds IP check before controller. All 5 webhook POST routes protected.
- **C-05**: TOTP disable has 4-layer protection: rate limiting → role middleware → TOTP middleware → controller verification + audit log.
- **C-07**: 6 sensitive fields removed from mass-assignment whitelist. All existing `update()` calls converted to direct property assignment.
