# EasyRyde — Enterprise QA Audit & Test Strategy

**Date:** 2026-07-01  
**Scope:** Full-stack audit — 3 React Native/Expo apps + Laravel PHP backend  
**Region:** Phalaborwa, South Africa  
**Compliance:** POPIA, PCI DSS

---

## Table of Contents

1. [PART 1: Current State Audit](#part-1-current-state-audit)
2. [PART 2: QA Completeness Audit](#part-2-qa-completeness-audit)
3. [PART 3: Security & Privacy Audit](#part-3-security--privacy-audit)
4. [PART 4: Test Strategy Design](#part-4-test-strategy-design)
5. [PART 5: Test Case Generation](#part-5-test-case-generation)
6. [PART 6: Quality Gates](#part-6-quality-gates)

---

## PART 1: Current State Audit

### 1.1 Route Security Audit (`routes/api.php`)

#### CRITICAL FINDINGS

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **Horizon dashboard exposed via API routes** — `horizon/api/*` routes appear in route:list output. Horizon should be behind auth middleware, not exposed at the API level. | CRITICAL | route:list output |
| 2 | **Webhook routes lack signature verification at route level** — PayFast, Ozow, Stripe, Twilio webhooks have no route-level middleware for IP whitelisting or HMAC verification. Verification is inside controller methods, which means a malicious request still reaches PHP processing. | HIGH | 54-63 |
| 3 | **`/rides/{ride}/updateLocation` has no role middleware** — Any authenticated user (rider OR driver) can hit this. A rider could spoof a driver's location. | HIGH | 92 |
| 4 | **`/drivers` index endpoint has no role restriction** — Any authenticated user can list all drivers. Should be admin-only or at minimum scoped. | HIGH | 109-111 |
| 5 | **`/promo-codes/validate` is public** — No auth required. Allows fare estimation scraping and promo code enumeration. | MEDIUM | 51 |
| 6 | **`/places/search` and `/places/reverse` are public** — No rate limiting visible. Could be abused for geocoding at scale. | MEDIUM | 66-67 |
| 7 | **`/rides/fare-estimate` is public** — No auth, no rate limit visible. Allows fare scraping. | MEDIUM | 68 |
| 8 | **Social auth `{provider}` route accepts any string** — No whitelist for allowed providers (google, apple). Could allow injection. | HIGH | 46-47 |
| 9 | **`/admin/drivers` POST (createDriver) uses `AuthController@createDriver`** — Route path is confusing (admin prefix but different controller). | LOW | 250 |
| 10 | **Restaurant orders route `/restaurant/food/orders` has no role middleware** — Any authenticated user can view restaurant orders. | MEDIUM | 183-185 |

#### ROUTE COMPLETENESS GAPS

| Missing Route | Purpose | Priority |
|---------------|---------|----------|
| `PUT /rides/{ride}` | Ride update (admin correction) | MEDIUM |
| `GET /admin/surge-zones` | View current surge zones | MEDIUM |
| `POST /admin/surge-zones` | Set manual surge | MEDIUM |
| `POST /rides/{ride}/pool` | Pool ride request | HIGH |
| `GET /pool/requests` | Driver pool queue | HIGH |
| `POST /pool/{request}/accept` | Driver accept pool rider | HIGH |
| `GET /admin/disputes` | Admin dispute management | HIGH |
| `PUT /admin/disputes/{dispute}` | Resolve dispute | HIGH |
| `POST /wallet/cash-out` | Driver cash-out to bank | HIGH |
| `GET /driver/payout-history` | Driver payout history | MEDIUM |
| `POST /rides/{ride}/no-show` | Mark rider no-show | MEDIUM |
| `POST /rides/{ride}/share-location` | Share live location link | LOW |
| `GET /admin/peak-hours` | View peak hour config | MEDIUM |
| `POST /admin/peak-hours` | Configure peak hours | MEDIUM |

### 1.2 Controller Audit

#### AuthController (`AuthController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No email verification enforcement** — Users can register without verifying email. No `email_verified_at` check anywhere. | CRITICAL | 23-50 |
| 2 | **Password not validated on `createDriver`** — `$validated['password']` passed directly, but no confirmation field required. | MEDIUM | 86-112 |
| 3 | **Registration allows role escalation** — `$request->role ?? 'rider'` means a user can self-register as a driver or admin if the request includes `role`. | CRITICAL | 36 |
| 4 | **No CAPTCHA/bot protection on register/login** | HIGH | 42-43 |
| 5 | **`forgotPassword` leaks user existence** — Returns same message regardless of email, but timing attack possible. | LOW | 114-129 |
| 6 | **No account lockout after failed attempts** | HIGH | 52-70 |

#### RideController (`RideController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **`cancel` does not implement cancellation fees** — Just cancels and refunds. No fee logic for late cancellation. | HIGH | 106-130 |
| 2 | **`completeRide` uses hardcoded fallback fare** — `calculateFinalFare` returns `50.0` if fare is 0. This is a safety net but could charge wrong amount. | HIGH | 245-273 |
| 3 | **`rate` allows re-rating** — No check if a rating already exists for this ride. | MEDIUM | 132-156 |
| 4 | **No POPIA consent check before creating ride** | MEDIUM | 56-85 |
| 5 | **`fareEstimate` does not apply surge** — `calculateFare` is called with `null` surge multiplier. The estimate shown to rider may differ from actual ride fare. | HIGH | 309-338 |
| 6 | **No maximum ride distance validation** — Rider could book rides of 1000km+. | MEDIUM | 56-85 |
| 7 | **No minimum ride distance validation** — Could book 0km rides. | LOW | 56-85 |
| 8 | **`updateLocation` has no ride association check** — Updates user location regardless of which ride. | MEDIUM | 294-307 |

#### PaymentController (`PaymentController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **Payment methods endpoint is hardcoded** — No dynamic availability check. Stripe may be down but shows `available: true`. | MEDIUM | 60-71 |
| 2 | **`processRidePayment` does not verify ride belongs to payer** — Only checks `rider_id`. If rider_id is manipulated, could pay for someone else's ride. | MEDIUM | 73-190 |
| 3 | **Webhook handlers do not validate Content-Type** — Could receive malformed payloads. | MEDIUM | 192-298 |
| 4 | **`createStripeIntent` allows amount without ride context** — When `ride_id` is not provided, any amount up to `max_stripe_amount` can be created. This could be used for wallet top-ups but is also an attack surface. | MEDIUM | 300-327 |
| 5 | **Refund can be requested by payee (driver)** — `$payment->payee_id !== $user->id` check allows drivers to request refunds on their own payments. | HIGH | 338-359 |
| 6 | **No idempotency on payment processing** — Double-click could create duplicate payments. | HIGH | 73-190 |

#### DriverController (`DriverController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **`nearbyRides` uses raw Haversine without proper PostGIS** — The `radius` parameter is user-controlled and not validated. Could be set to 1000km. | HIGH | 155-175 |
| 2 | **`toggleOnline` requires location** — But what if GPS is unavailable? Should allow toggling without location. | MEDIUM | 87-100 |
| 3 | **No driver approval check on `toggleOnline`** — Unapproved drivers can go online. | HIGH | 87-100 |
| 4 | **`trips` endpoint leaks rider PII to driver** — `with(['rider'])` loads full rider model including encrypted PII. | MEDIUM | 144-153 |

#### WalletController (`WalletController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **Deposit creates credit immediately before gateway confirmation** — Wallet balance increases before payment is confirmed by gateway. | CRITICAL | 55-124 |
| 2 | **No daily/weekly deposit limits** | MEDIUM | 55-124 |
| 3 | **Withdrawal has no anti-money-laundering checks** — No velocity, no daily limit, no suspicious pattern detection. | HIGH | 126-157 |
| 4 | **No minimum withdrawal amount** | LOW | 126-157 |

#### AdminController (`AdminController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **`users` search uses LIKE with user input** — SQL injection risk if not parameterized (Laravel's `where('name', 'like', "%{$v}%")` is safe, but no input sanitization). | MEDIUM | 43-58 |
| 2 | **`retryPayout` has no status check** — Can retry already-completed payouts. | MEDIUM | 241-256 |
| 3 | **`updateSettings` has no validation of setting keys** — Admin can create arbitrary system settings. | MEDIUM | 162-190 |

#### SosController (`SosController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No rate limiting on SOS trigger** — Could be used to spam alerts. | HIGH | 22-41 |
| 2 | **Cancel has no time window enforcement in controller** — Relies on service. If service is buggy, SOS can be cancelled at any time. | MEDIUM | 43-52 |
| 3 | **No automatic notification to emergency services** | MEDIUM | 22-41 |
| 4 | **No location tracking activated on SOS** | MEDIUM | 22-41 |

#### IncidentController (`IncidentController.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No file upload validation on evidence** — `downloadEvidence` serves files without validating they are safe. | HIGH | 135-147 |
| 2 | **No file size/type restrictions visible** | MEDIUM | 21-40 |

### 1.3 RBAC Audit (`config/permission.php`)

| # | Finding | Severity |
|---|---------|----------|
| 1 | **No team-based permissions** — `teams => false`. Single-tenant only. If multi-tenant is needed, this is a blocker. | MEDIUM |
| 2 | **Cache expiration is 24 hours** — Role changes take up to 24h to propagate if cache not cleared. | MEDIUM |
| 3 | **No permission definitions visible** — Only role configuration. Actual permissions should be seeded. | HIGH |
| 4 | **`register_permission_check_method => true`** — Good, enables `$user->hasPermissionTo()`. | OK |
| 5 | **Missing roles in migration** — Need to verify `rider`, `driver`, `admin`, `super-admin`, `restaurant` roles exist in seeder. | HIGH |

#### RBAC GAPS IN ROUTES

| Route | Current Access | Required Access |
|-------|---------------|-----------------|
| `GET /drivers` | Any authenticated | Admin or driver |
| `POST /rides/{ride}/updateLocation` | Any authenticated (ride participant) | Driver only for driver location |
| `GET /restaurant/food/orders` | Any authenticated | Restaurant role only |
| `GET /promo-codes` | Any authenticated | Admin for list, rider for own |
| `POST /deliveries` | Any authenticated | Rider or admin only |
| `PUT /deliveries/{delivery}/status` | Any authenticated | Driver or admin only |
| `POST /ratings` | Any authenticated | Should verify ride participant |

### 1.4 Mobile API Client Audit (`client.ts`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **API_BASE is hardcoded to localhost** — `'http://127.0.0.1:8082/api'`. Must be environment-configurable. | CRITICAL | 5 |
| 2 | **HTTP, not HTTPS** — Even for localhost, production must use HTTPS. | CRITICAL | 5 |
| 3 | **No token refresh mechanism** — When 401 received, just calls `onUnauthorized`. No attempt to refresh expired token. | HIGH | 185-188 |
| 4 | **Token stored in SecureStore** — Good practice. | OK | 98 |
| 5 | **Retry logic only for network errors** — Does not retry on 503 or other server errors. | MEDIUM | 224-226 |
| 6 | **Cache stores raw JSON strings** — `JSON.stringify(result)` then `JSON.parse(cached)`. Double serialization. | LOW | 208, 147 |
| 7 | **No request signing** — API requests have no HMAC or request integrity verification. | MEDIUM | 167-180 |
| 8 | **`_isOnline` defaults to true for localhost** — Makes offline queue testing impossible in dev. | LOW | 14 |
| 9 | **No request ID for idempotency** — No UUID attached to requests for deduplication. | MEDIUM | 135-234 |
| 10 | **Cache not invalidated on mutation** — POST/PUT/DELETE don't clear related cache entries. | MEDIUM | 207-219 |

### 1.5 Auth Flow Audit (`useAuth.tsx`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No token expiry handling** — Token is stored indefinitely. If backend has token expiry, user will get 401 with no graceful recovery. | HIGH | 44-59 |
| 2 | **`refreshUser` silently fails** — Catch block is empty. User doesn't know refresh failed. | MEDIUM | 85-90 |
| 3 | **No biometric auth option** | MEDIUM | — |
| 4 | **`logout` catches and swallows errors** — If server-side logout fails, token is still cleared locally. This is correct behavior. | OK | 78-83 |
| 5 | **Race condition on `loadStoredAuth`** — If called multiple times (React Strict Mode), could have concurrent state updates. | LOW | 44-59 |
| 6 | **No session timeout** — User stays logged in forever unless token expires server-side. | MEDIUM | — |

### 1.6 Model Audit

#### User Model (`User.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **Soft deletes enabled** — Good for POPIA compliance. | OK | 20 |
| 2 | **PII encryption on email/phone** — `encrypted` cast. | OK | 42-43 |
| 3 | **Hash-based lookups** — `email_hash` and `phone_hash` for searching encrypted fields. | OK | 64-69 |
| 4 | **`role` in fillable** — Could be mass-assigned. But protected by `assignRole()`. | MEDIUM | 26-32 |
| 5 | **No `is_approved` default in migration** — Added later in separate migration. | LOW | — |
| 6 | **`current_latitude`/`current_longitude` precision** — `decimal:7` is ~1cm precision. Sufficient for ride-hailing. | OK | 53-54 |

#### Ride Model (`Ride.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No soft deletes** — Ride data is permanent. Cannot comply with POPIA erasure requests for ride data. | HIGH | — |
| 2 | **No `pool_id` field** — Pool rides have no model support. | CRITICAL | — |
| 3 | **No `scheduled_ride_id` field** — Scheduled rides link via `scheduled_rides.ride_id` but not on ride itself. | LOW | — |
| 4 | **`cancelled_by` is string, not foreign key** — Could store 'system' but not referential. | LOW | 25 |
| 5 | **No status validation in model** — Status can be set to any string. Should have enum or validation. | MEDIUM | — |
| 6 | **No scopes for common queries** — `scopeActive()`, `scopeCompleted()`, etc. missing. | MEDIUM | — |
| 7 | **Missing `pool_riders` relationship** | HIGH | — |

#### Payment Model (`Payment.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No soft deletes** — Payment records cannot be anonymized for POPIA. | HIGH | — |
| 2 | **No unique constraint on `ride_id` + `status`** — Could have multiple completed payments for same ride. | HIGH | — |
| 3 | **Constants for statuses** — Good practice. | OK | 19-29 |
| 4 | **No `currency` field** — Hardcoded to ZAR assumption. | LOW | — |

#### Wallet Model (`Wallet.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No unique constraint on `user_id`** — Could have duplicate wallets per user. | HIGH | — |
| 2 | **No negative balance protection in model** — Relies on service layer. | MEDIUM | — |
| 3 | **No optimistic locking** — Concurrent transactions could cause balance corruption. | HIGH | — |

#### DriverProfile Model (`DriverProfile.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No soft deletes** — Driver profile data permanent. | MEDIUM | — |
| 2 | **`average_rating` computed from `rating_sum / rating_count`** — Denormalized. Could drift if ratings are deleted. | MEDIUM | 45-49 |
| 3 | **Encrypted PII fields** — `id_number`, `license_number`, `emergency_contact_*` all encrypted. | OK | 28-36 |

#### SosAlert Model (`SosAlert.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No `alert_type` field in migration** — Controller sends it but schema doesn't have it. | HIGH | — |
| 2 | **No `resolved_by` field** — Can't track who resolved. | MEDIUM | — |
| 3 | **No `updated_at` tracking on status changes** | LOW | — |

#### Dispute Model (`Dispute.php`)

| # | Finding | Severity | Line |
|---|---------|----------|------|
| 1 | **No soft deletes** — Dispute records permanent. | MEDIUM | — |
| 2 | **No `evidence_paths` field** — No way to attach evidence. | MEDIUM | — |
| 3 | **No priority/severity field** | LOW | — |

### 1.7 Migration Audit

#### Missing Migrations

| Table/Field | Purpose | Priority |
|-------------|---------|----------|
| `pool_rides` table | Pool ride grouping | CRITICAL |
| `pool_ride_riders` pivot | Pool ride participants | CRITICAL |
| `surge_zones` table | Configurable surge zones | HIGH |
| `peak_hours` table | Peak hour schedules | HIGH |
| `cancellation_fees` table | Cancellation fee rules | HIGH |
| `driver_documents` table | Driver license, insurance docs | HIGH |
| `ride_waypoints` table | Multi-stop rides | MEDIUM |
| `ride_locations` table | Location tracking history | MEDIUM |
| `push_notification_logs` table | Notification audit trail | MEDIUM |
| `rate_limits` table | API rate limit tracking | MEDIUM |
| `driver_availability` table | Online/offline schedule | LOW |

#### Schema Issues in Existing Migrations

| # | Migration | Issue | Severity |
|---|-----------|-------|----------|
| 1 | `create_rides_table` | No `pool_id` column | CRITICAL |
| 2 | `create_rides_table` | No `cancellation_fee` column | HIGH |
| 3 | `create_rides_table` | No `estimated_distance` for fare comparison | MEDIUM |
| 4 | `extend_users_table` | No `email_verified_at` column in extension (should be in base users table) | MEDIUM |
| 5 | `create_advanced_feature_tables` | `sos_alerts` missing `alert_type` column | HIGH |
| 6 | `create_advanced_feature_tables` | `sos_alerts` missing `resolved_by` column | MEDIUM |
| 7 | `create_payment_infrastructure_tables` | No unique index on `payments.ride_id` where status is completed | HIGH |
| 8 | `create_compliance_tables` | `kyc_verifications.document_number` not encrypted | HIGH |

---

## PART 2: QA Completeness Audit

### 2.1 Missing Features — Ride Pooling

| # | Missing Item | Severity | Description |
|---|-------------|----------|-------------|
| P-1 | Pool ride model/schema | CRITICAL | No `pool_rides` table, no `pool_id` on rides table |
| P-2 | Pool matching algorithm | CRITICAL | No service to match riders going same direction |
| P-3 | Pool fare splitting | CRITICAL | No logic to split fare among pool riders |
| P-4 | Pool pickup sequencing | CRITICAL | No algorithm to order pickups/dropoffs for efficiency |
| P-5 | Pool capacity management | CRITICAL | No max riders per pool vehicle (typically 3-4) |
| P-6 | Pool driver acceptance flow | HIGH | No multi-rider acceptance workflow |
| P-7 | Pool real-time sharing | HIGH | No location sharing between pool riders |
| P-8 | Pool ETA calculation | HIGH | No composite ETA for multiple dropoffs |
| P-9 | Pool cancellation impact | HIGH | No logic for when one pool rider cancels |
| P-10 | Pool payment per rider | HIGH | No per-rider payment processing in pool |
| P-11 | Pool ride status tracking | HIGH | No pool-specific statuses (pool_matching, pool_picking_up, etc.) |
| P-12 | Pool wait time limits | MEDIUM | No max wait time for pool riders |
| P-13 | Pool detour limits | MEDIUM | No max detour distance/time per rider |

### 2.2 Missing Features — Surge/Peak Pricing

| # | Missing Item | Severity | Description |
|---|-------------|----------|-------------|
| S-1 | Peak hour configuration | CRITICAL | No admin-configurable peak hours schedule |
| S-2 | Time-based surge | CRITICAL | Surge is purely demand/supply ratio, ignores time of day |
| S-3 | Surge notification to riders | HIGH | No notification when surge is applied |
| S-4 | Surge cap per ride | HIGH | `MAX_SURGE = 3.0` hardcoded, not configurable |
| S-5 | Surge history/audit | MEDIUM | No logging of surge applied per ride |
| S-6 | Manual surge override | MEDIUM | `setManualSurge` exists but no admin API to use it |
| S-7 | Surge zone configuration | MEDIUM | Zones hardcoded to Phalaborwa coordinates |
| S-8 | Surge transparency | MEDIUM | Rider should see surge breakdown before booking |
| S-9 | Surge prediction | LOW | No predictive surge based on events/weather |
| S-10 | FareEstimate ignores surge | HIGH | `fareEstimate` endpoint doesn't apply current surge |

### 2.3 Missing Business Rules

| # | Missing Rule | Severity | Description |
|---|-------------|----------|-------------|
| BR-1 | Cancellation fee tiers | HIGH | No fee for <5min, partial fee 5-15min, full fee >15min |
| BR-2 | No-show fee | HIGH | Driver arrives, rider doesn't show within 5min |
| BR-3 | Ride timeout | HIGH | Auto-complete rides stuck in `in_progress` for >4 hours |
| BR-4 | Maximum ride duration | MEDIUM | No cap on ride time (safety concern) |
| BR-5 | Driver shift limits | MEDIUM | No max driving hours (road safety) |
| BR-6 | Rider booking limits | LOW | No max concurrent bookings per rider |
| BR-7 | Fare adjustment by driver | MEDIUM | No mechanism for driver to request fare correction |
| BR-8 | Tip functionality | MEDIUM | No tipping for drivers |
| BR-9 | Recurring ride pricing | MEDIUM | Scheduled rides don't lock in fare at schedule time |
| BR-10 | Multi-stop rides | MEDIUM | No waypoint support |
| BR-11 | Ride request expiry | HIGH | `expireStaleRides` uses 60s, but no configurable timeout |
| BR-12 | Driver minimum acceptance rate | MEDIUM | No penalty for drivers who decline many rides |

### 2.4 Missing Payment Workflows

| # | Missing Workflow | Severity | Description |
|---|-----------------|----------|-------------|
| PAY-1 | Wallet top-up confirmation | CRITICAL | Balance credited before gateway confirms |
| PAY-2 | Automatic payout scheduling | HIGH | No scheduled payouts to drivers |
| PAY-3 | Cash reconciliation | HIGH | `cash_reconciliations` table exists but no admin workflow |
| PAY-4 | Split payment (multiple methods) | MEDIUM | Cannot pay part wallet + part card |
| PAY-5 | Payment retry on failure | MEDIUM | No automatic retry for failed gateway payments |
| PAY-6 | Receipt generation per payment | MEDIUM | Receipt is per ride, not per payment |
| PAY-7 | Invoice generation | MEDIUM | No invoice for business riders |
| PAY-8 | Tax calculation | MEDIUM | No VAT handling for SA (15%) |
| PAY-9 | Currency display | LOW | No ZAR symbol formatting in API responses |

### 2.5 Missing Compliance Requirements

| # | Requirement | Severity | Description |
|---|------------|----------|-------------|
| C-1 | POPIA data minimization | HIGH | Collecting more data than necessary (e.g., full address stored as string) |
| C-2 | POPIA consent before data collection | HIGH | No consent check before collecting location, PII |
| C-3 | POPIA right to access | HIGH | `/data/export` exists but scope unclear |
| C-4 | POPIA right to deletion | HIGH | `/data/erasure` exists but cascade effects unclear |
| C-5 | POPIA data breach notification | HIGH | No breach detection or notification system |
| C-6 | PCI DSS — card data not stored | HIGH | Stripe handles card data, but `gateway_response` stores full response |
| C-7 | PCI DSS — no card data in logs | HIGH | No log sanitization visible |
| C-8 | PCI DSS — TLS required | HIGH | API base uses HTTP |
| C-9 | South Africa — POPIA registration | MEDIUM | Must register with Information Regulator |
| C-10 | South Africa — RICA compliance | MEDIUM | Driver verification should meet RICA requirements |
| C-11 | Data retention policy | HIGH | `DataRetentionController` exists but cleanup logic unclear |
| C-12 | Audit trail for PII access | HIGH | No logging of who accessed PII data |

### 2.6 Missing Security Measures

| # | Missing Measure | Severity | Description |
|---|----------------|----------|-------------|
| SEC-1 | API key rotation | HIGH | Sanctum tokens have no rotation mechanism |
| SEC-2 | Request signing | HIGH | No HMAC for API request integrity |
| SEC-3 | IP whitelisting for webhooks | HIGH | Webhook routes accept requests from any IP |
| SEC-4 | CORS configuration | HIGH | No CORS config visible |
| SEC-5 | Content Security Policy | MEDIUM | No CSP headers |
| SEC-6 | Security headers (HSTS, X-Frame, etc.) | MEDIUM | No security headers middleware |
| SEC-7 | Input length limits | MEDIUM | No max length on text fields |
| SEC-8 | File upload scanning | HIGH | KYC documents uploaded without virus scanning |
| SEC-9 | Rate limiting per user | HIGH | Throttle exists but not per-user granular |
| SEC-10 | Account enumeration prevention | MEDIUM | Login error messages could reveal email existence |

### 2.7 Missing Edge Cases

| # | Edge Case | Severity | Description |
|---|-----------|----------|-------------|
| EC-1 | Driver goes offline during ride | HIGH | No handling if driver loses connectivity mid-ride |
| EC-2 | Rider cancels during payment processing | HIGH | Race condition between cancel and payment |
| EC-3 | Simultaneous driver accept | HIGH | Two drivers accept same ride (handled by `lockForUpdate` — OK) |
| EC-4 | Network timeout during ride completion | HIGH | Ride status stuck if completion fails mid-transaction |
| EC-5 | GPS signal loss during ride | MEDIUM | No last-known-location fallback |
| EC-6 | App killed during active ride | MEDIUM | No background location tracking |
| EC-7 | Wallet balance race condition | HIGH | Concurrent deposits could cause double-spend |
| EC-8 | Promotional code abuse | MEDIUM | No check for same promo used multiple times across rides |
| EC-9 | Driver rating manipulation | MEDIUM | No detection of rating farming patterns |
| EC-10 | Fare manipulation via location spoofing | HIGH | Driver could submit fake GPS to complete ride early |
| EC-11 | SOS false alarm spam | MEDIUM | No cooldown between SOS triggers |
| EC-12 | Multi-device login | MEDIUM | No session management across devices |

### 2.8 Missing Failure Modes

| # | Failure Mode | Severity | Description |
|---|-------------|----------|-------------|
| FM-1 | Payment gateway timeout | HIGH | No fallback if PayFast/Ozow/Stripe is down |
| FM-2 | Redis cache failure | HIGH | Surge pricing breaks if cache unavailable |
| FM-3 | Database failover | MEDIUM | No read replica configuration |
| FM-4 | Queue worker failure | HIGH | Horizon jobs stuck if worker crashes |
| FM-5 | Push notification failure | MEDIUM | No retry for failed push notifications |
| FM-6 | SMS delivery failure | MEDIUM | No fallback SMS provider |
| FM-7 | Route service failure | HIGH | Fare calculation fails if route API is down |
| FM-8 | File storage failure | MEDIUM | KYC documents, receipts fail to upload |

---

## PART 3: Security & Privacy Audit

### 3.1 Threat Model

#### Ride-Hailing Specific Threats

| Threat | Attack Vector | Impact | Likelihood | Mitigation Status |
|--------|--------------|--------|------------|-------------------|
| **Ride spoofing** | Fake ride request with manipulated coordinates | Financial loss, driver time wasted | HIGH | Partial — `lockForUpdate` prevents double-accept |
| **Fare manipulation** | Location spoofing to shorten reported distance | Revenue loss | HIGH | NOT MITIGATED — no server-side distance verification |
| **Location spoofing** | Driver submits fake GPS during ride | False ride completion | HIGH | NOT MITIGATED |
| **Identity theft** | Stolen credentials, SIM swap | Unauthorized rides, payment fraud | MEDIUM | Partial — PII encrypted, but no 2FA for riders |
| **Payment fraud** | Stolen card details, chargebacks | Financial loss | HIGH | Partial — velocity checks exist |
| **Data exfiltration** | API scraping, insider threat | POPIA violation | MEDIUM | Partial — rate limiting, but no DLP |
| **Account takeover** | Brute force, credential stuffing | Full account access | HIGH | Partial — throttle on login, no lockout |
| **Driver-rider collusion** | Fake rides for wallet credits | Revenue loss | MEDIUM | NOT MITIGATED |
| **Surge manipulation** | Mass fake requests to inflate surge | Rider overcharging | MEDIUM | NOT MITIGATED — surge based on `searching` rides |
| **Wallet fraud** | Deposit then dispute, or wallet-to-wallet transfer | Financial loss | MEDIUM | Partial — dispute window exists |
| **SOS abuse** | False emergency alerts | Resource waste, driver harassment | LOW | NOT MITIGATED |
| **KYC bypass** | Fake documents, stolen identities | Regulatory non-compliance | MEDIUM | Partial — manual admin review |

#### Attack Surfaces

| Surface | Risk Level | Notes |
|---------|-----------|-------|
| **API endpoints** | HIGH | 130+ routes, many without proper auth |
| **WebSocket events** | HIGH | Real-time ride tracking, no auth verification visible |
| **Deep links** | MEDIUM | No deep link validation visible |
| **Local storage** | MEDIUM | SecureStore used for tokens, but AsyncStorage for cache |
| **Network interception** | HIGH | HTTP base URL, no certificate pinning |
| **Push notifications** | LOW | Could leak ride details in notification preview |
| **Third-party webhooks** | HIGH | PayFast, Ozow, Stripe — IP validation missing |

#### RBAC Gaps

| Gap | Current State | Risk |
|-----|--------------|------|
| Rider accessing admin endpoints | No check — would get 403 from controller but middleware allows | MEDIUM |
| Driver modifying fares | Cannot — fare calculated server-side | OK |
| Driver accessing other driver's earnings | `earnings` is user-scoped | OK |
| Admin accessing other tenant data | Tenant scoping present in most controllers | LOW |
| Unapproved driver going online | `toggleOnline` has no approval check | HIGH |

#### PII Exposure

| Data Point | Storage | Exposure Risk |
|------------|---------|---------------|
| Phone numbers | Encrypted in DB | HIGH — returned in API responses (e.g., `rider` relationship) |
| Email addresses | Encrypted in DB | HIGH — returned in API responses |
| Home/work addresses | `pickup_address`/`dropoff_address` as plaintext strings | HIGH — ride history exposes patterns |
| Exact locations | Lat/lng in rides table | HIGH — 7 decimal precision = ~1cm |
| ID numbers | Encrypted in `driver_profiles` | OK — encrypted |
| License numbers | Encrypted in `driver_profiles` | OK — encrypted |
| Payment card data | Via Stripe (not stored) | OK |
| KYC documents | File paths in `kyc_verifications` | MEDIUM — files accessible via API |
| Emergency contacts | Encrypted in `driver_profiles` | OK — encrypted |

#### Rate Limiting Status

| Endpoint Group | Throttle | Status |
|---------------|----------|--------|
| Auth (register/login) | `auth-register`, `auth-login`, `auth-password` | IMPLEMENTED |
| Ride creation | `ride-create` | IMPLEMENTED |
| Ride cancellation | `ride-cancel` | IMPLEMENTED |
| Payment processing | `payments` | IMPLEMENTED |
| Wallet deposit/withdraw | `wallet-deposit`, `wallet-withdraw` | IMPLEMENTED |
| Places search | NONE | MISSING |
| Fare estimate | NONE | MISSING |
| SOS trigger | NONE | MISSING |
| Chat messages | NONE | MISSING |
| File downloads (KYC, evidence) | NONE | MISSING |
| Admin operations | NONE | MISSING |

#### Token Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Token type | Sanctum personal access tokens | OK |
| Token expiry | DEFAULT (indefinite) | NEEDS CONFIGURATION — tokens should expire |
| Token refresh | NOT IMPLEMENTED | No refresh token mechanism |
| Token revocation | On logout only | No bulk revocation |
| Device binding | NOT IMPLEMENTED | Token works on any device |
| Token rotation | NOT IMPLEMENTED | No automatic rotation |

### 3.2 POPIA Compliance Gaps

| Requirement | Status | Gap |
|------------|--------|-----|
| Lawful basis for processing | PARTIAL | No consent check before location tracking |
| Purpose limitation | PARTIAL | Data used beyond ride service (analytics unclear) |
| Data minimization | PARTIAL | Full addresses stored, could use zones |
| Accuracy | PARTIAL | No user data correction workflow |
| Storage limitation | PARTIAL | `DataRetentionController` exists but rules unclear |
| Integrity & confidentiality | PARTIAL | Encryption at rest, but HTTP transport |
| Accountability | PARTIAL | Audit logs exist for admin, not for data access |
| Data subject rights | PARTIAL | Export/erasure endpoints exist |
| Cross-border transfer | UNKNOWN | Cloud hosting location unclear |
| Breach notification | NOT IMPLEMENTED | No breach detection system |
| DPO appointment | UNKNOWN | No DPO contact visible |
| PIA completion | UNKNOWN | No Privacy Impact Assessment visible |

---

## PART 4: Test Strategy Design

### 4.1 Testing Pyramid

```
                    ┌─────────┐
                    │  E2E    │  10%
                    │  Tests  │
                    ├─────────┤
                    │Integration│  30%
                    │  Tests   │
                    ├─────────┤
                    │  Unit    │  60%
                    │  Tests   │
                    └─────────┘
```

### 4.2 Unit Tests

#### Backend Unit Tests

**Model Tests (152 test cases)**

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `UserTest.php` | Email/phone hashing, role assignment, PII encryption, soft deletes, tenant scoping | 100% |
| `RideTest.php` | Status transitions, fare casting, relationships, scopes | 100% |
| `PaymentTest.php` | Status constants, amount casting, dispute relationship | 100% |
| `WalletTest.php` | Balance operations, transaction relationships | 100% |
| `DriverProfileTest.php` | Average rating calculation, encrypted fields | 100% |
| `SosAlertTest.php` | Status checks, relationships | 100% |
| `DisputeTest.php` | Status management, relationships | 100% |
| `RatingTest.php` | Score validation, relationships | 100% |
| `PromoCodeTest.php` | Validity checks, discount calculation | 100% |
| `ConsentRecordTest.php` | Grant/revoke, consent type validation | 100% |

**Service Tests (280 test cases)**

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `FareCalculationServiceTest.php` | All categories, surge application, minimum fare, promo discount, edge cases (0km, 0min, negative) | 100% |
| `SurgePricingServiceTest.php` | Zone detection, demand/supply ratio, cache behavior, manual override, max surge | 100% |
| `RideMatchingServiceTest.php` | Accept flow, distance calculation, ETA, concurrent accept (race), stale ride expiry | 100% |
| `EscrowServiceTest.php` | Hold, release, double-debit prevention, dispute hold, expiry | 100% |
| `PaymentServiceTest.php` | Platform fee calculation, method routing, velocity checks | 100% |
| `WalletServiceTest.php` | Credit, debit, insufficient balance, concurrent operations | 100% |
| `RefundServiceTest.php` | Full refund, partial refund, already refunded | 100% |
| `PromoCodeServiceTest.php` | Validate code, apply discount, expiry, usage limits | 100% |
| `SosServiceTest.php` | Trigger, cancel within window, acknowledge, resolve | 100% |
| `RatingServiceTest.php` | Rate ride, prevent duplicate, score validation | 100% |
| `ScheduledRideServiceTest.php` | Schedule, cancel, convert to ride | 100% |
| `DataRetentionServiceTest.php` | Cleanup, anonymization, erasure | 100% |
| `KycServiceTest.php` | Submit, approve, reject, document validation | 100% |
| `IncidentReportingServiceTest.php` | Report, assign, escalate, resolve | 100% |

#### Mobile Unit Tests

| Test File | Tests | Coverage Target |
|-----------|-------|-----------------|
| `apiClient.test.ts` | Request/response, retry, cache, offline queue, token management | 100% |
| `useAuth.test.tsx` | Login, register, logout, token persistence, error handling | 100% |
| `validators.test.ts` | All input validators (email, phone, coordinates) | 100% |
| `formatters.test.ts` | Currency formatting, distance, duration, date | 100% |
| `geolocation.test.ts` | Distance calculation, bearing, ETA | 100% |

### 4.3 Integration Tests

#### API Endpoint Tests (450+ test cases)

**Auth Endpoints (45 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /auth/register` | 201 + token | 422 validation, duplicate email | Role escalation attempt |
| `POST /auth/login` | 200 + token | 422 invalid credentials, throttled | Credential stuffing attempt |
| `POST /auth/logout` | 200 | 401 unauthenticated | Token reuse after logout |
| `GET /auth/me` | 200 + user | 401 unauthenticated | |
| `POST /auth/forgot-password` | 200 | 422 invalid email | Timing attack |
| `POST /auth/reset-password` | 200 | 422 invalid token, expired | Token reuse |

**Ride Endpoints (90 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /rides` | 201 + ride | 422 invalid coordinates, missing fields | Fare manipulation, location spoofing |
| `GET /rides` | 200 + paginated | 401 | Cross-tenant access |
| `GET /rides/current` | 200 + active ride | 404 no active ride | |
| `POST /rides/{ride}/cancel` | 200 | 422 wrong status, 403 wrong user | Cancel during payment |
| `POST /rides/{ride}/rate` | 201 | 422 wrong status, 403 wrong user | Double rating |
| `POST /rides/{ride}/driver-accept` | 200 | 422 already accepted | Concurrent accept |
| `POST /rides/{ride}/complete` | 200 | 422 wrong status, 403 | Fare manipulation |
| `POST /rides/fare-estimate` | 200 | 422 invalid coords | Surge bypass |

**Payment Endpoints (80 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /payments/rides/{ride}/pay` | 201 | 422 already paid, wrong status, velocity | Double payment, amount tampering |
| `POST /payments/stripe/create-intent` | 200 | 422 amount mismatch | Amount manipulation |
| `POST /webhooks/stripe` | 200 | 400 invalid signature | Webhook spoofing |
| `POST /payments/{payment}/refund` | 200 | 422 already refunded | Double refund |
| `POST /payments/{payment}/dispute` | 201 | 422 outside window, already disputed | |

**Driver Endpoints (50 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /drivers/toggle-online` | 200 | 422 missing location | Unapproved driver |
| `GET /drivers/nearby-rides` | 200 | 422 no location | Radius manipulation |
| `PUT /drivers/profile` | 200 | 422 invalid data | PII injection |
| `GET /drivers/earnings` | 200 | | Cross-user access |

**Admin Endpoints (60 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `GET /admin/dashboard` | 200 | 403 non-admin | Role escalation |
| `POST /admin/drivers/{id}/approve` | 200 | 422 not a driver | |
| `POST /admin/settings` | 200 | 422 invalid setting | Arbitrary setting creation |
| `GET /admin/audit-logs` | 200 | 403 | Cross-tenant audit access |

**Wallet Endpoints (30 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /wallet/deposit` | 201 | 422 invalid amount | Balance race condition |
| `POST /wallet/withdraw` | 201 | 422 insufficient balance | Concurrent withdrawal |

**Compliance Endpoints (30 cases)**

| Endpoint | Happy Path | Error Paths | Security |
|----------|-----------|-------------|----------|
| `POST /kyc` | 201 | 422 invalid document | File type bypass |
| `POST /data/erasure` | 200 | 422 active ride | Cascade deletion |
| `POST /consent/grant` | 201 | 422 duplicate consent | |
| `POST /sos` | 201 | 422 | SOS spam |

#### Database Transaction Tests

| Test | Scenarios |
|------|-----------|
| Ride creation → driver accept | Concurrent accept race condition (2 drivers) |
| Ride completion → payment → escrow | Double-debit prevention |
| Wallet deposit → ride payment → escrow release | Balance consistency |
| Refund → wallet credit → driver payout deduction | Cascading balance updates |
| Dispute → hold funds → resolution → release | Complex escrow lifecycle |
| Driver payout → wallet debit → bank transfer | Payout failure rollback |

#### Socket Event Tests

| Event | Test Cases |
|-------|------------|
| `ride.requested` | Driver receives with correct data, rider notified of search |
| `ride.accepted` | Rider receives driver info, other drivers lose request |
| `ride.location_update` | Rider sees real-time driver position |
| `ride.arrived` | Rider notified, countdown starts |
| `ride.completed` | Rider sees payment prompt |
| `sos.triggered` | Admin notified, driver location shared |
| `chat.message` | Message delivered to correct ride participant |

#### Authentication/Authorization Tests

| Scenario | Expected Result |
|----------|-----------------|
| Rider hits admin endpoint | 403 Forbidden |
| Driver hits rider-only endpoint | 403 Forbidden |
| Admin hits driver-only endpoint | 403 Forbidden |
| Unauthenticated user hits any endpoint | 401 Unauthorized |
| Expired token | 401 Unauthorized |
| Revoked token | 401 Unauthorized |
| User from Tenant A hits Tenant B data | 403 Forbidden |
| User attempts role escalation via registration | Role defaults to rider |

### 4.4 E2E Tests

#### Rider Journey (15 scenarios)

| # | Journey | Steps | Success Criteria |
|---|---------|-------|-----------------|
| R-1 | Register → Book → Track → Pay → Rate | Full happy path | Ride completed, payment processed, rating saved |
| R-2 | Register with existing email | Attempt duplicate | 422 error, no account created |
| R-3 | Book with promo code | Apply valid promo | Discount applied, correct total |
| R-4 | Book with expired promo | Apply expired code | 422 error, no discount |
| R-5 | Cancel ride (searching) | Cancel immediately | No fee, ride cancelled |
| R-6 | Cancel ride (accepted, <5min) | Cancel after accept | No fee |
| R-7 | Cancel ride (accepted, >5min) | Cancel after accept | Cancellation fee charged |
| R-8 | Rate completed ride | 5-star with comment | Rating saved, driver updated |
| R-9 | Rate non-completed ride | Attempt | 422 error |
| R-10 | Book pool ride | Request pool | Matched with compatible rider |
| R-11 | Pay with wallet | Select wallet | Balance deducted, ride paid |
| R-12 | Pay with insufficient wallet | Select wallet with low balance | 422 error, fallback offered |
| R-13 | Pay with card (Stripe) | Complete Stripe flow | Payment processed |
| R-14 | Trigger SOS during ride | Press SOS | Alert sent, admin notified |
| R-15 | Request fare estimate | Enter pickup/dropoff | Correct estimate with surge |

#### Driver Journey (12 scenarios)

| # | Journey | Steps | Success Criteria |
|---|---------|-------|-----------------|
| D-1 | Register → Go online → Accept → Navigate → Complete → Earn | Full happy path | Ride completed, earnings updated |
| D-2 | Go online without location | Toggle online | 422 or require location |
| D-3 | Accept ride while on ride | Attempt | 422 error |
| D-4 | Complete ride with correct fare | Complete | Fare calculated correctly |
| D-5 | Update vehicle details | Change vehicle | Profile updated |
| D-6 | View earnings | Check earnings | Correct totals |
| D-7 | Go offline after completing ride | Toggle offline | Status updated |
| D-8 | Accept pool ride | Accept pool request | Pool ride accepted |
| D-9 | Mark rider no-show | Arrived, rider missing | No-show fee charged |
| D-10 | Update location during ride | Send GPS updates | Rider sees real-time |
| D-11 | View trip history | Check trips | Correct paginated list |
| D-12 | Register vehicle with invalid plate | Attempt | 422 validation error |

#### Admin Journey (10 scenarios)

| # | Journey | Steps | Success Criteria |
|---|---------|-------|-----------------|
| A-1 | Login → Dashboard → Manage → Approve → Reports | Full happy path | All admin functions work |
| A-2 | Approve driver | Review + approve | Driver can go online |
| A-3 | Reject driver | Review + reject | Driver cannot go online |
| A-4 | Update system settings | Change fare rates | New rates apply |
| A-5 | View audit logs | Check logs | All actions logged |
| A-6 | Process refund | Refund payment | Payment refunded |
| A-7 | Resolve dispute | Review + resolve | Funds released/held |
| A-8 | View revenue report | Check revenue | Correct totals |
| A-9 | Set manual surge | Override surge | Surge applied to zone |
| A-10 | Run data retention cleanup | Execute cleanup | Old data anonymized |

#### Pool Journey (8 scenarios)

| # | Journey | Steps | Success Criteria |
|---|---------|-------|-----------------|
| P-1 | Request pool ride | Select pool option | Pool request created |
| P-2 | Match pool riders | System matches | Compatible riders grouped |
| P-3 | Driver accepts pool | Accept pool ride | All riders assigned |
| P-4 | Pool pickup sequence | First pickup | Correct route |
| P-5 | Pool dropoff | Final dropoff | All riders dropped off |
| P-6 | Pool rider cancels | One rider cancels | Others unaffected |
| P-7 | Pool fare split | Complete ride | Correct per-rider fare |
| P-8 | Pool capacity exceeded | 5th rider requests | Rejected or new pool |

#### Surge Journey (6 scenarios)

| # | Journey | Steps | Success Criteria |
|---|---------|-------|-----------------|
| SG-1 | Normal → Peak → Surge | Demand increases | Surge applied |
| SG-2 | Surge notification | Surge applied | Rider notified |
| SG-3 | Surge cap | Extreme demand | Max 3.0x enforced |
| SG-4 | Surge clear | Demand decreases | Surge returns to 1.0 |
| SG-5 | Manual surge override | Admin sets surge | Applied correctly |
| SG-6 | Surge in fare estimate | Estimate with surge | Surge shown in breakdown |

### 4.5 Load Tests

| Test | Target | Threshold |
|------|--------|-----------|
| Concurrent ride requests | 100 simultaneous | All processed within 5s, 0 errors |
| Peak hour simulation | 500 requests/min for 30min | <1% error rate, <2s p95 latency |
| Socket connection flood | 1000 concurrent connections | All connected, <100ms message delivery |
| Database connection pool | 200 concurrent queries | No connection timeouts |
| Payment processing | 50 concurrent payments | All processed, 0 double-charges |
| Surge calculation | 1000 calculations/min | <50ms per calculation |
| Driver matching | 100 concurrent matches | 0 double-matches (race condition) |
| Cache failure simulation | Redis down for 5min | System degrades gracefully |
| API response time | All endpoints | <200ms p95, <500ms p99 |
| Memory usage | 24hr sustained load | No memory leaks, <2GB RSS |

### 4.6 Security Tests

| Test Category | Specific Tests |
|--------------|----------------|
| **Auth bypass** | Access all endpoints without token, with expired token, with revoked token |
| **Authorization escalation** | Rider → admin, driver → admin, unapproved → approved |
| **SQL injection** | All query parameters, search fields, filter values |
| **XSS** | Chat messages, ride addresses, promo codes, profile names |
| **Command injection** | File upload names, webhook payloads |
| **Rate limiting** | Verify all throttled endpoints, test bypass attempts |
| **Token security** | Token reuse after logout, cross-device usage, no expiry |
| **CSRF** | State-changing endpoints without CSRF protection |
| **SSRF** | Place search, URL parameters |
| **Path traversal** | File downloads (KYC, evidence, receipts) |
| **Business logic** | Negative amounts, zero amounts, maximum amounts |
| **Race conditions** | Concurrent ride accept, concurrent wallet operations |
| **Webhook spoofing** | Fake PayFast/Ozow/Stripe webhooks |

### 4.7 Privacy Tests

| Test | Verification |
|------|-------------|
| PII in logs | Grep all log files for phone, email, name, address patterns |
| PII in error responses | Verify no PII leaked in 4xx/5xx responses |
| Data retention | Verify old data is cleaned up per policy |
| Right to deletion | Verify user data is anonymized/deleted on request |
| Cross-border transfer | Verify data residency requirements |
| Consent tracking | Verify consent is recorded before data collection |
| Encryption at rest | Verify database encryption, file storage encryption |
| Encryption in transit | Verify HTTPS enforcement |
| Access logging | Verify PII access is audited |

---

## PART 5: Test Case Generation

### 5.1 Ride Booking — Solo

#### TC-RIDE-001: Successful solo ride booking
- **Preconditions:** Authenticated rider, valid pickup/dropoff, standard category
- **Steps:**
  1. POST `/rides` with valid pickup/dropoff coordinates, addresses, category="standard", payment_method="wallet"
  2. Verify 201 response with ride object
  3. Verify ride status = "searching"
  4. Verify fare breakdown includes base_fare, distance_fare, time_fare, surge_multiplier, total_fare
  5. Verify rider_id matches authenticated user
  6. Verify tenant_id matches rider's tenant
- **Expected:** Ride created, dispatch event fired
- **Teardown:** Delete ride record

#### TC-RIDE-002: Booking with invalid coordinates
- **Preconditions:** Authenticated rider
- **Steps:**
  1. POST `/rides` with pickup_lat=999 (out of range)
  2. POST `/rides` with pickup_lat="abc" (non-numeric)
  3. POST `/rides` with pickup_lat=0, pickup_lng=0 (null island)
- **Expected:** 422 validation error for all
- **Teardown:** None

#### TC-RIDE-003: Booking with maximum distance
- **Preconditions:** Authenticated rider
- **Steps:**
  1. POST `/rides` with pickup in Cape Town, dropoff in Johannesburg (1400km)
- **Expected:** Should be allowed (no max distance validation exists) — document as gap
- **Teardown:** Delete ride

#### TC-RIDE-004: Booking surge ride
- **Preconditions:** Authenticated rider, surge active in zone
- **Steps:**
  1. POST `/rides/fare-estimate` with coordinates in surged zone
  2. Verify surge_multiplier > 1.0 in response
  3. POST `/rides` with same coordinates
  4. Verify total_fare = (base + distance + time) × surge
- **Expected:** Surge applied correctly
- **Teardown:** Clear surge cache, delete ride

#### TC-RIDE-005: Booking with promo code
- **Preconditions:** Authenticated rider, valid promo code
- **Steps:**
  1. POST `/rides` with promo_code="WELCOME20"
  2. Verify 201 response
  3. POST `/rides/{ride}/apply-promo` with code="WELCOME20"
  4. Verify discount applied
  5. Verify new_total = total_fare - discount
- **Expected:** Promo applied, discount correct
- **Teardown:** Delete ride, promo usage

### 5.2 Ride Booking — Pool

#### TC-POOL-001: Pool ride request
- **Preconditions:** Authenticated rider, pool feature enabled
- **Steps:**
  1. POST `/rides` with category="pool"
  2. Verify pool-specific fields in response
  3. Verify ride enters pool matching queue
- **Expected:** Pool request created
- **Teardown:** Delete pool ride

#### TC-POOL-002: Pool matching — compatible riders
- **Preconditions:** 2 riders requesting pool, similar routes (within 2km)
- **Steps:**
  1. Rider A requests pool ride
  2. Rider B requests pool ride (same direction, within 2km)
  3. System matches riders
  4. Verify both riders assigned to same vehicle
- **Expected:** Riders matched, shared ride created
- **Teardown:** Delete pool ride and associations

#### TC-POOL-003: Pool capacity limit
- **Preconditions:** Pool vehicle at max capacity (3 riders)
- **Steps:**
  1. 3 riders in pool ride
  2. 4th rider requests pool
  3. Verify 4th rider gets separate pool or standard option
- **Expected:** 4th rider not added to full pool
- **Teardown:** Delete all rides

#### TC-POOL-004: Pool fare split
- **Preconditions:** Pool ride with 2 riders, total fare R100
- **Steps:**
  1. Complete pool ride
  2. Verify each rider pays proportional share
  3. Verify rider A pays R45 (shorter distance)
  4. Verify rider B pays R55 (longer distance)
- **Expected:** Fair fare split based on distance
- **Teardown:** Delete rides and payments

### 5.3 Payment Processing

#### TC-PAY-001: Wallet payment
- **Preconditions:** Completed ride, rider wallet with sufficient balance
- **Steps:**
  1. POST `/payments/rides/{ride}/pay` with payment_method="wallet"
  2. Verify 201 response
  3. Verify payment status = "completed"
  4. Verify wallet balance deducted
  5. Verify driver pending_balance credited
- **Expected:** Payment processed, balances correct
- **Teardown:** Reverse wallet transactions

#### TC-PAY-002: Insufficient wallet balance
- **Preconditions:** Completed ride, rider wallet with R10, ride fare R50
- **Steps:**
  1. POST `/payments/rides/{ride}/pay` with payment_method="wallet"
  2. Verify 422 response with insufficient balance message
  3. Verify wallet balance unchanged
- **Expected:** Payment rejected
- **Teardown:** None

#### TC-PAY-003: Cash payment
- **Preconditions:** Completed ride
- **Steps:**
  1. POST `/payments/rides/{ride}/pay` with payment_method="cash"
  2. Verify 201 response
  3. Verify payment status = "completed"
  4. Verify cash_received field tracking
- **Expected:** Cash payment recorded
- **Teardown:** Delete payment

#### TC-PAY-004: Double payment prevention
- **Preconditions:** Completed ride with existing payment
- **Steps:**
  1. POST `/payments/rides/{ride}/pay` (first time) — success
  2. POST `/payments/rides/{ride}/pay` (second time)
  3. Verify 422 "Payment already processed"
- **Expected:** Second payment rejected
- **Teardown:** Delete payments

#### TC-PAY-005: Payment velocity check
- **Preconditions:** User with 5 payments in last hour
- **Steps:**
  1. Create 5 completed payments within 1 hour
  2. Attempt 6th payment
  3. Verify 429 with VELOCITY_COUNT_EXCEEDED
- **Expected:** Rate limited
- **Teardown:** Delete test payments

### 5.4 Surge Pricing

#### TC-SURGE-001: Normal demand — no surge
- **Preconditions:** Zone with 5 drivers, 3 searching rides
- **Steps:**
  1. GET `/rides/fare-estimate` for zone
  2. Verify surge_multiplier = 1.0
- **Expected:** No surge applied
- **Teardown:** None

#### TC-SURGE-002: High demand — surge applied
- **Preconditions:** Zone with 5 drivers, 10 searching rides
- **Steps:**
  1. GET `/rides/fare-estimate` for zone
  2. Verify surge_multiplier > 1.0
  3. Verify total_fare = base × surge
- **Expected:** Surge applied based on demand/supply ratio
- **Teardown:** Clear surge cache

#### TC-SURGE-003: Zero supply — max surge
- **Preconditions:** Zone with 0 online approved drivers
- **Steps:**
  1. GET `/rides/fare-estimate` for zone
  2. Verify surge_multiplier = 3.0 (MAX_SURGE)
- **Expected:** Maximum surge applied
- **Teardown:** Clear surge cache

#### TC-SURGE-004: Surge cap enforcement
- **Preconditions:** Extreme demand ratio (10:1)
- **Steps:**
  1. Create 50 searching rides, 5 drivers
  2. GET `/rides/fare-estimate`
  3. Verify surge_multiplier ≤ 3.0
- **Expected:** Surge capped at 3.0
- **Teardown:** Clear surge cache, delete rides

#### TC-SURGE-005: Surge cache expiry
- **Preconditions:** Surge cached for zone
- **Steps:**
  1. Calculate surge (caches for 300s)
  2. Wait 301 seconds
  3. Demand changes
  4. GET `/rides/fare-estimate`
  5. Verify new surge calculation
- **Expected:** Cache refreshed after TTL
- **Teardown:** Clear cache

### 5.5 Cancellation & No-Show

#### TC-CANCEL-001: Rider cancels (searching)
- **Preconditions:** Ride in "searching" status
- **Steps:**
  1. POST `/rides/{ride}/cancel` with reason="change_of_plan"
  2. Verify 200 response
  3. Verify ride status = "cancelled"
  4. Verify no cancellation fee
- **Expected:** Free cancellation
- **Teardown:** None

#### TC-CANCEL-002: Rider cancels (accepted, <5min)
- **Preconditions:** Ride in "accepted" status, accepted_at < 5min ago
- **Steps:**
  1. POST `/rides/{ride}/cancel`
  2. Verify no cancellation fee
- **Expected:** Free cancellation
- **Teardown:** None

#### TC-CANCEL-003: Rider cancels (accepted, >5min)
- **Preconditions:** Ride in "accepted" status, accepted_at > 5min ago
- **Steps:**
  1. POST `/rides/{ride}/cancel`
  2. Verify cancellation fee applied
  3. Verify fee deducted from refund amount
- **Expected:** Cancellation fee charged
- **Teardown:** Reverse fee

#### TC-CANCEL-004: Driver no-show
- **Preconditions:** Ride in "arrived" status, driver at pickup
- **Steps:**
  1. Wait 5 minutes (configurable)
  2. POST `/rides/{ride}/no-show`
  3. Verify no-show fee charged to rider
  4. Verify ride cancelled
- **Expected:** No-show fee applied
- **Teardown:** Reverse fee

#### TC-CANCEL-005: Cannot cancel in-progress ride
- **Preconditions:** Ride in "in_progress" status
- **Steps:**
  1. POST `/rides/{ride}/cancel`
  2. Verify 422 "Ride cannot be cancelled"
- **Expected:** Cancellation rejected
- **Teardown:** None

### 5.6 SOS/Emergency

#### TC-SOS-001: Trigger SOS during ride
- **Preconditions:** Active ride (in_progress), rider authenticated
- **Steps:**
  1. POST `/sos` with ride_id, latitude, longitude, alert_type="safety_concern"
  2. Verify 201 response with alert_id
  3. Verify alert status = "active"
  4. Verify admin notification sent
  5. Verify cancel_window = 10 seconds
- **Expected:** SOS triggered, admin notified
- **Teardown:** Resolve SOS

#### TC-SOS-002: Cancel SOS within window
- **Preconditions:** Active SOS, within 10-second window
- **Steps:**
  1. Trigger SOS
  2. POST `/sos/{id}/cancel` within 10 seconds
  3. Verify SOS cancelled
- **Expected:** SOS cancelled, no escalation
- **Teardown:** None

#### TC-SOS-003: SOS rate limiting
- **Preconditions:** User with recent SOS trigger
- **Steps:**
  1. Trigger SOS
  2. Immediately trigger another SOS
  3. Verify rate limiting or cooldown
- **Expected:** SOS spam prevented
- **Teardown:** Resolve all SOS

### 5.7 Dispute Resolution

#### TC-DISPUTE-001: Rider disputes payment
- **Preconditions:** Completed ride with payment, within 24-hour window
- **Steps:**
  1. POST `/payments/{payment}/dispute` with reason="wrong_fare", description="..."
  2. Verify 201 response
  3. Verify dispute status = "open"
  4. Verify driver funds held
- **Expected:** Dispute created, funds held
- **Teardown:** Resolve dispute

#### TC-DISPUTE-002: Dispute outside window
- **Preconditions:** Completed ride, 25 hours ago
- **Steps:**
  1. POST `/payments/{payment}/dispute`
  2. Verify 422 "Dispute window has expired"
- **Expected:** Dispute rejected
- **Teardown:** None

#### TC-DISPUTE-003: Duplicate dispute
- **Preconditions:** Existing open dispute for payment
- **Steps:**
  1. POST `/payments/{payment}/dispute`
  2. Verify 422 "A dispute already exists"
- **Expected:** Duplicate prevented
- **Teardown:** None

### 5.8 Wallet & Cash-Out

#### TC-WALLET-001: Wallet deposit via Stripe
- **Preconditions:** Authenticated user
- **Steps:**
  1. POST `/wallet/deposit` with amount=100, payment_method="stripe"
  2. Verify 201 with client_secret
  3. Complete Stripe payment
  4. Verify wallet balance increased by 100
- **Expected:** Wallet credited
- **Teardown:** Reverse wallet credit

#### TC-WALLET-002: Wallet withdrawal
- **Preconditions:** Wallet balance R500
- **Steps:**
  1. POST `/wallet/withdraw` with amount=200
  2. Verify 201 response
  3. Verify withdrawal pending admin approval
  4. Verify wallet balance reduced
- **Expected:** Withdrawal requested
- **Teardown:** Reverse withdrawal

#### TC-WALLET-003: Insufficient withdrawal
- **Preconditions:** Wallet balance R100
- **Steps:**
  1. POST `/wallet/withdraw` with amount=200
  2. Verify 422 insufficient balance
- **Expected:** Withdrawal rejected
- **Teardown:** None

---

## PART 6: Quality Gates

### 6.1 Pre-Production Checklist

| Category | Gate | Threshold | Status |
|----------|------|-----------|--------|
| **Test Coverage** | Backend unit tests | ≥80% line coverage | REQUIRED |
| **Test Coverage** | Backend integration tests | ≥70% endpoint coverage | REQUIRED |
| **Test Coverage** | Mobile unit tests | ≥75% line coverage | REQUIRED |
| **Test Coverage** | E2E critical paths | 100% of critical journeys | REQUIRED |
| **Security** | OWASP Top 10 scan | 0 critical/high findings | REQUIRED |
| **Security** | Dependency audit | 0 critical CVEs | REQUIRED |
| **Security** | SAST scan | 0 high findings | REQUIRED |
| **Performance** | API p95 latency | <200ms | REQUIRED |
| **Performance** | API p99 latency | <500ms | REQUIRED |
| **Performance** | Concurrent load test | 100 users, <1% error | REQUIRED |
| **Performance** | Memory leak test | 24hr, <100MB growth | REQUIRED |
| **Accessibility** | WCAG 2.1 AA | All screens pass | REQUIRED |
| **Accessibility** | Screen reader testing | VoiceOver + TalkBack | REQUIRED |
| **Code Quality** | PHPStan level | Level 8 | REQUIRED |
| **Code Quality** | ESLint | 0 errors | REQUIRED |
| **Code Quality** | Code review | 2 approvals per PR | REQUIRED |
| **Compliance** | POPIA audit | All requirements met | REQUIRED |
| **Compliance** | PCI DSS SAQ | Self-assessment complete | REQUIRED |
| **Deployment** | Docker build | Builds successfully | REQUIRED |
| **Deployment** | Health check | /health returns 200 | REQUIRED |
| **Deployment** | Database migration | All migrations run clean | REQUIRED |
| **Deployment** | Rollback plan | Documented and tested | REQUIRED |

### 6.2 Deployment Checklist

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | All unit tests passing | Dev | ☐ |
| 2 | All integration tests passing | Dev | ☐ |
| 3 | All E2E tests passing | QA | ☐ |
| 4 | Security scan clean | Security | ☐ |
| 5 | Performance benchmarks met | Dev | ☐ |
| 6 | Code review approved | Tech Lead | ☐ |
| 7 | Database backup taken | Ops | ☐ |
| 8 | Migration scripts tested | Dev | ☐ |
| 9 | Environment variables configured | Ops | ☐ |
| 10 | SSL certificates valid | Ops | ☐ |
| 11 | CDN configured | Ops | ☐ |
| 12 | Monitoring dashboards ready | Ops | ☐ |
| 13 | Alert rules configured | Ops | ☐ |
| 14 | Rollback plan documented | Dev | ☐ |
| 15 | Changelog updated | Dev | ☐ |
| 16 | Stakeholders notified | PM | ☐ |

### 6.3 Post-Deployment Monitoring

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| Error rate | >1% for 5min | Investigate, consider rollback |
| API latency p95 | >500ms for 5min | Scale or investigate |
| Payment failure rate | >5% for 10min | Alert finance team |
| SOS alert count | Any increase >200% | Immediate investigation |
| Database connections | >80% pool used | Scale database |
| Queue depth | >1000 jobs | Scale workers |
| Memory usage | >80% sustained | Investigate memory leak |
| Disk usage | >85% | Clean up or scale |

---

## Appendix A: Critical Remediation Priority

### P0 — Must Fix Before Launch

1. **Role escalation in registration** — Remove `role` from registration request
2. **Wallet deposit before gateway confirmation** — Credit only after webhook confirms
3. **Pool ride infrastructure** — Create pool_rides table, pool matching service
4. **Surge in fare estimate** — Apply current surge to fare estimates
5. **CORS configuration** — Lock down to mobile app origins
6. **HTTPS enforcement** — All API traffic must be HTTPS
7. **Token expiry** — Configure Sanctum token expiration
8. **Account lockout** — Implement after 5 failed login attempts
9. **Webhook IP whitelisting** — Restrict to provider IP ranges
10. **Driver approval check on toggleOnline** — Verify `is_approved` before going online

### P1 — Must Fix Before Beta

11. **Cancellation fee logic** — Implement tiered cancellation fees
12. **No-show fee** — Implement driver-arrived, rider-not-present flow
13. **Payment idempotency** — Add idempotency keys to payment processing
14. **Surge notification** — Notify riders when surge applied
15. **Peak hour configuration** — Admin-configurable peak hours
16. **Database indexes** — Add missing indexes for performance
17. **Rate limiting** — Add throttle to all public endpoints
18. **Input validation** — Add max length to all text fields
19. **File upload scanning** — Add virus scanning for KYC documents
20. **POPIA consent enforcement** — Check consent before data collection

### P2 — Must Fix Before Production

21. **Data retention automation** — Scheduled cleanup jobs
22. **Audit trail for PII access** — Log all data access
23. **Anti-fraud detection** — Pattern detection for suspicious behavior
24. **Driver document management** — License, insurance expiry tracking
25. **Multi-stop rides** — Waypoint support
26. **Tip functionality** — Allow riders to tip drivers
27. **Receipt PDF generation** — Per-ride PDF receipts
28. **Push notification reliability** — Retry failed notifications
29. **Offline support improvements** — Better offline queue management
30. **Performance optimization** — Query optimization, eager loading

---

## Appendix B: Recommended Test Framework Setup

### Backend (Laravel)

```php
// phpunit.xml additions
<testsuites>
    <testsuite name="Unit">
        <directory>tests/Unit</directory>
    </testsuite>
    <testsuite name="Integration">
        <directory>tests/Integration</directory>
    </testsuite>
    <testsuite name="Feature">
        <directory>tests/Feature</directory>
    </testsuite>
</testsuites>

// Recommended packages
"require-dev": {
    "pestphp/pest": "^2.0",
    "pestphp/pest-plugin-laravel": "^2.0",
    "pestphp/pest-plugin-filipac": "^1.0",
    "laravel/telescope": "^5.0",
    "laravel/sanctum": "^4.0"
}
```

### Mobile (Expo/React Native)

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:e2e": "detox test"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.0",
    "jest": "^29.0",
    "detox": "^20.0"
  }
}
```

---

*Document generated: 2026-07-01*  
*Audit scope: EasyRyde full-stack ride-hailing system*  
*Target region: Phalaborwa, South Africa*
