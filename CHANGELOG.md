# Changelog

All notable changes to EasyRyde are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] — 2026-07-19

### Security Fixes

#### REMAINING CRITICAL (Fixed This Cycle)

- **C-03: Webhook IP bypass disabled.** Changed `config/webhook_ips.php` from environment-name-based bypass (`APP_ENV !== 'production'`) to explicit opt-in (`APP_WEBHOOK_BYPASS=true`). Default is `false` (blocking). Updated `.env.example` and `.env.secure.example` with `APP_WEBHOOK_BYPASS=false`.

- **C-05: TOTP 2FA disable now requires current code.** Moved `totp/disable` route to require `admin.totp` middleware. Admin must provide current TOTP code in `X-Totp-Code` header to disable 2FA. Prevents attacker with compromised admin password from disabling 2FA.

- **C-07: Mass assignment role escalation blocked.** Removed `role` from User model's `$fillable` array. Roles can only be set via direct property assignment in explicit admin methods (`AuthController::register`, `AuthController::createDriver`, `SocialAuthController`, `PartnerApiService`). Updated all mass assignment calls to use direct property assignment for guarded fields.

#### REMAINING HIGH (Fixed This Cycle)

- **H-04: PII leakage prevented.** `UserController::show()` and `UserController::update()` now return `UserResource` instead of raw Eloquent models. Sensitive fields (`totp_secret`, `current_latitude`, `current_longitude`, `failed_attempts`, `locked_until`) are no longer exposed in API responses.

- **H-05: LIKE wildcard injection fixed.** All admin search queries now escape LIKE wildcards (`%` and `_`) using `addcslashes()`. Prevents data exfiltration via crafted search patterns and expensive full-table scans.

- **H-07: Rate limit bypass via User-Agent fixed.** Removed User-Agent from auth rate limit key. Rate limiting now uses IP only for unauthenticated routes, user ID for authenticated routes. Prevents brute force via User-Agent rotation.

- **H-12: Socket auth token cache invalidated on logout.** Added Redis pub/sub channel `auth:token:invalidate` that Laravel publishes to on logout. Socket server subscribes and invalidates token cache + disconnects all sockets using the invalidated token. Prevents 60-second post-logout activity window.

#### CRITICAL

- **C-01: Removed secrets from repository.** APP_KEY, JWT_SECRET, and Google Maps API keys were present in `.env` files committed to git. Removed all real secrets from `backend/.env`, `backend/.env.docker`, `backend/.env.testing`, `socket-server/.env`, `socket/.env`, and all three mobile app `.env` files. Added `.env.secure.example` with placeholder values. Updated `.gitignore` to block all `.env` variants except `.example` files. Added pre-commit hook (`.githooks/pre-commit`) and CI secret scanner (`.github/workflows/secret-scanner.yml`).

- **C-02: Wallet self-confirmation removed.** `POST /api/v1/wallet/confirm` endpoint allowed any authenticated user to credit their wallet without real payment. The endpoint now returns 403 Forbidden. Only payment gateway webhooks (PayFast ITN, Ozow webhook, Stripe webhook) can confirm deposits.

- **C-03: Wallet deposit no longer credits immediately.** `WalletController::deposit()` changed from `credit()` (immediate balance) to `initiateTopUp()` (pending transaction). Balance is not touched until a gateway webhook confirms payment.

- **C-04: Ride fare manipulation fixed.** `POST /rides/{ride}/complete` no longer accepts `distance_km` or `duration_minutes` from the driver. Distance is now calculated server-side from GPS tracking data stored in the new `ride_location_logs` table. Fare is clamped to ±20% of the original estimate to prevent both free-ride and overcharge attacks.

- **C-05: Webhook IP bypass disabled.** Changed from environment-name-based bypass (`APP_ENV !== 'production'`) to explicit opt-in (`APP_WEBHOOK_BYPASS=true`). Webhook IP validation now defaults to blocking in all environments.

- **C-06: Socket.IO authorization enforced.** All socket event handlers now validate that the sender is a participant of the ride they're interacting with. Added `isParticipant()`, `isDriver()`, and `isRideActive()` checks to `join:ride`, `chat:send`, `ride:send-location`, and all ride lifecycle events.

- **C-07: User role escalation blocked.** `role` removed from User model's `$fillable` array. Roles can only be assigned through explicit admin methods.

#### HIGH

- **H-01: Per-event rate limiting on Socket.IO.** Added granular rate limits: `join:ride` (10/min), `chat:send` (30/min), `ride:send-location` (30/min), `rider:book-ride` (5/min), `driver:accept-ride` (10/min), ride lifecycle events (5-10/min).

- **H-02: Socket.IO input validation.** All socket payloads validated before processing: type checks, string length limits, coordinate validation (lat/lng bounds), numeric validation for fares, boolean validation.

- **H-03: Socket.IO security audit logging.** All authorization failures logged with `[SECURITY]` prefix for monitoring: `JOIN_RIDE_NOT_PARTICIPANT`, `CHAT_SEND_NOT_PARTICIPANT`, `SEND_LOCATION_NOT_DRIVER`, etc.

- **H-04: Wallet audit logging.** All wallet balance modifications now write to a dedicated `wallet-audit` log channel (`storage/logs/wallet-audit.log`, 365-day retention). Events include: `WALLET_TOPUP_INITIATED`, `WALLET_CREDIT`, `WALLET_DEBIT`, `WALLET_TOPUP_CONFIRMED`, `WALLET_CONFIRM_FAILED`.

- **H-05: Wallet rate limiting.** Added `throttle:wallet-confirm` middleware (3 requests/minute/user) to the confirm endpoint.

- **H-06: Socket.IO ride state tracking.** New `src/middleware/authorize.js` module tracks ride participants in Redis (`ride:info:{rideId}` hash) with 24-hour TTL auto-cleanup.

- **H-07: GPS spoofing detection.** Location updates during rides are validated for impossible jumps (>180 km/h speed, >5 km in <300 seconds, zero coordinates). Spoofed points are excluded from fare calculations.

- **H-08: Fare calculation audit trail.** Every fare calculation now stores a complete audit log in the `fare_calculation_log` JSON column on the `rides` table, including method, spoofed points count, valid points, estimated vs calculated fare, and deviation percentage.

#### MEDIUM

- **M-01: Fare bounds validation.** Final calculated fare is compared against the fare estimate stored at booking time. If deviation exceeds 20%, fare is clamped to the ±20% range. Logged as warning for fraud investigation.

- **M-02: Rate limit key hardened.** Removed User-Agent from auth rate limit key (was vulnerable to rotation bypass). Now uses IP only for unauthenticated routes, user ID for authenticated routes.

- **M-03: GPS fallback for fare calculation.** When fewer than 3 valid GPS points exist, falls back to OSRM route service for distance and actual wall-clock time for duration.

- **M-04: Socket.IO delivery and food order handlers.** Added input validation to `delivery.js` and `foodOrder.js` handlers for all payloads.

### Design Updates

- **PHBIMH Design System Plan Created.** Full design implementation plan for applying the Phalaborwa In My Hand design system to all three mobile apps. Includes color system replacement (dark theme → light green theme), typography (Poppins + Inter), component library specs, animation system, business isolation with dynamic theming, and screen-by-screen implementation guide for 46 screens across rider (22), driver (14), and admin (12) apps.

- **Shared theme constants defined.** New `COLORS`, `GRADIENTS`, `SHADOWS`, `RADIUS`, `FONTS`, `TYPOGRAPHY`, and `ANIMATION` constants designed to match PHBIMH branding. Primary color: `#0A7C4E` (green). Background: `#F2F4F1` (light gray-green). Text: `#0F1713` (dark ink).

- **Business isolation architecture.** `BusinessIdentity` type and `BusinessThemeProvider` context for dynamic per-business theming. Each restaurant, lodge, or service gets its own gradient and accent colors while the user browses under the PHBIMH umbrella.

### Database Changes

- **New table: `ride_location_logs`** — Stores GPS location audit trail per ride. Columns: `ride_id`, `latitude`, `longitude`, `speed_kmh`, `accuracy`, `is_spoofed`, `recorded_at`.

- **New columns on `rides` table:**
  - `estimated_fare_at_booking` (decimal) — Fare estimate at ride creation time
  - `fare_calculation_log` (json) — Complete audit trail of fare calculation
  - `server_calculated_distance_km` (decimal) — Distance computed from GPS
  - `server_calculated_duration_minutes` (decimal) — Duration computed from GPS

### New Files

| File | Purpose |
|------|---------|
| `app/Models/RideLocationLog.php` | Eloquent model for ride GPS logs |
| `database/migrations/2026_07_19_000001_create_ride_location_logs_table.php` | Migration for new table and columns |
| `backend/.env.secure.example` | Reference template with CHANGE_ME placeholders |
| `.githooks/pre-commit` | Git hook blocking commits with secrets |
| `.github/workflows/secret-scanner.yml` | CI workflow scanning PRs for hardcoded secrets |
| `socket-server/src/middleware/authorize.js` | Socket.IO authorization helpers and input validation |

### Modified Files

| File | Change |
|------|--------|
| `app/Http/Controllers/Api/V1/WalletController.php` | Fixed deposit to use `initiateTopUp()`, disabled user confirm (403) |
| `app/Services/WalletService.php` | Added `gateway_reference` storage, idempotency logging, audit logging |
| `app/Http/Controllers/Api/V1/RideController.php` | Removed distance/duration params from completeRide |
| `app/Services/RideService.php` | Server-side fare calculation, GPS logging, spoofing detection, fare bounds |
| `app/Models/Ride.php` | Added `locationLogs()` relationship, new fillable columns |
| `routes/api.php` | Added `throttle:wallet-confirm` middleware to confirm route |
| `app/Providers/AppServiceProvider.php` | Added `wallet-confirm` rate limiter |
| `config/logging.php` | Added `wallet-audit` daily log channel (365-day retention) |
| `socket-server/src/middleware/rateLimit.js` | Per-event rate limits |
| `socket-server/src/handlers/ride.js` | Auth checks on all ride events, input validation |
| `socket-server/src/handlers/chat.js` | Auth checks on chat events, input validation |
| `socket-server/src/handlers/driver.js` | Driver-only check on ride broadcasts, input validation |
| `socket-server/src/handlers/delivery.js` | Input validation |
| `socket-server/src/handlers/foodOrder.js` | Input validation |
| `socket-server/src/handlers/admin.js` | Input validation, security logging |
| `.gitignore` | Added all `.env` variants except `.example` |
| `backend/.env` | Removed real secrets |
| `backend/.env.docker` | Removed real secrets |
| `backend/.env.testing` | Removed real secrets |
| `socket-server/.env` | Removed real JWT_SECRET |
| `socket/.env` | Removed real JWT_SECRET |
| `mobile/apps/driver/.env` | Removed real Google Maps API key |
| `mobile/apps/rider/.env` | Removed real Google Maps API key |
| `mobile/apps/admin/.env` | Removed real Google Maps API key |

### Production Readiness

- **PRODUCTION-PUSH-PLAN.md created.** 10-phase, 28-day production readiness plan covering security hardening, mobile testing, design application, business isolation, APK fixes, database flow testing, API endpoint testing, monitoring, performance optimization, and deployment.

- **APK-FIX-PLAN.md created.** Root cause analysis of release APK crashes: JS bundle not embedded when running Gradle directly, Metro cache issues, expo-task-manager compilation failures, Google Maps API key dependency. Corrected build procedure using `npx expo run:android --variant release`.

- **SECURITY-AUDIT.md created.** Full OWASP Top 10 audit with 7 critical, 12 high, 8 medium, and 5 low findings. Remediation priority matrix included.

---

*For the full production readiness plan, see [PRODUCTION-PUSH-PLAN.md](./PRODUCTION-PUSH-PLAN.md).*

---

## [Unreleased] — 2026-08-24

### Security Fixes

#### Authentication & Token Management

- **Token refresh endpoint added.** New `POST /api/v1/auth/refresh` endpoint allows clients to exchange a valid token for a fresh one without re-authenticating. Requires `auth:sanctum` middleware.

- **Mobile proactive token refresh.** Both rider and driver apps now monitor token expiry and automatically call the refresh endpoint before expiration, preventing mid-session auth failures.

- **Sanctum token expiration aligned.** `SANCTUM_TOKEN_EXPIRATION` set to `10080` minutes (7 days) across all environments. Consistent behavior between dev, test, and production.

- **Per-device token naming.** Mobile clients now send `X-Platform` header (`android`, `ios`) with each request. Sanctum uses this to generate distinct token names per device, allowing users to manage sessions from multiple devices independently.

#### Security Hardening

- **Pre-filled credentials removed.** All `LoginScreen` components (web, rider, driver, admin apps) no longer contain hardcoded demo credentials or `fillDemo()` functions. Eliminates credential exposure in production page source.

- **Silent catch blocks fixed.** 36 empty or minimal catch blocks across 20 files replaced with proper error logging. Errors are now logged with structured context (event name, user ID, error message) instead of being silently swallowed. Files affected span `socket-server/src/handlers/` (ride.js, driver.js, chat.js, delivery.js, foodOrder.js, admin.js), `socket-server/src/services/` (redis.js, geo.js), and `socket-server/src/index.js`.

### Modified Files

| File | Change |
|------|--------|
| `backend/routes/api.php` | Added `POST /api/v1/auth/refresh` route |
| `backend/app/Http/Controllers/Api/V1/AuthController.php` | Added `refresh()` method |
| `backend/config/sanctum.php` | Token expiration confirmed at 10080 min |
| `mobile/packages/shared/src/api/index.ts` | Added `X-Platform` header to all requests |
| `mobile/apps/rider/screens/LoginScreen.tsx` | Removed demo credentials and fillDemo |
| `mobile/apps/driver/screens/LoginScreen.tsx` | Removed demo credentials and fillDemo |
| `mobile/apps/admin/screens/LoginScreen.tsx` | Removed demo credentials and fillDemo |
| `web/src/pages/LoginScreen.tsx` | Removed demo credentials and fillDemo |
| `socket-server/src/handlers/ride.js` | Added error logging to catch blocks |
| `socket-server/src/handlers/driver.js` | Added error logging to catch blocks |
| `socket-server/src/handlers/chat.js` | Added error logging to catch blocks |
| `socket-server/src/handlers/delivery.js` | Added error logging to catch blocks |
| `socket-server/src/handlers/foodOrder.js` | Added error logging to catch blocks |
| `socket-server/src/handlers/admin.js` | Added error logging to catch blocks |
| `socket-server/src/services/redis.js` | Added error logging to catch blocks |
| `socket-server/src/services/geo.js` | Added error logging to catch blocks |
| `socket-server/src/index.js` | Added error logging to catch blocks |

### Documentation

- **ARCHITECTURE.md created.** System architecture document with ASCII diagram, component overview, data flow, payment flow, and key design decisions.
- **socket-server/README.md created.** Full documentation of Socket.IO server: purpose, setup, environment variables, all socket events, and Laravel Redis relay integration.
- **backend/README.md rewritten.** Replaced default Laravel README with project-specific documentation: features, Docker setup, testing commands, middleware, API endpoints.
- **bug-inventory.md updated.** Removed 5 stale bugs (C-003, C-008, H-010, H-017, M-017), reclassified C-001 as low/dead-code, marked C-002 and C-004 as fixed. Counts updated: 62 total (was 67).
