# EasyRyde Security Audit Report

**Date:** 2026-07-19
**Scope:** Full backend API, Socket.IO server, middleware, payment integrations, KYC, wallet, ride system
**Auditor:** opencode automated security audit
**Verdict: DO NOT SHIP TO PRODUCTION — 7 CRITICAL, 12 HIGH, 8 MEDIUM, 5 LOW findings**

---

## CRITICAL SEVERITY (Fix Immediately)

### C-01: APP_KEY and JWT_SECRET Committed to Git Repository
- **File:** `.env` (root), `socket-server/.env`
- **Lines:** `.env:3`, `.env:61`, `socket-server/.env:6`
- **Description:** The root `.env` contains a real `APP_KEY` (`base64:peCOLXSvi9710GX7Mey8ycz/QD4TZsA/D91bb7eeX/s=`) and a real `JWT_SECRET` (`2jljKVH/vjVGuOgz9i8WEV4IuHoZmSilfhxWnJ3vS5aG2uX7onEWFyojYCOaVvjg`). The socket-server `.env` also contains the same JWT_SECRET. These secrets are tracked by git.
- **PoC:** `git log --all --full-history -- .env` exposes the key. An attacker with repo access can decrypt all encrypted columns, forge Sanctum tokens, and impersonate any user.
- **Fix:** Rotate ALL keys immediately. Add `.env` to `.gitignore` (it IS in `.gitignore` but was already committed). Use Docker secrets or a vault. Generate new APP_KEY and JWT_SECRET.
- **Blocks Production:** YES

### C-02: APP_DEBUG=true in Development .env Leaks Stack Traces & Environment
- **File:** `.env:4`
- **Line:** `.env:4` — `APP_DEBUG=true`
- **Description:** While `.env` is for dev, if this ever bleeds into production (which is common with Docker COPY), full stack traces, SQL queries, environment variables, and file paths are exposed to attackers.
- **PoC:** Trigger any 500 error → full Laravel debug page with environment dump.
- **Fix:** Ensure `APP_DEBUG=false` is always set in production Dockerfiles. Add a CI check: `grep -q 'APP_DEBUG=true' .env && echo "BLOCKED: debug mode"`.
- **Blocks Production:** YES (if accidentally deployed)

### C-03: Webhook IP Bypass Enabled — All Webhook Endpoints Unprotected in Dev
- **File:** `config/webhook_ips.php:30`, `PaymentController.php:47-49`
- **Lines:** `config/webhook_ips.php:30` — `'bypass_in_local' => env('APP_ENV') !== 'production'`
- **Description:** The `isWebhookIpAllowed()` method returns `true` when `bypass_in_local` is true. If `APP_ENV` is not exactly `'production'` (e.g., `'staging'`, `'prod'`, typo), ALL webhook IP checks are bypassed. An attacker can forge PayFast/Ozow webhooks from any IP to credit their wallet or complete payments.
- **PoC:** Set `APP_ENV=staging` → send forged POST to `/api/v1/webhooks/payfast` with `payment_status=COMPLETE` → wallet credited without real payment.
- **Fix:** Default to blocking (deny all). Only bypass with explicit `APP_WEBHOOK_BYPASS=true` env var. Never use env name-based bypass.
- **Blocks Production:** YES

### C-04: Wallet `confirm` Endpoint Allows Self-Confirmation Without Gateway Verification
- **File:** `WalletController.php:126-142`
- **Lines:** `WalletController.php:132` — `$this->walletService->confirmTopUpById($wallet, $validated['transaction_id'])`
- **Description:** The `POST /api/v1/wallet/confirm` endpoint takes a `transaction_id` and confirms it directly via `confirmTopUpById()`. This method only checks that the transaction exists, belongs to the wallet, and has `reference_type=pending_topup`. There is NO verification that a gateway actually processed the payment. An attacker can:
  1. Call `POST /api/v1/wallet/deposit` to create a pending transaction
  2. Call `POST /api/v1/wallet/confirm` with that transaction ID
  3. Balance is credited without any real money changing hands
- **PoC:** 
  ```
  POST /api/v1/wallet/deposit {"amount": 100000, "payment_method": "stripe"}
  → Returns transaction_id
  POST /api/v1/wallet/confirm {"transaction_id": "<returned_id>"}
  → Balance credited by R100,000
  ```
- **Fix:** Remove the self-confirm endpoint entirely. Only gateway webhooks should confirm top-ups. If user confirmation is needed for UX, add a server-side check that the gateway actually completed the payment.
- **Blocks Production:** YES

### C-05: TOTP 2FA Bypass — Admin Can Enable TOTP Without Verifying Current TOTP
- **File:** `AdminTotpMiddleware.php:17`, `TotpController.php`
- **Lines:** `AdminTotpMiddleware.php:17` — `if ($user && $user->hasAnyRole(['admin', 'super-admin']) && $user->totp_enabled)`
- **Description:** The middleware only checks TOTP when `totp_enabled` is true. The TOTP enable/verify/disable routes at lines 262-264 of `api.php` use `role:admin|super-admin` middleware but NOT `admin.totp`. This means an attacker who gains admin access but has not yet set up TOTP can enable TOTP for the first time without proving they have the current TOTP code. More critically, the disable endpoint also lacks TOTP verification — an attacker can disable 2FA on their own admin account.
- **PoC:** Compromise admin password → `POST /api/v1/admin/totp/disable` → 2FA disabled. Or `POST /api/v1/admin/totp/enable` → attacker's own TOTP.
- **Fix:** TOTP disable requires current TOTP code. TOTP enable should require the code to be verified before marking as enabled. Add rate limiting on TOTP attempts.
- **Blocks Production:** YES

### C-06: Ride Fare Manipulation via `completeRide` — Client-Supplied Distance/Duration
- **File:** `RideController.php:217-220`, `RideService.php:318-397`
- **Lines:** `RideController.php:219` — `$request->input('distance_km', $ride->distance_km)`, `RideController.php:220` — `$request->input('duration_minutes', $ride->duration_minutes)`
- **Description:** The `completeRide` method accepts `distance_km` and `duration_minutes` from the request body and uses them to recalculate the fare. A malicious driver can submit falsified low values to reduce the fare (benefiting a colluding rider) or high values to inflate the fare. The fare is recalculated client-side and only lightly validated.
- **PoC:** Driver submits `{"distance_km": 0.1, "duration_minutes": 1}` → fare recalculated to near-minimum → rider pays far less. Or `{"distance_km": 999, "duration_minutes": 999}` → massive fare.
- **Fix:** Distance/duration should come from server-side GPS tracking, not client input. At minimum, validate that submitted values are within reasonable bounds of the tracked route. Cap deviation at ±20% of server-calculated values.
- **Blocks Production:** YES

### C-07: Mass Assignment on User Model — Role Escalation
- **File:** `User.php:26-32`, `UserController.php:50`
- **Lines:** `User.php:26-32` — `$fillable` includes `'role'`, `UserController.php:50` — `$user->update($validated)`
- **Description:** The User model's `$fillable` array includes `role`, `is_active`, `is_approved`, `is_online`, `is_kyc_verified`. The `UserController::update()` method passes validated data directly to `$user->update($validated)`. While `UserUpdateRequest` only allows `name`, `email`, `phone_number`, `is_active`, the `AuthController::createDriver()` at line 117 also passes data directly. More critically, if any Form Request is missing a field filter, an attacker could set `role=super-admin` via a PUT request.
- **PoC:** If `UserUpdateRequest` ever adds `role` to allowed fields, or if there's any route that accepts raw user data, `PUT /api/v1/users/{id}` with `{"role": "super-admin"}` escalates privileges.
- **Fix:** Remove `role` from `$fillable` or use `$guarded` approach. Roles should only be assignable through explicit admin methods. Audit all `User::create()` and `$user->update()` calls.
- **Blocks Production:** YES

---

## HIGH SEVERITY (Fix Before Launch)

### H-01: WebSocket Chat — No Authorization Check on Ride Room Join
- **File:** `socket-server/src/handlers/ride.js:286-296`
- **Lines:** `ride.js:288` — `socket.join(\`ride:${rideId}\`)`
- **Description:** The `join:ride` event allows ANY authenticated user to join ANY ride room and read chat history. There is no check that the user is the rider or driver of that ride.
- **PoC:** Authenticated attacker emits `join:ride` with arbitrary `rideId` → receives all chat messages for that ride, including PII and ride details.
- **Fix:** Validate that `userId` matches `rider_id` or `driver_id` of the ride before joining the room. Store ride participants in Redis and validate against them.
- **Blocks Production:** YES

### H-02: WebSocket Chat — No Authorization on `chat:send`
- **File:** `socket-server/src/handlers/chat.js:9-38`
- **Lines:** `chat.js:11-12` — `const { rideId, message, receiverId } = data`
- **Description:** The `chat:send` handler accepts any `rideId` and `receiverId` without verifying the sender is actually a participant of that ride. An attacker can send messages to any ride and impersonate either party.
- **PoC:** Emit `chat:send` with `rideId` of a ride you're not part of → message broadcast to that ride's participants as if you were a participant.
- **Fix:** Validate `userId` is the rider or driver of `rideId` before processing the message. Check against the ride's `rider_id` and `driver_id`.
- **Blocks Production:** YES

### H-03: WebSocket — Location Broadcast Without Ride Ownership Verification
- **File:** `socket-server/src/handlers/ride.js:267-284`
- **Lines:** `ride.js:275` — `io.to(\`ride:${rideId}\`).emit('ride:location-update', ...)`
- **Description:** The `ride:send-location` handler broadcasts location to any ride room. A driver can broadcast fake location data to any ride, tracking riders they're not assigned to.
- **PoC:** Emit `ride:send-location` with arbitrary `rideId` → location broadcast to all participants.
- **Fix:** Verify `userId` is the assigned driver for `rideId` before broadcasting location.
- **Blocks Production:** YES

### H-04: PII Leakage in User API Responses
- **File:** `UserController.php:33`, `AdminController.php:59-68`
- **Lines:** `UserController.php:33` — `return response()->json($user->load(['tenant', 'driverProfile', 'vehicle']))`
- **Description:** The `UserController::show()` returns the full User model without using a Resource class. This exposes all fillable attributes including `email`, `phone_number`, `current_latitude`, `current_longitude`, `failed_attempts`, `locked_until`, `totp_enabled`, and potentially `totp_secret` (though hidden, it's in `$fillable`). Admin endpoints also return raw User models with driver profile data.
- **PoC:** `GET /api/v1/users/{id}` returns full user record including sensitive fields.
- **Fix:** Always use `UserResource` for API responses. Never return raw Eloquent models. Audit all `response()->json($user)` calls.
- **Blocks Production:** YES

### H-05: SQL Injection Risk in Admin Search Queries
- **File:** `AdminController.php:64`, `AdminController.php:99`
- **Lines:** `AdminController.php:64` — `$qq->where('name', 'like', "%{$v}%")`
- **Description:** While Eloquent parameterizes queries (preventing classic SQL injection), the `like` pattern with user input `%{$v}%` allows an attacker to inject `%` and `_` wildcards to perform data exfiltration. More critically, if any controller uses raw queries with user input, this pattern is dangerous. The `$v` value is NOT sanitized for LIKE wildcards.
- **PoC:** `GET /api/v1/admin/users?search=%` could return all users. `GET /api/v1/admin/users?search=%%%%` causes expensive full-table scan (ReDoS equivalent).
- **Fix:** Escape LIKE wildcards in user input: `$v = addcslashes($v, '%_')`. Add max length validation on search input.
- **Blocks Production:** YES

### H-06: No CSRF Protection on State-Changing API Endpoints
- **File:** `config/cors.php:19`, `bootstrap/app.php`
- **Lines:** `config/cors.php:19` — `'supports_credentials' => true`
- **Description:** CORS is configured with `supports_credentials: true` but only origins `localhost:3000,localhost:8081` are allowed. However, Sanctum's CSRF protection (`EnsureFrontendRequestsAreStateful`) is applied globally to all API routes. The issue is that state-changing POST/PUT/DELETE endpoints do NOT have explicit CSRF token validation middleware — they rely solely on Sanctum token auth. This is acceptable for mobile apps but problematic if the API is consumed by a browser-based SPA. If `SANCTUM_STATEFUL_DOMAINS` is misconfigured, all CSRF protection is bypassed.
- **PoC:** If `SANCTUM_STATEFUL_DOMAINS` is set to include the attacker's domain, browser-based attacks can forge state-changing requests.
- **Fix:** Verify Sanctum configuration in production. Ensure `SANCTUM_STATEFUL_DOMAINS` only includes the actual frontend domain. Add explicit CSRF middleware for web routes.
- **Blocks Production:** NO (but risky)

### H-07: Rate Limiting Bypass via IP Spoofing
- **File:** `bootstrap/app.php:33-34`, `ApiRateLimiterMiddleware.php:39-41`
- **Lines:** `bootstrap/app.php:34` — `Limit::perMinute(5)->by($request->ip().'|'.($request->userAgent() ?? ''))`
- **Description:** Auth rate limiting uses `IP + User-Agent` as the key. An attacker can bypass by rotating User-Agent headers. The global rate limiter uses `user()->id ?? ip()`, which is better for authenticated routes but still vulnerable for unauthenticated routes.
- **PoC:** Use a script that rotates User-Agent strings → 5 login attempts per UA → effectively unlimited brute force.
- **Fix:** Use only IP for rate limiting (User-Agent rotation is trivial). Add progressive delays. Consider using a more robust rate limiting strategy like token bucket.
- **Blocks Production:** YES

### H-08: Payment Velocity Check Bypass
- **File:** `PaymentController.php:120-127`
- **Lines:** `PaymentController.php:120` — `$velocity = $this->paymentService->checkPaymentVelocity(...)`
- **Description:** The velocity check is performed on `processRidePayment` but the amount checked is `(float) $ride->total_fare`. The `completeRide` method allows the driver to submit arbitrary `distance_km` and `duration_minutes` which changes `total_fare`. A colluding driver-rider pair could: (1) create ride, (2) driver completes with inflated fare, (3) bypass velocity check since the inflated amount hasn't been paid before.
- **Fix:** Velocity check should use the original fare estimate, not the driver-submitted final fare. Add velocity limits on total fare deviation.
- **Blocks Production:** YES

### H-09: Partner Webhook — `receiveOrder` Missing Signature Verification
- **File:** `PartnerWebhookController.php:22-36`
- **Lines:** `PartnerWebhookController.php:25` — `$delivery = $this->partnerService->receiveOrder($validated)`
- **Description:** The `receiveOrder` endpoint calls `$this->partnerService->receiveOrder($validated)` which DOES check signature internally (PartnerApiService line 25-28). However, the controller returns `422` for both "invalid signature" and "creation failed", making it impossible to distinguish. More importantly, the `orderStatus` endpoint at line 42 DOES verify signature, but the controller returns the same 422 error for signature failures, which could confuse monitoring.
- **Fix:** Return 403 for signature failures specifically. Add webhook event deduplication. Log all failed signature attempts for security monitoring.
- **Blocks Production:** YES

### H-10: No File Type Validation on KYC Uploads
- **File:** `KycController.php:30-31`, `KycService.php:51-53`
- **Lines:** `KycController.php:30` — `$request->file('document_front')`
- **Description:** KYC document uploads (`document_front`, `document_back`) are accepted without validating file type or content. An attacker could upload PHP files, executables, or files with oversized content to exhaust storage. The files are stored with `store('kyc/'.$user->id, 'private')` which uses the original filename.
- **PoC:** Upload a `.php` file as `document_front` → if storage is web-accessible, code execution. Upload a 10GB file → disk exhaustion.
- **Fix:** Validate MIME type (PDF, JPEG, PNG only), enforce max file size (10MB), rename files to UUID-based names, validate file content (not just extension).
- **Blocks Production:** YES

### H-11: Wallet Deposit — No Amount Upper Bound Validation in Service Layer
- **File:** `WalletController.php:52-123`, `WalletService.php:297-321`
- **Lines:** `WalletController.php:57` — `$amount = (float) $validated['amount']`
- **Description:** The `WalletDepositRequest` validates `max:100000`, but the `WalletService::credit()` and `pendingTopUp()` methods have no max amount validation. If the Form Request is bypassed (e.g., via a direct service call or if the validation rule is changed), unlimited amounts can be credited.
- **Fix:** Add amount validation in the service layer as defense-in-depth: `if ($amount > 100000) throw ...`
- **Blocks Production:** YES

### H-12: Socket Server — Auth Token Cached for 60 Seconds After Logout
- **File:** `socket-server/src/services/auth.js:3-4`, `socket-server/src/services/auth.js:158-164`
- **Lines:** `auth.js:4` — `CACHE_TTL_SECONDS = 60`
- **Description:** When a user logs out, the Sanctum token is deleted in Laravel, but the socket server caches the token as valid for up to 60 seconds. During this window, the socket connection remains active and the user can continue sending/receiving messages. The `invalidateToken()` function exists but is never called from the logout flow.
- **PoC:** User logs out → socket connection remains active for up to 60 seconds → user can still send chat messages.
- **Fix:** Call `authService.invalidateToken(token)` when the Laravel logout endpoint is hit. Add a Redis pub/sub channel for token invalidation events.
- **Blocks Production:** YES

---

## MEDIUM SEVERITY (Address Before Production)

### M-01: SESSION_ENCRYPT=false — Session Data Not Encrypted
- **File:** `.env:28`, `.env.production:41`
- **Lines:** `.env:28` — `SESSION_ENCRYPT=false`
- **Description:** Laravel session data is not encrypted. If Redis is compromised, session data (including user IDs and tokens) is readable in plaintext.
- **Fix:** Set `SESSION_ENCRYPT=true` in production.

### M-02: REDIS_PASSWORD=null in Development — No Auth to Redis
- **File:** `.env:39`
- **Lines:** `.env:39` — `REDIS_PASSWORD=null`
- **Description:** Redis has no password in development. If this configuration leaks to production, any network-adjacent attacker can read/write all cached data, sessions, and rate limit counters.
- **Fix:** Always require Redis authentication. Set strong password in production.

### M-03: TrustProxies at Wildcard — IP Spoofing Risk
- **File:** `bootstrap/app.php:119`
- **Lines:** `bootstrap/app.php:119` — `$middleware->trustProxies(at: '*')`
- **Description:** Trusting all proxy headers means any client can spoof their IP address via `X-Forwarded-For` headers. This affects rate limiting (IP-based) and IP-based webhook validation.
- **Fix:** Set specific proxy IPs (e.g., Docker network CIDR). Never trust `*` in production.

### M-04: No Input Validation on Socket Server Events
- **File:** `socket-server/src/handlers/ride.js:31-77`, `socket-server/src/handlers/chat.js:9-38`
- **Lines:** Various
- **Description:** Socket event handlers accept data without schema validation. `rider:book-ride` accepts `pickup`, `destination`, `category`, `fare` without type checking. `chat:send` accepts `rideId`, `message`, `receiverId` without validation beyond presence checks.
- **Fix:** Add JSON Schema validation for all socket events. Use a library like `joi` or `zod`.

### M-05: No Rate Limiting on Socket Server Events
- **File:** `socket-server/src/middleware/rateLimit.js`
- **Lines:** Rate limit is 60/minute globally
- **Description:** The socket rate limiter is 60 events per minute per socket. This is too generous for sensitive events like `chat:send` or `rider:book-ride`. An attacker could flood the system with ride requests.
- **Fix:** Implement per-event rate limits. `chat:send` should be limited to ~5/minute. `rider:book-ride` should be limited to ~3/minute.

### M-06: InputSanitizationMiddleware Double-Escapes Data
- **File:** `InputSanitizationMiddleware.php:36-43`
- **Lines:** `InputSanitizationMiddleware.php:40` — `$value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8')`
- **Description:** The middleware applies `htmlspecialchars()` to ALL input strings before they reach controllers. This double-escapes data that will later be escaped again when output to JSON. It also strips HTML tags, which may break legitimate data. For API-only backends, this middleware is counterproductive — Eloquent parameterized queries and `htmlspecialchars()` at output time are the correct approach.
- **Fix:** Remove `InputSanitizationMiddleware` from the API middleware stack. Rely on parameterized queries and output escaping.

### M-07: Admin `rejectDriver` Missing Tenant Validation
- **File:** `AdminController.php:144-166`
- **Lines:** `AdminController.php:144` — `public function rejectDriver(User $driver): JsonResponse`
- **Description:** The `rejectDriver` method does NOT verify that `$driver->tenant_id` matches the admin's `tenant_id`. An admin from tenant A could reject a driver from tenant B.
- **Fix:** Add `$driver->tenant_id !== $request->user()->tenant_id` check.

### M-08: `confirmTopUpByGatewayReference` — No Ownership Verification
- **File:** `WalletService.php:410-423`
- **Lines:** `WalletService.php:412` — `$transaction = WalletTransaction::where('gateway_reference', $gatewayReference)`
- **Description:** The `confirmTopUpByGatewayReference` method finds a transaction by gateway reference alone, without verifying the transaction belongs to the correct wallet. If gateway references are guessable, an attacker could confirm another user's pending top-up.
- **Fix:** Add wallet ownership verification or use cryptographically random gateway references.

---

## LOW SEVERITY (Address When Possible)

### L-01: Password Not Explicitly Hashed in Registration
- **File:** `AuthController.php:30-37`
- **Lines:** `AuthController.php:34` — `'password' => $request->password`
- **Description:** While the User model has `'password' => 'hashed'` cast (which auto-hashes on set), the code passes `$request->password` directly. This is correct due to the cast, but confusing and fragile — if the cast is ever removed, passwords would be stored in plaintext.
- **Fix:** Explicitly hash: `'password' => Hash::make($request->password)` for defense-in-depth clarity.

### L-02: No Password Complexity Requirements
- **File:** `Auth/RegisterRequest.php`
- **Description:** Registration does not enforce password complexity (minimum length, special characters, etc.).
- **Fix:** Add `min:8|confirmed` or similar rules.

### L-03: Error Messages Leak User Existence
- **File:** `AuthController.php:142-143`
- **Lines:** `AuthController.php:142` — `return response()->json(['message' => __(Password::RESET_LINK_SENT)], 200)`
- **Description:** The forgot password endpoint returns 200 with "reset link sent" whether the user exists or not (good), but the 200 status code for "user not found" is inconsistent. The reset password endpoint at line 160 returns `passwords.user` error which confirms user existence.
- **Fix:** Use generic error messages for both cases.

### L-04: Health Check Endpoint Exposes Internal Info
- **File:** `socket-server/src/index.js:160-179`
- **Lines:** `index.js:165` — `status: 'ok', uptime: process.uptime(), ...`
- **Description:** The `/health` and `/metrics` endpoints expose uptime, connection count, memory usage, and latency stats. While useful for monitoring, these should not be publicly accessible.
- **Fix:** Add authentication to health/metrics endpoints or restrict to internal network.

### L-05: `X-Request-Id` Header Trusts Client Input
- **File:** `RequestTimingMiddleware.php:22`
- **Lines:** `RequestTimingMiddleware.php:22` — `$request->header('X-Request-Id', uniqid())`
- **Description:** The middleware trusts the client-provided `X-Request-Id` header. An attacker can inject newlines or special characters to corrupt log files (log injection).
- **Fix:** Generate server-side request IDs: `$request->header('X-Request-Id', Str::uuid())` and ignore client-provided values.

---

## POSITIVE FINDINGS (What's Done Well)

1. **Ride state machine** — `Ride::transitionTo()` enforces valid status transitions with a whitelist. Prevents illegal state jumps.
2. **Wallet concurrency control** — `WalletService` uses Redis locks and `DB::transaction` with `lockForUpdate()` for concurrent operations. Good defense against race conditions.
3. **GPS spoofing detection** — `RideService::validateDriverLocation()` checks for impossible location jumps (5km in <300 seconds).
4. **Payment velocity checks** — `PaymentService::checkPaymentVelocity()` adds friction to rapid payment attempts.
5. **Password lockout** — 5 failed attempts → 15-minute lockout.
6. **KYC document validation** — SA ID number checksum validation, document type whitelisting.
7. **Security headers middleware** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options all set.
8. **Encrypted PII** — `EncryptsPii` trait used on User model. Email and phone have hash columns for lookups.
9. **Admin audit logging** — Admin actions are logged with IP and user agent.
10. **Webhook signature verification** — PayFast ITN, Ozow webhook, Stripe webhook, and PHBIMH webhook all verify signatures.
11. **Lock forUpdate on ride acceptance** — Prevents race condition double-booking.
12. **Sentry integration** — Error reporting with performance tracing.
13. **Role-based middleware** — `role:admin|super-admin`, `role:driver` properly applied to routes.
14. **Tenant isolation** — Most queries filter by `tenant_id`.
15. **Force HTTPS middleware** — Redirects HTTP to HTTPS in non-local environments.

---

## REMEDIATION PRIORITY

| Priority | Finding | Action |
|----------|---------|--------|
| P0 | C-01 | Rotate APP_KEY, JWT_SECRET. Remove from git history. |
| P0 | C-04 | Remove `POST /wallet/confirm` self-confirmation endpoint. |
| P0 | C-03 | Change webhook bypass to explicit env var, not APP_ENV check. |
| P0 | C-06 | Server-side fare calculation for ride completion. |
| P0 | C-07 | Remove `role` from User `$fillable` or use `$guarded`. |
| P1 | H-01, H-02, H-03 | Add ride ownership validation to all socket handlers. |
| P1 | H-04 | Use UserResource for all API responses. |
| P1 | H-07 | Remove User-Agent from rate limit key. |
| P1 | H-10 | Add file type/size validation on KYC uploads. |
| P1 | H-12 | Call `invalidateToken()` on logout. |
| P1 | C-02 | Add CI check for APP_DEBUG in production. |
| P2 | C-05 | TOTP disable requires current code. |
| P2 | H-05 | Escape LIKE wildcards in search queries. |
| P2 | M-01-M-08 | Address medium findings. |
| P3 | L-01-L-05 | Address low findings. |

---

*End of audit. This report covers findings from source code analysis only. Penetration testing and infrastructure security review are recommended as follow-up.*
