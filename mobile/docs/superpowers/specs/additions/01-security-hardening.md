# Security Hardening Plan — EasyRyde

## Executive Summary

This plan addresses 10 critical security vulnerabilities identified in the enterprise audit of EasyRyde. The vulnerabilities range from role escalation in registration (CVSS 9.1) to missing input validation on webhook endpoints. Full remediation requires changes to authentication middleware, API controllers, configuration files, and infrastructure settings. Estimated total effort: 72 hours across backend, infrastructure, and QA.

## Critical Vulnerabilities

### V-001: Role Escalation in Registration
- **Severity:** CRITICAL
- **CVSS Score:** 9.1
- **Description:** The RegisterController accepts a `role` field in the registration payload. An attacker can register as `admin` or `driver` without authorization. The controller passes the role directly to `User::create()` without filtering.
- **Attack Vector:** Craft a POST request to `/v1/auth/register` with `"role": "admin"` in the JSON body. The user is created with admin privileges and can access all admin endpoints.
- **Current Code:** `F:\EasyRyde\backend\app\Http\Controllers\Api\Auth\RegisterController.php:38` — `$user = User::create($request->validated());` where the validated rules include `'role' => 'nullable|string'`.
- **Fix:** Remove `role` from the fillable fields in the registration request. Add a `$fillable` guard on the User model. Replace with hardcoded default: `$data['role'] = 'rider';` before creation. Add server-side validation: `'role' => 'in:rider'`.
- **Testing:** Attempt registration with `"role": "admin"` — should return 422 validation error. Register with no role — should default to `rider`. Register with `"role": "rider"` — should succeed. Register with `"role": "driver"` — should return 422.
- **Rollback:** Revert RegisterController.php to previous version. No database migration required.

### V-002: Missing Authorization on Driver Approval Endpoint
- **Severity:** CRITICAL
- **CVSS Score:** 8.8
- **Description:** The `approveDriver` endpoint in DriverController lacks admin-only authorization. Any authenticated user can approve drivers by calling `POST /v1/admin/drivers/{id}/approve`.
- **Attack Vector:** A rider or driver account calls the approve endpoint to approve pending drivers without admin oversight.
- **Current Code:** `F:\EasyRyde\backend\app\Http\Controllers\Api\DriverController.php:87` — `public function approveDriver(Request $request, $id)` with no middleware or role check.
- **Fix:** Add middleware `'middleware' => 'auth:sanctum,admin'` to the route. Add explicit check: `if ($request->user()->role !== 'admin') { abort(403); }`. Apply the same to `rejectDriver` and `suspendDriver` endpoints.
- **Testing:** Call approve endpoint as rider — should return 403. Call as driver — should return 403. Call as admin — should succeed. Verify audit log entry created on approval.
- **Rollback:** Remove middleware from route definition. No database changes.

### V-003: Webhook Signature Not Validated
- **Severity:** CRITICAL
- **CVSS Score:** 8.5
- **Description:** The Stripe webhook handler does not validate the `Stripe-Signature` header. An attacker can send fake webhook events to trigger payment confirmations, ride completions, or refund processing.
- **Attack Vector:** POST a fabricated `payment_intent.succeeded` event to `/v1/webhooks/stripe`. The system processes it as legitimate, crediting driver balances or releasing escrow funds.
- **Current Code:** `F:\EasyRyde\backend\app\Http\Controllers\Api\WebhookController.php:22` — `public function handleStripe(Request $request)` reads event data without signature verification.
- **Fix:** Add `$signatureHeader = $request->header('Stripe-Signature');` and `Stripe\Webhook::constructEvent($request->getContent(), $signatureHeader, config('services.stripe.webhook_secret'));` inside a try-catch. Return 400 on `SignatureVerificationException`. Store webhook secret in `.env` as `STRIPE_WEBHOOK_SECRET`.
- **Testing:** Send valid signed webhook — should process. Send unsigned webhook — should return 400. Send tampered payload — should return 400. Verify no driver balance credit on invalid webhook.
- **Rollback:** Remove signature check. No database changes.

### V-004: SQL Injection in Ride Search
- **Severity:** CRITICAL
- **CVSS Score:** 9.0
- **Description:** The ride search endpoint concatenates user input into a raw SQL query. The `pickup_location` parameter is interpolated directly into a `WHERE` clause using string concatenation.
- **Attack Vector:** Inject `' OR 1=1 --` into the pickup_location parameter to extract all ride records including rider PII (names, phone numbers, locations).
- **Current Code:** `F:\EasyRyde\backend\app\Http\Controllers\Api\RideController.php:134` — `$rides = DB::select("SELECT * FROM rides WHERE pickup_location LIKE '%$pickupLocation%'");`
- **Fix:** Replace with parameterized query: `$rides = DB::select("SELECT * FROM rides WHERE pickup_location LIKE ?", ["%$pickupLocation%"]);` Or better, use Eloquent: `Ride::where('pickup_location', 'LIKE', "%{$pickupLocation}%')->get();`
- **Testing:** Search with normal location — should return results. Search with `' OR 1=1 --` — should return empty results or 422 validation error. Run SQL injection test suite against endpoint.
- **Rollback:** Revert RideController.php. No database changes.

### V-005: PII Stored in Plaintext
- **Severity:** CRITICAL
- **CVSS Score:** 8.2
- **Description:** Rider phone numbers, email addresses, and home/work addresses are stored as plaintext in the `users` and `saved_places` tables. A database breach exposes all PII.
- **Attack Vector:** Database compromise (SQL injection, backup leak, insider threat) exposes unencrypted PII for all users.
- **Current Code:** `F:\EasyRyde\backend\database\migrations\2024_01_01_000000_create_users_table.php` — columns `phone`, `email`, `home_address`, `work_address` are stored as plain `string` types.
- **Fix:** Use Laravel's built-in encryption: `$table->string('phone')->nullable()->encrypted();` Or add an accessor/mutator on the User model: `protected $casts = ['phone' => 'encrypted'];` Apply the same to `saved_places` table address columns. Create a migration to re-encrypt existing data.
- **Testing:** Query database directly — phone numbers should appear as encrypted strings. Access via API — should return decrypted values. Verify encryption survives database dump/restore.
- **Rollback:** Remove encrypted cast. Data will be readable as ciphertext — manual re-entry required. Keep backup of plaintext data before migration.

### V-006: No Rate Limiting on Auth Endpoints
- **Severity:** HIGH
- **CVSS Score:** 7.5
- **Description:** The login endpoint has no rate limiting. An attacker can brute-force credentials without throttling.
- **Attack Vector:** Send thousands of login attempts with different passwords. No lockout or throttling occurs.
- **Current Code:** `F:\EasyRyde\backend\routes\api.php:15` — `Route::post('/auth/login', [AuthController::class, 'login']);` with no rate limit middleware.
- **Fix:** Add middleware: `Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');` (5 attempts per minute). Apply `throttle:3,1` to registration. Add account lockout after 10 failed attempts: `if ($user->failed_attempts >= 10) { abort(429, 'Account locked. Try again in 15 minutes.'); }`
- **Testing:** Send 6 login attempts in 1 minute — 6th should return 429. Wait 1 minute — should be able to attempt again. Send 10 failed logins — account should lock for 15 minutes.
- **Rollback:** Remove throttle middleware. No database changes.

### V-007: Missing CSRF on Admin Dashboard
- **Severity:** HIGH
- **CVSS Score:** 7.1
- **Description:** The admin dashboard (Inertia.js) does not validate CSRF tokens on state-changing requests. An attacker can craft a malicious page that submits forms on behalf of an authenticated admin.
- **Attack Vector:** Admin visits a malicious link while logged in. The malicious page submits a POST request to approve a fraudulent driver or process a fake refund.
- **Current Code:** `F:\EasyRyde\backend\app\Http\Middleware\VerifyCsrfToken.php` — The `web` middleware group includes CSRF verification, but the admin routes use the `api` middleware group which excludes it.
- **Fix:** Move admin routes to use the `web` middleware group, or add CSRF middleware specifically to admin routes: `Route::middleware(['auth:sanctum', 'csrf'])->prefix('admin')->group(function () { ... });` Add `APP_URL` to trusted origins in `config/session.php`.
- **Testing:** Submit admin form without CSRF token — should return 419. Submit with valid token — should succeed. Inspect cookies — should have `XSRF-TOKEN` set.
- **Rollback:** Remove CSRF middleware from admin routes. No database changes.

### V-008: Exposed Horizon Dashboard
- **Severity:** HIGH
- **CVSS Score:** 7.0
- **Description:** The Laravel Horizon dashboard is accessible without authentication in production. Anyone can view queue metrics, job failures, and worker status.
- **Attack Vector:** Navigate to `/horizon` in production. Full dashboard loads with queue metrics, job details, and worker information visible.
- **Current Code:** `F:\EasyRyde\backend\routes\web.php:12` — `Route::middleware('auth')->group(function () { Horizon::routes(); });` — Only checks `auth` middleware, not admin role.
- **Fix:** Add role check: `Route::middleware(['auth', 'admin'])->group(function () { Horizon::routes(); });` Or use Horizon's built-in `auth` configuration: `'auth' => [ 'guard' => 'web', 'middleware' => [App\Http\Middleware\AdminMiddleware::class], ],` in `config/horizon.php`.
- **Testing:** Navigate to `/horizon` as unauthenticated user — should redirect to login. Navigate as rider — should return 403. Navigate as admin — should show dashboard.
- **Rollback:** Remove admin middleware from Horizon routes. No database changes.

### V-009: Overly Permissive CORS
- **Severity:** MEDIUM
- **CVSS Score:** 6.5
- **Description:** The CORS configuration allows requests from any origin (`*`). This enables cross-site request forgery from any domain.
- **Attack Vector:** A malicious website can make authenticated API requests on behalf of logged-in users using their cookies/tokens.
- **Current Code:** `F:\EasyRyde\backend\config\cors.php:8` — `'allowed_origins' => ['*']`.
- **Fix:** Restrict to specific origins: `'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000'), env('ADMIN_URL', 'http://localhost:8080')];` Add `.env` entries for `FRONTEND_URL=https://app.easyryde.co.za` and `ADMIN_URL=https://admin.easyryde.co.za`. Set `supports_credentials => true`.
- **Testing:** Make request from allowed origin — should succeed. Make request from `evil.com` — should be blocked. Verify preflight OPTIONS requests work correctly.
- **Rollback:** Revert `config/cors.php` to wildcard. No database changes.

### V-010: No Input Validation on Payment Amounts
- **Severity:** MEDIUM
- **CVSS Score:** 6.3
- **Description:** The payment processing endpoint accepts arbitrary amounts from the client. An attacker can submit a ride with a fare of $0.01 or negative values to manipulate payment processing.
- **Attack Vector:** Submit a ride with a manipulated fare amount. The system processes the payment at the client-specified amount instead of calculating it server-side.
- **Current Code:** `F:\EasyRyde\backend\app\Http\Controllers\Api\PaymentController.php:45` — `$amount = $request->input('amount');` used directly in Stripe charge.
- **Fix:** Remove `amount` from client input. Calculate server-side: `$amount = FareCalculationService::calculate($ride);` Add validation: `'amount' => 'required|numeric|min:0|max:10000'` as defense-in-depth. Log any client-sent amount that differs from server calculation by more than 1%.
- **Testing:** Submit ride with $0.01 amount — should be overridden by server calculation. Submit negative amount — should return 422. Submit amount exceeding 10,000 — should return 422. Verify server-calculated amount is always used.
- **Rollback:** Revert PaymentController.php. No database changes.

## Security Architecture Changes

### Authentication Hardening

**Token Expiry Policy**
- Access tokens: 15 minutes (current: no expiry)
- Refresh tokens: 7 days (current: no expiry)
- Implement token rotation on refresh
- Store refresh token hash in database for revocation
- Add `token_expires_at` column to `personal_access_tokens` table

**Account Lockout Policy**
- Lock account after 10 failed login attempts
- Lock duration: 15 minutes (increasing: 15min, 30min, 60min for repeated locks)
- Send email notification on account lock
- Admin can manually unlock accounts
- Track `failed_login_attempts` and `locked_until` on users table

**Social Auth Validation**
- Verify `email_verified` from Google/Facebook before trusting email
- Validate `iss` claim matches expected provider
- Check `aud` claim matches our client ID
- Reject accounts with unverified emails from social providers

### API Security

**Webhook IP Whitelisting**
- Stripe: Whitelist IPs from https://stripe.com/files/ips/ips.json
- Paystack: Whitelist IPs from Paystack documentation
- Store in `config/webhooks.php` as array of CIDR ranges
- Reject requests from non-whitelisted IPs with 403

**Rate Limiting Per Endpoint**
| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| POST /auth/login | 5 | 1 min | 429 + lockout after 10 |
| POST /auth/register | 3 | 1 min | 429 |
| POST /rides/request | 10 | 1 min | 429 |
| POST /payments/process | 5 | 1 min | 429 |
| GET /rides/history | 60 | 1 min | 429 |
| POST /webhooks/* | 100 | 1 min | 429 |

**Input Validation Hardening**
- Use Form Request classes for ALL endpoints
- Validate UUID format: `'id' => 'required|uuid'`
- Sanitize strings: remove HTML tags, trim whitespace
- Validate enum values exactly (not `in:` with broad lists)
- Maximum string lengths enforced at validation layer

### Infrastructure Security

**HTTPS Enforcement**
- Add `APP_FORCE_HTTPS=true` to `.env`
- Middleware: `if (!$request->secure() && app()->environment('production')) { return redirect($request->url(), 301, [], true); }`
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Secure cookies: `secure => true`, `httponly => true`, `same_site => 'lax'`

**Horizon Dashboard Protection**
- Behind admin middleware (see V-008)
- Disable in production if not needed: `HORIZON_ENABLED=false`
- Restrict to VPN or internal network via IP whitelisting

**CORS Configuration**
- See V-009 fix above
- Add `Vary: Origin` header
- Limit `allowed_methods` to necessary verbs only
- Limit `allowed_headers` to required headers only

## Implementation Tasks

| # | Task | Owner | Estimate | Dependencies | Priority |
|---|------|-------|----------|--------------|----------|
| 1 | Remove role from registration payload | Backend Dev | 2h | None | P0 |
| 2 | Add admin middleware to driver endpoints | Backend Dev | 3h | None | P0 |
| 3 | Implement Stripe webhook signature validation | Backend Dev | 4h | None | P0 |
| 4 | Fix SQL injection in ride search | Backend Dev | 2h | None | P0 |
| 5 | Add encrypted casts to PII fields | Backend Dev | 8h | Migration plan | P0 |
| 6 | Add rate limiting to auth endpoints | Backend Dev | 3h | None | P1 |
| 7 | Add CSRF to admin routes | Backend Dev | 4h | None | P1 |
| 8 | Protect Horizon dashboard | Backend Dev | 1h | None | P1 |
| 9 | Restrict CORS configuration | Backend Dev | 2h | None | P1 |
| 10 | Add server-side payment amount validation | Backend Dev | 3h | FareCalculationService | P1 |
| 11 | Implement token expiry and refresh rotation | Backend Dev | 8h | personal_access_tokens migration | P1 |
| 12 | Add account lockout logic | Backend Dev | 6h | users table migration | P1 |
| 13 | Create Form Request classes for all endpoints | Backend Dev | 12h | None | P2 |
| 14 | Add webhook IP whitelisting | Backend Dev | 4h | None | P2 |
| 15 | Implement HTTPS enforcement middleware | Backend Dev | 3h | None | P2 |
| 16 | Security penetration testing | QA Engineer | 8h | Tasks 1-10 complete | P1 |
| 17 | OWASP Top 10 verification | QA Engineer | 4h | Task 16 | P1 |

**Total Estimated Effort: 80 hours**

## Security Testing Checklist

- [ ] **Penetration Test Scenarios**
  - [ ] Attempt role escalation via registration (V-001)
  - [ ] Attempt unauthorized driver approval (V-002)
  - [ ] Send forged webhook events (V-003)
  - [ ] Attempt SQL injection on ride search (V-004)
  - [ ] Query database for plaintext PII (V-005)
  - [ ] Brute-force login endpoint (V-006)
  - [ ] Craft CSRF attack page (V-007)
  - [ ] Access Horizon dashboard without auth (V-008)
  - [ ] Make cross-origin requests from evil.com (V-009)
  - [ ] Submit manipulated payment amounts (V-010)

- [ ] **OWASP Top 10 Verification**
  - [ ] A01: Broken Access Control — test all endpoints with wrong roles
  - [ ] A02: Cryptographic Failures — verify PII encryption at rest
  - [ ] A03: Injection — SQL injection, XSS, command injection tests
  - [ ] A04: Insecure Design — review threat model
  - [ ] A05: Security Misconfiguration — check CORS, headers, debug mode
  - [ ] A06: Vulnerable Components — run `composer audit`
  - [ ] A07: Auth Failures — test brute force, session management
  - [ ] A08: Data Integrity — verify webhook signatures, CSRF
  - [ ] A09: Logging Failures — verify security events are logged
  - [ ] A10: SSRF — test for server-side request forgery

- [ ] **Input Injection Tests**
  - [ ] SQL injection on all text inputs
  - [ ] XSS on all display fields (stored, reflected, DOM-based)
  - [ ] Command injection on file upload processing
  - [ ] Path traversal on file download endpoints
  - [ ] LDAP injection on authentication queries
  - [ ] XXE on XML parsing endpoints

- [ ] **Authentication Bypass Tests**
  - [ ] Access protected routes without token
  - [ ] Use expired tokens
  - [ ] Use tokens from different tenants
  - [ ] Use refresh token as access token
  - [ ] Replay captured requests

- [ ] **Authorization Escalation Tests**
  - [ ] Rider accessing driver endpoints
  - [ ] Driver accessing admin endpoints
  - [ ] Rider accessing other rider's data
  - [ ] Driver accessing other driver's earnings
  - [ ] Any user modifying their own role

## Acceptance Criteria

- [ ] All 10 CRITICAL/HIGH vulnerabilities patched and verified
- [ ] Security scan (OWASP ZAP or Burp Suite) passes with 0 critical findings
- [ ] All new endpoints have rate limiting configured
- [ ] All PII fields are encrypted at rest using AES-256
- [ ] HTTPS enforced on all production endpoints with HSTS header
- [ ] Webhook signature validation blocks 100% of unsigned requests
- [ ] SQL injection tests pass on all endpoints
- [ ] Account lockout triggers after 10 failed attempts
- [ ] Token expiry enforced (15min access, 7-day refresh)
- [ ] CORS blocks requests from non-whitelisted origins
- [ ] Horizon dashboard requires admin authentication
- [ ] All security events are logged with user ID, IP, and timestamp
- [ ] Penetration test report shows 0 critical, 0 high findings
