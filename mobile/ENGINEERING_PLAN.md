# EasyRyde Driver App — Engineering Production Plan

## 1. API Endpoint Audit

### Existing Endpoints (Shared + Driver-Specific)

| Module | Endpoint | Method | Used by Driver App |
|--------|----------|--------|-------------------|
| **Auth** | `/auth/login` | POST | Yes |
| | `/auth/register` | POST | Yes |
| | `/auth/logout` | POST | Yes |
| | `/auth/me` | GET | Yes |
| | `/auth/forgot-password` | POST | Yes |
| | `/auth/reset-password` | POST | Yes |
| **Rides** | `/rides` (list) | GET | Yes |
| | `/rides/{id}` | GET | Yes |
| | `/rides` (create) | POST | Rider only |
| | `/rides/{id}/cancel` | POST | Partial — no driver-specific endpoint |
| | `/rides/{id}/rate` | POST | Yes |
| | `/rides/{id}/apply-promo` | POST | Rider only |
| | `/rides/current` | GET | Yes |
| | `/rides/fare-estimate` | GET | Rider only |
| | `/rides/{id}/location` | POST | Yes |
| | `/rides/{id}/receipt` | GET | Yes |
| **Drivers** | `/drivers/nearby-rides` | GET | Yes |
| | `/drivers/profile` (PUT) | PUT | Yes |
| | `/drivers/vehicle` | POST | Yes |
| | `/drivers/toggle-online` | POST | Yes |
| | `/drivers/earnings` | GET | Yes |
| | `/drivers/trips` | GET | Yes |
| | `/drivers/location` | POST | Yes |
| | `/drivers` (list) | GET | No |
| | `/drivers/{id}` | GET | No |
| **Payments** | `/payments` | GET | Yes |
| | `/payments/methods` | GET | Yes |
| | `/payments/{id}` | GET | Yes |
| | `/payments/rides/{ride}/pay` | POST | Rider only |
| | `/payments/{id}/refund` | POST | Admin only |
| | `/payments/{id}/dispute` | POST | Yes |
| **Wallet** | `/wallet` | GET | Yes |
| | `/wallet/transactions` | GET | Yes |
| | `/wallet/deposit` | POST | Yes |
| | `/wallet/withdraw` | POST | Yes |
| **Ratings** | `/ratings` | GET | Yes |
| | `/ratings/given` | GET | Yes |
| **Notifications** | `/notifications/` | GET | Yes |
| | `/notifications/unread-count` | GET | Yes |
| | `/notifications/register-token` | POST | Yes |
| **SOS** | `/sos/` | POST | Yes |
| | `/sos/{id}/cancel` | POST | Yes |
| **Chat** | `/chat/rides/{ride}/messages` | GET | Yes |
| | `/chat/rides/{ride}/messages` | POST | Yes |
| | `/chat/rides/{ride}/unread` | GET | Yes |
| | `/chat/rides/{ride}/read` | POST | Yes |
| **Config** | `/config` | GET | Yes |
| **Food** | `/driver/food/orders/available` | GET | Yes |
| | `/driver/food/orders/{order}/accept` | POST | Yes |
| | `/driver/food/orders/{order}/status` | POST | Yes |

### Missing Endpoints (Driver App Needs)

| # | Endpoint | Method | Priority | Purpose |
|---|----------|--------|----------|---------|
| 1 | `/drivers/availability` | GET | **P0** | Driver online status, current queue depth, surge zones |
| 2 | `/drivers/stats` | GET | **P0** | Acceptance rate, cancellation rate, avg rating, on-time % |
| 3 | `/drivers/ride-history` | GET | **P1** | Paginated ride history with filters (date, status) |
| 4 | `/drivers/daily-summary` | GET | **P1** | Daily earnings breakdown, ride count, hours online |
| 5 | `/drivers/documents` | GET/POST | **P1** | Upload/manage vehicle docs (license, insurance, registration) |
| 6 | `/drivers/incentives` | GET | **P2** | Active bonuses, streak rewards, peak hour incentives |
| 7 | `/drivers/shifts` | GET/POST | **P2** | Start/end shift, shift history, scheduled availability |
| 8 | `/drivers/preferences` | GET/PUT | **P2** | Preferred categories, max distance, auto-accept toggle |
| 9 | `/drivers/support` | POST | **P1** | In-app support ticket with ride context |
| 10 | `/drivers/safety/checklist` | GET | **P2** | Pre-trip safety checklist completion |
| 11 | `/rides/{id}/driver-verify` | POST | **P2** | Verify rider identity before trip start |
| 12 | `/drivers/stripe/connect` | POST | **P0** | Stripe Connect onboarding for driver payouts |

### Priority Definitions
- **P0**: Blocking production launch — money/safety critical
- **P1**: Required for production quality — significantly impacts UX
- **P2**: Nice-to-have — improves competitive parity

---

## 2. Socket Event Audit

### Existing Socket Events

**Client → Server (Emitted by Driver App):**
| Event | Data | Used By |
|-------|------|---------|
| `ping` | — | Connection keepalive |
| `driver:location-update` | `{latitude, longitude}` | DashboardScreen (live tracking) |
| `driver:accept-ride` | `{rideId, riderId}` | DashboardScreen (accept flow) |
| `driver:arrived` | `{rideId, riderId}` | ActiveRideScreen (arrival notification) |
| `ride:start` | `{rideId, otherUserId}` | ActiveRideScreen (trip start) |
| `ride:complete` | `{rideId, otherUserId, fare}` | ActiveRideScreen (trip complete) |
| `join:{room}` | — | General room subscription |
| `leave:{room}` | — | General room unsubscription |

**Server → Client (Listened by Driver App):**
| Event | Data | Used By |
|-------|------|---------|
| `pong` | — | Connection confirmation |
| `ride:request` | `{rideId, riderId, category, price, distance, duration, pickup, destination, rider}` | DashboardScreen (new ride) |
| `ride:started` | `{rideId}` | ActiveRideScreen (trip started) |
| `ride:cancelled` | `{rideId}` | ActiveRideScreen (rider cancelled) |

### Missing Socket Events

| # | Event | Direction | Priority | Purpose |
|---|-------|-----------|----------|---------|
| 1 | `ride:status-change` | Server→Client | **P0** | Real-time ride status updates (accepted→arrived→in_progress→completed) |
| 2 | `driver:location-broadcast` | Server→Client | **P0** | Broadcast driver location to rider (and nearby drivers for ETA) |
| 3 | `ride:eta-update` | Server→Client | **P0** | Real-time ETA recalculation as driver approaches |
| 4 | `ride:fare-update` | Server→Client | **P0** | Surge pricing changes, fare adjustments mid-ride |
| 5 | `ride:sos-alert` | Server→Client | **P0** | SOS triggered — broadcast to admin + all relevant parties |
| 6 | `driver:availability-change` | Server→Client | **P1** | Notify rider when driver goes online/offline |
| 7 | `ride:payment-confirmed` | Server→Client | **P0** | Payment processed — driver sees earnings immediately |
| 8 | `chat:message` | Server→Client | **P0** | In-app messaging — real-time chat between rider/driver |
| 9 | `ride:rider-location` | Server→Client | **P1** | Rider's live location shared with driver (walk to pickup) |
| 10 | `driver:ride-queue-update` | Server→Client | **P1** | Notify driver of nearby ride count/surge changes |
| 11 | `ride:promo-applied` | Server→Client | **P1** | Notify driver when rider applies promo (fare adjustment) |
| 12 | `admin:safety-alert` | Server→Client | **P0** | Admin-initiated safety broadcast to drivers in area |
| 13 | `driver:document-expiry` | Server→Client | **P2** | Reminder for expiring documents |
| 14 | `ride:feedback-request` | Server→Client | **P1** | Post-ride rating prompt |
| 15 | `ride:dispute` | Server→Client | **P1** | Fare dispute notification |

---

## 3. Ride State Machine (Backend)

### States

```
SEARCHING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED
    ↓           ↓          ↓           ↓
 CANCELLED   CANCELLED  CANCELLED  CANCELLED
 (rider/     (driver     (driver     (rider
  system)    only)       only)      only)
```

### Transition Rules

| From | To | Trigger | Validator | Side Effects |
|------|----|---------|-----------|--------------|
| **null** | `SEARCHING` | Rider creates ride | `RideCreateRequest` validation, fare estimation, driver availability check | Store ride, calculate fare, dispatch `NewRideRequest` to nearby drivers |
| `SEARCHING` | `ACCEPTED` | Driver accepts | Driver is online, no current ride, ride still searching (DB lock) | Assign driver, set ETA, update driver.current_ride_id, emit `ride:status-change` to rider |
| `SEARCHING` | `CANCELLED` | Rider/system cancels | Cancellation within 2 min = free; after 2 min = fee if driver dispatched | Process refund if paid, emit `ride:cancelled` to driver |
| `ACCEPTED` | `ARRIVED` | Driver marks arrived | Driver is assigned to ride, status is `accepted` | Set `arrived_at`, emit `ride:status-change` to rider |
| `ACCEPTED` | `CANCELLED` | Driver cancels | Driver can cancel with reason; auto-reassign after 30s timeout | Notify rider, re-dispatch to nearby drivers, driver penalty if >2 cancellations/day |
| `ARRIVED` | `IN_PROGRESS` | Driver starts trip | Driver is assigned, status is `arrived`, rider verified (optional) | Set `started_at`, begin location tracking broadcast, emit `ride:started` |
| `ARRIVED` | `CANCELLED` | Driver/rider cancels | Cancellation fee applies (driver arrived) | Process cancellation fee, notify other party |
| `IN_PROGRESS` | `COMPLETED` | Driver completes trip | Driver is assigned, status is `in_progress` | Calculate final fare, process payment, clear driver.current_ride_id, emit `ride:completed`, trigger rating prompt |
| `IN_PROGRESS` | `CANCELLED` | Emergency cancel only | Only via SOS or admin intervention | Freeze fare at current distance, process partial payment, notify all parties |
| `COMPLETED` | (terminal) | — | — | — |
| `CANCELLED` | (terminal) | — | — | — |

### Fare Calculation Logic

```
Base Fare:          Config per category (e.g., R15 for standard)
Distance Fare:      distance_km × per_km_rate
Time Fare:          duration_minutes × per_min_rate
Surge Multiplier:   1.0–3.0× based on supply/demand ratio
Subtotal:           base + distance_fare + time_fare
Promo Discount:     Applied before final calculation
Total Fare:         max(subtotal × surge - discount, minimum_fare)
Platform Fee:       total_fare × 20% (configurable)
Driver Payout:      total_fare - platform_fee
```

**Final Fare Calculation (at ride completion):**
1. Pull actual route distance from GPS tracking
2. Pull actual duration from `started_at` → `completed_at`
3. Apply distance/time rates from category config
4. Apply surge multiplier (locked at ride acceptance time)
5. Apply promo discount
6. Enforce minimum fare
7. Process payment (escrow → release on completion)

### Location Tracking Requirements

| Phase | Interval | Accuracy | Purpose |
|-------|----------|----------|---------|
| `SEARCHING` | No tracking | — | — |
| `ACCEPTED` | Every 10s | High (±10m) | ETA calculation, rider notification |
| `ARRIVED` | Every 30s | Medium (±50m) | Idle tracking, re-assignment readiness |
| `IN_PROGRESS` | Every 5s | High (±5m) | Route adherence, safety monitoring, fare calculation |

### Error Handling

| Error Type | Handling |
|------------|----------|
| **Stale ride (>60s searching)** | Auto-cancel with `no_driver_available` reason, notify rider |
| **Driver offline mid-ride** | Mark as unavailable, re-assign if possible, notify rider |
| **Location gap (>5 min)** | Pause fare calculation, alert admin, warn driver |
| **Payment failure** | Retry 3×, then hold ride in `completed` with `payment_pending` flag |
| **Socket disconnection** | Queue events locally, flush on reconnect (existing logic) |
| **GPS spoofing detection** | Compare reported location vs. cell tower, flag anomalies |
| **Simultaneous state changes** | DB-level `lockForUpdate()` on ride row, optimistic concurrency |

---

## 4. Security Requirements

### 4.1 Authentication Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **Token storage** | Never in AsyncStorage — use SecureStore (iOS) / EncryptedSharedPreferences (Android) | Already using `expo-secure-store` ✅ |
| **Token expiry** | JWT with 1h expiry, refresh token rotation every 30 days | Implement refresh token flow |
| **Biometric auth** | Require biometrics for payment actions and driver availability toggle | `expo-local-authentication` |
| **Session management** | One active session per device, invalidate on logout | Server-side session store |
| **Password policy** | Min 8 chars, 1 uppercase, 1 number, 1 special character | Validate on register + reset |
| **MFA** | TOTP-based 2FA for admin accounts (already exists) | Extend to driver accounts for earnings withdrawal |

### 4.2 API Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **Rate limiting** | Auth: 10/15min, Rides: 5/min, Location: 30/min, General: 100/15min | Laravel `throttle` middleware (partially exists) |
| **Input validation** | Validate ALL inputs at API boundary using Form Requests | Already using Form Requests ✅ |
| **SQL injection** | Parameterized queries only, no raw SQL with user input | Use Eloquent/Query Builder (no raw concat) |
| **CORS** | Restrict to known origins, no wildcard | Config in `config/cors.php` |
| **API versioning** | `/api/v1/` prefix (already exists) | Maintain backward compat, deprecate gracefully |
| **Request signing** | HMAC signature for webhook endpoints | Verify `X-Signature` header from PayFast/Stripe/Ozow |
| **IP allowlisting** | Admin endpoints restricted to office IPs | Optional, for admin panel |

### 4.3 Location Data Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **Encryption at rest** | Encrypt stored location history | AES-256 for location columns |
| **Encryption in transit** | HTTPS/TLS 1.2+ for all API calls | Already using HTTPS in production |
| **Data minimization** | Delete raw GPS tracks after 90 days, keep only ride summaries | Automated cleanup job |
| **Privacy consent** | Explicit consent for location tracking (POPIA compliance) | Already have consent endpoints ✅ |
| **Location accuracy** | Don't expose exact driver home location to riders | Generalize to ±100m when ride is not active |
| **Audit trail** | Log all location access (who, when, why) | Location access audit log |

### 4.4 Payment Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **PCI compliance** | Never store card numbers on server | Use Stripe/PayFast tokenization |
| **Payment escrow** | Hold rider payment in escrow, release to driver on completion | Already has EscrowService ✅ |
| **Fraud detection** | Flag rides with: same rider/driver pair >3x/day, unusual routes, distance/time mismatch | Automated scoring + admin review |
| **Dispute handling** | 7-day dispute window, automated refund for verified issues | DisputeService with escalation |
| **Driver KYC** | Verify driver identity before first payout | KYC endpoints already exist ✅ |
| **Payout security** | Stripe Connect for driver payouts, verify bank details | Bank account verification via micro-deposits |

### 4.5 Socket Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **Authentication** | Socket connection requires valid JWT in `auth` token | Already using `auth: { token }` ✅ |
| **Room management** | Drivers can only join their own ride rooms | Validate room membership server-side |
| **Rate limiting** | Max 30 location updates/min per driver | Server-side throttle on `driver:location-update` |
| **Input validation** | Validate all socket event payloads server-side | Schema validation (Zod/Joi) on socket handlers |
| **Heartbeat** | Detect stale connections, force disconnect after 60s timeout | Already using ping/pong ✅ |
| **Reconnection** | Exponential backoff, max 5 attempts before full reconnect | Already implemented ✅ |
| **Event integrity** | Reject events from wrong role (e.g., rider emitting `driver:accept-ride`) | Server validates user role per event |

### 4.6 OWASP Top 10 Checklist

- [ ] **A01: Broken Access Control** — Every endpoint checks `ride->rider_id` or `ride->driver_id`
- [ ] **A02: Cryptographic Failures** — Tokens in SecureStore, passwords hashed with bcrypt
- [ ] **A03: Injection** — Eloquent parameterized queries, no raw SQL
- [ ] **A04: Insecure Design** — State machine prevents invalid transitions, escrow for payments
- [ ] **A05: Security Misconfiguration** — HTTPS enforced, security headers on nginx
- [ ] **A06: Vulnerable Components** — `npm audit` + `composer audit` in CI
- [ ] **A07: Auth Failures** — Rate limiting on login, password policy, session expiry
- [ ] **A08: Data Integrity Failures** — Signed webhooks, CSRF tokens
- [ ] **A09: Logging Failures** — Audit trail for security events (SOS, refunds, disputes)
- [ ] **A10: SSRF** — No user-supplied URLs in server fetch (places API uses trusted providers)

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Component | Test Type | Coverage Target |
|-----------|-----------|-----------------|
| `FareCalculationService` | Unit | 100% — edge cases: zero distance, max surge, promo combinations |
| `RideMatchingService` | Unit | 100% — concurrent accepts, driver offline, no nearby drivers |
| `PaymentService` | Unit | 100% — escrow, refund, dispute flows |
| `RideStatus` enum | Unit | 100% — all transition validation |
| `SurgePricingService` | Unit | 100% — multiplier bounds, time-of-day rules |
| Location validation | Unit | 100% — GPS spoofing detection, stale data |

### 5.2 Integration Tests

| Test | Scope | Key Assertions |
|------|-------|----------------|
| **Ride creation → matching → completion** | API + DB | End-to-end ride flow, fare accuracy, payment processing |
| **Concurrent ride acceptance** | API + DB + Redis | Only one driver accepts, others get "ride taken" |
| **Driver offline during ride** | API + DB | Ride state preserved, re-assignment triggered |
| **Payment failure recovery** | API + DB | Retry logic, escrow state correct |
| **Socket reconnection** | Socket + API | Event queue flushed, rooms restored |
| **Rate limiting** | API | Auth endpoints throttle correctly |
| **SOS flow** | API + Socket | Alert broadcast, admin acknowledgment |

### 5.3 E2E Tests

| Flow | Steps | Verification |
|------|-------|-------------|
| **Rider books ride** | Login → Set pickup → Set destination → Confirm → Wait for driver → Ride complete → Rate | Fare matches estimate ±10%, receipt generated |
| **Driver accepts ride** | Go online → Receive request → Accept → Navigate to pickup → Arrived → Start trip → Complete | State transitions correct, earnings updated |
| **Rider cancels** | Book ride → Cancel during searching → Verify no charge | Ride status = cancelled, no payment processed |
| **Driver cancels** | Accept ride → Cancel → Verify re-dispatch | Rider notified, ride re-assigned |
| **Payment dispute** | Complete ride → Dispute fare → Admin reviews | Dispute logged, refund if valid |
| **SOS flow** | During ride → Trigger SOS → Admin acknowledges → Ride ends | All parties notified, ride frozen |

### 5.4 Performance Tests

| Scenario | Target | Tool |
|----------|--------|------|
| **Location updates** | 500 concurrent drivers, 1 update/sec each | k6 load tests |
| **Socket connections** | 1000 simultaneous connections | WebSocket load test |
| **Ride matching** | < 2s to find and assign driver | k6 + PostGIS spatial query |
| **Fare calculation** | < 100ms per calculation | Benchmark |
| **API response time** | p95 < 200ms for read, < 500ms for write | k6 |
| **Database queries** | No query > 100ms in production | Query logging + monitoring |

### 5.5 Testing Commands

```bash
# Unit tests
php artisan test --unit

# Feature tests
php artisan test --feature

# Load tests
k6 run tests/Load/ride-flow.js

# Frontend tests
cd mobile && npm test

# E2E tests
cd mobile && npx detox test
```

---

## 6. Implementation Roadmap

### Phase 1: Backend Ride State Machine (2–3 weeks)

**Goal:** Bulletproof ride lifecycle with server-side validation

| Task | Files Touched | Est. |
|------|---------------|------|
| 1.1 Create `RideStateMachine` service with transition validation | `app/Services/RideStateMachine.php` | 2d |
| 1.2 Add `lockForUpdate()` to all state transitions in `RideController` | `RideController.php`, `RideMatchingService.php` | 1d |
| 1.3 Implement cancellation fee logic (2-min grace, driver-arrived fee) | `RideStateMachine.php`, `FareCalculationService.php` | 2d |
| 1.4 Add ride receipt endpoint with PDF generation | `RideController.php`, `ReceiptService.php` | 1d |
| 1.5 Create `ExpireStaleRides` scheduled command (already exists, verify) | `ExpireStaleRides.php` | 0.5d |
| 1.6 Add database indexes for ride queries (status, driver_id, created_at) | Migration file | 0.5d |
| 1.7 Write unit tests for state machine transitions | `tests/Unit/RideStateMachineTest.php` | 2d |
| 1.8 Write integration tests for concurrent ride acceptance | `tests/Feature/RideTest.php` | 1d |

**Checkpoint:** All ride states validated server-side, concurrent accepts handled safely.

### Phase 2: Socket Events + Real-Time Features (2–3 weeks)

**Goal:** Real-time communication between rider, driver, and admin

| Task | Files Touched | Est. |
|------|---------------|------|
| 2.1 Create `SocketEventService` with typed event handlers | `app/Services/SocketEventService.php` | 2d |
| 2.2 Implement `ride:status-change` broadcast on every transition | `RideStateMachine.php`, `SocketEventService.php` | 1d |
| 2.3 Implement `driver:location-broadcast` (throttled, 5s during ride) | `SocketEventService.php`, `DriverController.php` | 1d |
| 2.4 Implement `chat:message` real-time delivery | `ChatController.php`, `SocketEventService.php` | 1.5d |
| 2.5 Implement `ride:payment-confirmed` event | `PaymentService.php`, `SocketEventService.php` | 1d |
| 2.6 Implement `ride:sos-alert` broadcast to admin room | `SosController.php`, `SocketEventService.php` | 1d |
| 2.7 Implement `ride:eta-update` with real-time recalculation | `SocketEventService.php`, `RouteService.php` | 1.5d |
| 2.8 Add socket rate limiting (30 location updates/min) | Socket middleware | 1d |
| 2.9 Write socket integration tests | `tests/Feature/SocketTest.php` | 2d |

**Checkpoint:** Real-time ride tracking, chat, and SOS working end-to-end.

### Phase 3: Security Hardening (1–2 weeks)

**Goal:** Production-grade security for real money and real people

| Task | Files Touched | Est. |
|------|---------------|------|
| 3.1 Implement refresh token rotation | `AuthController.php`, `User` model | 1.5d |
| 3.2 Add biometric auth for payment actions | Driver app, `expo-local-authentication` | 1d |
| 3.3 Implement fraud detection scoring | `app/Services/FraudDetectionService.php` | 2d |
| 3.4 Add location data encryption at rest | Migration, `EncryptsPii` trait | 1d |
| 3.5 Implement 90-day location data cleanup job | `app/Console/Commands/CleanupLocationData.php` | 0.5d |
| 3.6 Add request signing for webhook verification | `PartnerWebhookController.php` | 1d |
| 3.7 Audit all API endpoints for authorization gaps | All controllers | 1d |
| 3.8 Run `npm audit` + `composer audit`, fix critical/high | Package files | 1d |

**Checkpoint:** No critical security vulnerabilities, PCI-compliant payment flow.

### Phase 4: Driver App Improvements (2–3 weeks)

**Goal:** Polished, production-ready driver experience

| Task | Files Touched | Est. |
|------|---------------|------|
| 4.1 Add map view to DashboardScreen (show nearby drivers, surge zones) | `DashboardScreen.tsx` | 2d |
| 4.2 Implement real-time earnings display (live updates via socket) | `DashboardScreen.tsx` | 1d |
| 4.3 Add driver stats screen (acceptance rate, cancellation rate) | New screen + API | 1.5d |
| 4.4 Implement ride history with date filters | New screen + `drivers/ride-history` endpoint | 1.5d |
| 4.5 Add in-app messaging with real-time updates | `ChatScreen.tsx` | 1.5d |
| 4.6 Implement SOS button with confirmation flow | `ActiveRideScreen.tsx` | 1d |
| 4.7 Add navigation integration (deep link to Google Maps/Waze) | `ActiveRideScreen.tsx` | 0.5d |
| 4.8 Implement offline queue for location updates | Already has offline queue ✅ — extend to location | 1d |
| 4.9 Add haptic feedback for ride requests | `DashboardScreen.tsx` | 0.5d |
| 4.10 Implement background location tracking (Android foreground service) | `DashboardScreen.tsx` | 1.5d |

**Checkpoint:** Feature-complete driver app with all P0/P1 features.

### Phase 5: Testing + QA + Deployment (2–3 weeks)

**Goal:** Confidence to go live with real money

| Task | Files Touched | Est. |
|------|---------------|------|
| 5.1 Write E2E tests for full ride flow | `e2e/driver-ride.test.ts` | 3d |
| 5.2 Load test with 500 simulated drivers | `tests/Load/` | 2d |
| 5.3 Security penetration testing | Manual + automated scan | 2d |
| 5.4 Performance profiling (memory, network, battery) | React Native profiling | 2d |
| 5.5 Fix all critical bugs from QA | Various | 3d |
| 5.6 Set up production monitoring (Sentry, error tracking) | Config files | 1d |
| 5.7 Set up log aggregation for socket events | Config files | 1d |
| 5.8 Create deployment runbook | Documentation | 1d |
| 5.9 Staged rollout: 10% → 50% → 100% | App Store / Play Store | 2d |

**Checkpoint:** Production-ready, monitored, staged rollout complete.

### Total Estimate: 9–14 weeks (single developer)

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Backend State Machine | 2–3 weeks | None |
| Phase 2: Socket Events | 2–3 weeks | Phase 1 |
| Phase 3: Security Hardening | 1–2 weeks | Phase 1 |
| Phase 4: Driver App | 2–3 weeks | Phase 2 |
| Phase 5: Testing + Deploy | 2–3 weeks | All phases |

### Parallelization Opportunities

- Phase 2 and Phase 3 can run in parallel (different concerns)
- Phase 4 can start as soon as socket events from Phase 2 are working
- Phase 5 can begin incrementally (unit tests during Phases 1–4)

---

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GPS accuracy in Phalaborwa (rural) | High | Implement cell-tower fallback, allow ±50m tolerance |
| Socket connection drops (load shedding) | High | Offline queue + exponential backoff (already exists) |
| Payment gateway downtime (PayFast/Ozow) | High | Multi-provider fallback (Stripe as backup) |
| Driver app battery drain from GPS | Medium | Adaptive accuracy (High when in-ride, Balanced when idle) |
| Concurrent ride acceptance race condition | High | DB-level locking, optimistic concurrency (already in RideMatchingService) |
| Fraud: fake ride completions | Medium | GPS route validation, distance/time sanity checks |
| Regulatory: POPIA compliance | High | Data retention policy, consent management (already exists) |
| Scaling: 500+ concurrent drivers | Medium | PostGIS spatial indexes, Redis for location cache, horizontal scaling |

---

## 8. Open Questions

1. **Surge pricing algorithm** — Is the current 1.0–3.0× range correct? What's the supply/demand ratio threshold?
2. **Cancellation fee structure** — Should it vary by distance? Time of day?
3. **Driver background check** — Is the existing KYC sufficient, or do we need third-party checks?
4. **Insurance** — Does the driver's personal insurance cover rides, or do we need fleet insurance?
5. **Multi-tenant support** — Should different regions have different fare configs?
6. **Food delivery integration** — How tightly coupled should ride and food delivery be?
7. **Scheduled rides** — How far in advance can riders book? What's the matching window?
