# EasyRyde Enterprise-Grade System Design

**Version:** 2.0.0  
**Date:** 2026-07-01  
**Status:** Authoritative Design Specification  
**Scope:** Production ride-hailing system for Phalaborwa, South Africa  
**Authors:** System Architect & Doc-Engineer  
**Supersedes:** All prior plan documents (01–13, Planner series)

---

## Table of Contents

1. [Part 1: Requirements Expansion](#part-1-requirements-expansion)
2. [Part 2: Data Model Architecture](#part-2-data-model-architecture)
3. [Part 3: Peak Hours & Surge Pricing Design](#part-3-peak-hours--surge-pricing-design)
4. [Part 4: Ride Pooling Design](#part-4-ride-pooling-design)
5. [Part 5: Workflow Simulation](#part-5-workflow-simulation)
6. [Part 6: South African Compliance](#part-6-south-african-compliance)
7. [Part 7: Ops & Monitoring](#part-7-ops--monitoring)

---

# Part 1: Requirements Expansion

## 1.1 Actors

| Actor | Role | Capabilities |
|-------|------|-------------|
| **Rider** | End customer requesting rides | Register, verify phone, book rides (solo/pool), track driver, pay, rate, tip, dispute, SOS, manage payment methods, apply promos, view history |
| **Driver** | Service provider | Register, upload documents, go online/offline, accept/decline rides, navigate, start/complete rides, receive payment, cash out, view earnings, rate riders, SOS, chat with rider |
| **Admin** | Tenant-level administrator | Dashboard, manage users/drivers, approve/suspend drivers, manage rides, settings, reports, disputes, surge pricing, peak hours, promo codes, payouts, reconciliation |
| **Super Admin / Creator** | Platform owner | Manage all tenants, global settings, platform fees, cross-tenant analytics, impersonation, API key management |
| **Dispatcher** | Operations coordinator | Monitor live rides, reassign stuck rides, override driver assignments, manage SOS events |
| **Support Agent** | Customer service | Handle tickets, process refunds, respond to SOS, manage disputes, communicate with riders/drivers |
| **System** | Automated processes | Surge calculation, driver matching, payment processing, webhook handling, scheduled jobs, notifications, data retention cleanup |

## 1.2 Functional Requirements

### FR-001: Authentication & Registration

| ID | Requirement | Priority |
|----|------------|----------|
| FR-001.1 | Rider self-registration via phone number (OTP) or email (password) | P0 |
| FR-001.2 | Driver registration ONLY via admin account creation | P0 |
| FR-001.3 | JWT token issuance with 15-min access + 30-day refresh | P0 |
| FR-001.4 | Phone number verification via SMS OTP (6-digit, 5-min expiry, 3 resend max) | P0 |
| FR-001.5 | Password reset via email link (1-hour expiry, single-use) | P0 |
| FR-001.6 | Account lockout after 5 failed login attempts (30-min lock) | P0 |
| FR-001.7 | Multi-factor authentication for admin accounts (TOTP) | P1 |
| FR-001.8 | Biometric login (fingerprint/face) on mobile apps | P1 |
| FR-001.9 | Session management: max 3 concurrent sessions per user | P1 |

### FR-002: Rider Profile Management

| ID | Requirement | Priority |
|----|------------|----------|
| FR-002.1 | View/edit profile (name, email, phone, profile photo) | P0 |
| FR-002.2 | Manage saved locations (home, work, favorites) | P0 |
| FR-002.3 | Manage payment methods (add/remove cards, wallet) | P0 |
| FR-002.4 | View ride history (paginated, filterable) | P0 |
| FR-002.5 | View receipts with fare breakdown | P0 |
| FR-002.6 | Set default payment method | P1 |
| FR-002.7 | Set preferred language (English, Afrikaans, isiZulu, Sesotho) | P2 |
| FR-002.8 | Emergency contact configuration | P1 |
| FR-002.9 | Account deletion (POPIA right-to-erasure) | P0 |

### FR-003: Ride Booking

| ID | Requirement | Priority |
|----|------------|----------|
| FR-003.1 | Set pickup and dropoff locations via map or search | P0 |
| FR-003.2 | View fare estimate before booking | P0 |
| FR-003.3 | Select ride category (standard, premium, pool, XL) | P0 |
| FR-003.4 | Apply promo code | P0 |
| FR-003.5 | Select payment method (card, cash, wallet) | P0 |
| FR-003.6 | Confirm booking → driver matching initiated | P0 |
| FR-003.7 | Cancel ride within 2 min free, after 2 min with fee | P0 |
| FR-003.8 | Schedule ride for future (up to 7 days) | P1 |
| FR-003.9 | Book ride for another person (guest booking) | P2 |
| FR-003.10 | Share ride status via link | P1 |
| FR-003.11 | Multi-stop rides (up to 3 stops) | P2 |
| FR-003.12 | Request specific vehicle preference | P2 |

### FR-004: Ride Pooling

| ID | Requirement | Priority |
|----|------------|----------|
| FR-004.1 | Rider selects "Pool" category with flexible time window | P0 |
| FR-004.2 | System matches riders with overlapping routes (≤2km deviation) | P0 |
| FR-004.3 | Pool group max 4 passengers | P0 |
| FR-004.5 | Individual pickup/dropoff sequencing | P0 |
| FR-004.6 | Pool discount (20-40% off solo fare) | P0 |
| FR-004.7 | Each rider sees only their portion of the route | P0 |
| FR-004.8 | Rider can cancel pool without affecting others | P1 |
| FR-004.9 | Driver sees optimized pickup/dropoff order | P0 |
| FR-004.10 | Pool matching timeout (5 min → offer solo) | P0 |
| FR-004.11 | Pool status: waiting, matched, picked_up, in_transit, dropped_off | P0 |
| FR-004.12 | Pool fare recalculation if rider drops off early | P1 |

### FR-005: Driver Matching

| ID | Requirement | Priority |
|----|------------|----------|
| FR-005.1 | Match nearest available driver within 5km radius | P0 |
| FR-005.2 | Consider driver rating (≥4.0 required) | P0 |
| FR-005.3 | Consider vehicle category match | P0 |
| FR-005.4 | Broadcast to up to 10 drivers simultaneously | P0 |
| FR-005.5 | 30-second timeout per driver before next | P0 |
| FR-005.6 | Driver accepts → ride confirmed → rider notified | P0 |
| FR-005.7 | Driver declines → auto-forward to next | P0 |
| FR-005.8 | All drivers decline → expand radius by 1km (up to 10km) | P1 |
| FR-005.9 | Surge pricing applied during matching | P0 |
| FR-005.10 | Pool matching: batch riders, optimize route | P0 |

### FR-006: Ride Lifecycle

| ID | Requirement | Priority |
|----|------------|----------|
| FR-006.1 | States: requested → matched → accepted → arrived → in_progress → completed / cancelled | P0 |
| FR-006.2 | Driver navigates to pickup → marks "arrived" | P0 |
| FR-006.3 | 5-min wait timer at pickup (charges apply after 2 min) | P0 |
| FR-006.4 | Driver starts ride → fare calculation begins | P0 |
| FR-006.5 | Real-time GPS tracking during ride | P0 |
| FR-006.6 | Driver completes ride → payment processed | P0 |
| FR-006.7 | Both parties rate each other (1-5 stars + comment) | P0 |
| FR-006.8 | SOS button available throughout ride | P0 |
| FR-006.9 | In-ride chat between rider and driver | P1 |
| FR-006.10 | ETA updates every 10 seconds | P0 |
| FR-006.11 | Automatic ride completion after 24h (timeout) | P1 |
| FR-006.12 | Trip summary with fare breakdown, route, distance, duration | P0 |

### FR-007: Payments

| ID | Requirement | Priority |
|----|------------|----------|
| FR-007.1 | Card payment via PayFast/Ozwo (tokenized, PCI DSS compliant) | P0 |
| FR-007.2 | Cash payment with reconciliation | P0 |
| FR-007.3 | Wallet payment (balance deduction) | P0 |
| FR-007.4 | Escrow hold for 24h post-ride (dispute window) | P1 |
| FR-007.5 | Automatic release to driver after 24h | P1 |
| FR-007.6 | Refund workflow (full/partial) with admin approval | P0 |
| FR-007.7 | Driver payout: daily auto-settlement for earnings > R200 | P0 |
| FR-007.8 | Instant payout option (2% surcharge) | P1 |
| FR-007.9 | Cash reconciliation per driver per day | P0 |
| FR-007.10 | Invoice generation (PDF) with SARS requirements | P1 |
| FR-007.11 | Wallet top-up via card, EFT, bank transfer | P0 |
| FR-007.12 | Webhook signature verification for all payment gateways | P0 |
| FR-007.13 | Idempotent payment processing (duplicate prevention) | P0 |

### FR-008: Surge Pricing & Peak Hours

| ID | Requirement | Priority |
|----|------------|----------|
| FR-008.1 | Configurable peak hour schedules (admin-defined time windows) | P0 |
| FR-008.2 | Real-time demand/supply ratio calculation per zone | P0 |
| FR-008.3 | Dynamic surge multiplier (1.0x – 3.0x configurable max) | P0 |
| FR-008.4 | Rider sees surge multiplier before booking | P0 |
| FR-008.5 | Surge notification to drivers ("Surge active in your area") | P1 |
| FR-008.6 | Pool discount during surge (encourage pooling) | P1 |
| FR-008.7 | Admin manual override for surge | P0 |
| FR-008.8 | Surge pricing caps per ride (max 3x) | P0 |
| FR-008.9 | Surge zone boundaries (geographic polygons) | P1 |
| FR-008.10 | Auto-expire surge after demand normalizes (15-min cooldown) | P1 |
| FR-008.11 | Driver incentive bonus during peak hours | P1 |
| FR-008.12 | Revenue impact reporting for surge periods | P2 |

### FR-009: Wallet & Transactions

| ID | Requirement | Priority |
|----|------------|----------|
| FR-009.1 | View wallet balance | P0 |
| FR-009.2 | View transaction history (paginated, filterable) | P0 |
| FR-009.3 | Wallet top-up via card/EFT | P0 |
| FR-009.4 | Wallet debit for ride payments | P0 |
| FR-009.5 | Wallet credit for refunds, promos, referral bonuses | P0 |
| FR-009.6 | Insufficient balance → block wallet payment, prompt top-up | P0 |
| FR-009.7 | Wallet freeze on suspicious activity | P1 |
| FR-009.8 | Transaction reference linking to rides/payments | P0 |

### FR-010: Ratings & Reviews

| ID | Requirement | Priority |
|----|------------|----------|
| FR-010.1 | Rider rates driver (1-5 stars + optional comment) | P0 |
| FR-010.2 | Driver rates rider (1-5 stars + optional comment) | P0 |
| FR-010.3 | Rating categories: driving, safety, cleanliness, communication | P1 |
| FR-010.4 | Ratings update running average (cannot be edited) | P0 |
| FR-010.5 | Drivers below 4.0 average → automatic review trigger | P1 |
| FR-010.6 | Admin visibility into all ratings | P0 |
| FR-010.7 | Flag inappropriate comments | P1 |

### FR-011: Promo Codes & Referrals

| ID | Requirement | Priority |
|----|------------|----------|
| FR-011.1 | Admin creates promo codes (percentage/fixed, validity, usage limits) | P0 |
| FR-011.2 | Rider applies promo at booking | P0 |
| FR-011.3 | Referral code generation per user | P1 |
| FR-011.4 | Referral bonus: R25 to referrer + R25 to referred after first ride | P1 |
| FR-011.5 | Anti-abuse: max 50 referrals/month per user | P1 |
| FR-011.6 | Promo expiry enforcement | P0 |
| FR-011.7 | One promo per ride | P0 |

### FR-012: Notifications

| ID | Requirement | Priority |
|----|------------|----------|
| FR-012.1 | Push notifications for ride lifecycle events | P0 |
| FR-012.2 | SMS for OTP and critical alerts | P0 |
| FR-012.3 | Email for receipts, account changes | P1 |
| FR-012.4 | In-app notification center | P1 |
| FR-012.5 | Notification preferences per type | P2 |
| FR-012.6 | Notification templates (admin configurable) | P1 |
| FR-012.7 | Rate limiting on notifications (max 5/min per user) | P1 |

### FR-013: Support System

| ID | Requirement | Priority |
|----|------------|----------|
| FR-013.1 | Rider creates support ticket (category, priority, description) | P0 |
| FR-013.2 | Ticket messaging (rider ↔ support agent) | P0 |
| FR-013.3 | Ticket assignment to support agent | P1 |
| FR-013.4 | Ticket status workflow: open → assigned → in_progress → resolved → closed | P0 |
| FR-013.5 | SOS alert escalation to support | P0 |
| FR-013.6 | FAQ management (admin CRUD) | P2 |
| FR-013.7 | Satisfaction rating on ticket closure | P2 |
| FR-013.8 | Ticket priority auto-escalation (urgent after 2h, critical after 1h) | P1 |

### FR-014: SOS / Emergency

| ID | Requirement | Priority |
|----|------------|----------|
| FR-014.1 | SOS button visible during active ride | P0 |
| FR-014.2 | SOS triggers: push to admin, email to emergency contact, SMS to emergency number | P0 |
| FR-014.3 | GPS location captured with SOS | P0 |
| FR-014.4 | 10-second cancel window (false alarm) | P0 |
| FR-014.5 | Admin dashboard SOS panel with map | P0 |
| FR-014.6 | SOS severity levels: low, medium, high, critical | P0 |
| FR-014.7 | Auto-escalation after 5 min if not acknowledged | P1 |

### FR-015: Scheduled Rides

| ID | Requirement | Priority |
|----|------------|----------|
| FR-015.1 | Book ride up to 7 days in advance | P1 |
| FR-015.2 | Recurring ride schedules (daily, weekly) | P2 |
| FR-015.3 | Auto-dispatch 30 min before scheduled time | P1 |
| FR-015.4 | No driver found → notify rider, offer fare increase | P1 |
| FR-015.5 | 15-min no-driver → auto-cancel with R15 credit | P1 |
| FR-015.6 | Modify/cancel scheduled ride (up to 30 min before) | P1 |

## 1.3 Nonfunctional Requirements

### NFR-001: Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | < 200ms | Exclude external calls (Google Maps, payment gateways) |
| API response time (p99) | < 500ms | Exclude external calls |
| WebSocket message latency | < 100ms | Driver location → rider display |
| Ride request → driver notification | < 500ms | End-to-end |
| Driver matching time | < 5s | From ride request to driver acceptance offer |
| Database query time (p95) | < 50ms | With proper indexing |
| Payment webhook processing | < 2s | Receipt to wallet credit |
| Concurrent ride requests | 100/s | Per region |
| Concurrent WebSocket connections | 10,000 | Per socket server instance |
| Mobile app cold start | < 3s | To interactive state |
| Page load (admin web) | < 2s | First contentful paint |

### NFR-002: Scalability

| Dimension | Target | Strategy |
|-----------|--------|----------|
| Users | 100,000 registered | Horizontal scaling of API + socket servers |
| Concurrent active rides | 5,000 | Shard by tenant/region |
| Daily rides | 50,000 | Database partitioning by month |
| Data retention | 5+ years | Archival to cold storage |
| Geographic expansion | Multi-region | Tenant-based isolation |

### NFR-003: Availability

| Metric | Target |
|--------|--------|
| System uptime | 99.9% (8.76h downtime/year) |
| Planned maintenance window | Sunday 02:00–04:00 SAST |
| Recovery Time Objective (RTO) | < 1 hour |
| Recovery Point Objective (RPO) | < 5 minutes |
| Failover time | < 30 seconds |
| Health check interval | 10 seconds |

### NFR-004: Security

| Requirement | Specification |
|-------------|--------------|
| Transport encryption | TLS 1.3 for all HTTP/WS connections |
| Data at rest encryption | AES-256 for PII fields (email, phone, ID numbers) |
| Authentication | JWT with short-lived access tokens (15 min) + refresh tokens (30 days) |
| Authorization | Role-based (RBAC) via Spatie Laravel Permissions |
| Password hashing | bcrypt with 12 rounds |
| API rate limiting | 30/min public, 60/min authenticated, 120/min driver location |
| Input validation | Server-side validation on all endpoints |
| SQL injection prevention | Parameterized queries (Eloquent ORM) |
| XSS prevention | Output encoding, CSP headers |
| CORS policy | Whitelist origins, restrict methods |
| Webhook verification | HMAC signature + IP allowlisting |
| Account lockout | 5 failed attempts → 30-min lock |
| Admin MFA | TOTP-based multi-factor |

## 1.4 POPIA Regulatory Requirements

| Requirement | Implementation |
|-------------|---------------|
| Lawful basis for processing | Consent at registration (terms of service, privacy policy) |
| Purpose limitation | Data used only for ride-hailing service delivery |
| Data minimization | Collect only required fields (name, phone, email) |
| Accuracy | User can edit profile; admin can correct |
| Storage limitation | Configurable retention per entity (see §1.6) |
| Data integrity | Checksums on documents, audit logs on mutations |
| Right to access | `GET /api/v1/compliance/data-export` returns JSON of all user data |
| Right to deletion | `POST /api/v1/compliance/delete-account` → anonymization within 30 days |
| Right to rectification | `POST /api/v1/compliance/rectify` → update inaccurate data |
| Right to object | Withdraw consent for marketing, location tracking |
| Cross-border transfer | No data leaves South Africa (hosting in ZA region) |
| Data breach notification | Within 72 hours to Information Regulator |
| Information Officer | Registered with Information Regulator (admin accountability) |
| Consent records | Immutable audit trail of all consent grants/withdrawals |

## 1.5 PCI DSS Requirements

| Requirement | Implementation |
|-------------|---------------|
| Card data tokenization | Never store raw card numbers; use PayFast/Ozwo tokens |
| SA Payment Association compliance | PCI DSS Level 4 (SAQ-A or SAQ-A-EP) |
| Secure transmission | TLS 1.3 for all card data in transit |
| Access restriction | Payment endpoints restricted to authenticated users only |
| Audit logging | All payment events logged with gateway reference |
| Webhook verification | HMAC signature verification on all payment webhooks |
| Data isolation | Payment data in separate `payments` table, gateway responses in JSONB |
| No card data in logs | PII masking in structured logging (card last-4 only) |
| Quarterly scan | ASV scan quarterly, annual SAQ completion |
| Incident response | Documented procedure for payment data breaches |

## 1.6 Data Retention Requirements

| Entity | Retention Period | Deletion Method | Legal Basis |
|--------|-----------------|-----------------|-------------|
| User accounts | Duration of account + 1 year | Anonymize | POPIA + SARS |
| Ride records | 5 years from completion | Archive then delete | SARS tax records |
| Payment records | 5 years from transaction | Archive then delete | SARS + PCI DSS |
| Audit logs | 3 years | Archive to cold storage | POPIA audit |
| Driver documents | Duration of employment + 2 years | Secure delete | National Transport Act |
| Location data | 90 days | Delete | POPIA data minimization |
| Chat messages | 30 days after ride completion | Delete | POPIA data minimization |
| Notification logs | 90 days | Delete | Not needed beyond 90 days |
| Support tickets | 2 years after resolution | Anonymize | Service quality |
| SOS alerts | 5 years | Archive | Legal requirement |
| Webhook events | 90 days | Delete | Operational only |
| Marketing consent | Until withdrawn + 1 year | Delete | POPIA consent |

## 1.7 Security Requirements

### Authentication
- JWT access tokens: 15-minute expiry, stored in memory only
- Refresh tokens: 30-day expiry, stored in httpOnly secure cookie (web) or secure storage (mobile)
- Token rotation on refresh (old token invalidated)
- Device binding: refresh token tied to device ID
- Single sign-out: invalidate all tokens for user

### Authorization (RBAC)
| Role | Permissions |
|------|------------|
| Rider | Book rides, manage profile, wallet, payment methods, view history |
| Driver | Accept rides, update location, view earnings, manage profile |
| Admin | Manage users, drivers, rides, settings, pricing, reports, disputes |
| Super Admin | All admin permissions + tenant management, global settings |
| Dispatcher | Monitor rides, reassign, manage SOS |
| Support Agent | Handle tickets, process refunds, view ride details |

### Encryption
- PII at rest: AES-256-GCM (email, phone, ID numbers, document numbers)
- Document storage: encrypted at rest in object storage
- Passwords: bcrypt with 12-round salt
- API keys: SHA-256 hash stored, prefix stored for identification

### Rate Limiting
| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Public (login, register, forgot-password) | 30 requests | 1 minute |
| Authenticated (general) | 60 requests | 1 minute |
| Driver location updates | 120 requests | 1 minute |
| Admin reports | 30 requests | 1 minute |
| Payment webhooks | 100 requests | 1 minute (IP-restricted) |
| Global per IP | 200 requests | 1 minute |

## 1.8 Audit Requirements

Every mutation to critical data MUST be logged with:

```sql
-- audit_logs table captures ALL critical events
actor_id       UUID       -- who did it
actor_role     VARCHAR    -- role at time of action
action         VARCHAR    -- create/update/delete/approve/reject/login/logout
resource_type  VARCHAR    -- user/ride/payment/driver/setting/pricing
resource_id    VARCHAR    -- UUID of affected entity
old_values     JSONB      -- previous state (for updates)
new_values     JSONB      -- new state (for creates/updates)
ip_address     VARCHAR    -- source IP
user_agent     TEXT       -- client identifier
trace_id       VARCHAR    -- distributed trace correlation
severity       VARCHAR    -- info/warning/error/critical
created_at     TIMESTAMPTZ -- immutable timestamp
```

**Events that MUST be audited (non-exhaustive):**
- User login/logout (success and failure)
- Password changes and reset requests
- Profile changes (name, email, phone)
- Driver approval/rejection/suspension
- Ride creation/completion/cancellation
- Payment processing (success, failure, refund)
- Settings changes (pricing, surge, platform fees)
- Promo code CRUD
- Admin user management (suspend, impersonate)
- API key creation/revocation
- SOS alert trigger/acknowledge/resolve
- Dispute creation/resolution
- Webhook failures
- Driver payout processing

**Immutability:** Audit logs are INSERT-only. No UPDATE or DELETE allowed on `audit_logs` table. Enforced via PostgreSQL trigger.

## 1.9 Business Rules

### Peak Hours (Phalaborwa)
| Period | Days | Time | Description |
|--------|------|------|-------------|
| Morning Rush | Mon–Fri | 06:00–09:00 | Commute to work/school |
| Evening Rush | Mon–Fri | 16:00–19:00 | Return commute |
| Weekend Night | Fri–Sat | 21:00–02:00 | Entertainment/social |
| Holiday | Public holidays | All day | Surge +1.5x minimum |

### Surge Pricing Rules
| Rule | Value |
|------|-------|
| Minimum multiplier | 1.0x (no surge) |
| Maximum multiplier | 3.0x (admin-configurable, hard cap) |
| Demand/supply threshold | > 0.7 requests per online driver triggers surge |
| Surge increment | 0.1x per 0.1 ratio above threshold |
| Cooldown | 15 minutes after demand normalizes before surge drops |
| Rider notification | Surge multiplier shown on fare estimate screen |
| Pool discount during surge | Additional 10-20% off pool rides to encourage sharing |

### Cancellation Fees
| Scenario | Fee | Notes |
|----------|-----|-------|
| Rider cancels within 2 min of booking | Free | No charge |
| Rider cancels after 2 min (driver not arrived) | R15 or 50% of estimated fare | Whichever is lower |
| Rider cancels after driver arrives | R25 or 75% of estimated fare | Whichever is lower |
| Driver cancels (no valid reason) | R0 to rider, driver penalized | 3 cancels → review |
| Driver no-show (5+ min late) | Full refund to rider | Driver penalty |
| System timeout (5 min, no driver) | Auto-cancel, no fee | R15 credit to rider |

### Pool Matching Rules
| Rule | Value |
|------|-------|
| Maximum route deviation | 2 km from direct route |
| Maximum pool size | 4 passengers |
| Matching window | 5 minutes (configurable) |
| Time flexibility | ±15 minutes from requested pickup |
| Discount vs solo | 20-40% (based on route overlap) |
| Cancellation by one rider | Others continue; fare recalculated |
| Driver capacity check | Must have available seats for pool |

### No-Show Rules
| Scenario | Action |
|----------|--------|
| Driver arrives, rider not there after 2 min | Charge R15 waiting fee |
| Driver arrives, rider not there after 5 min | Auto-cancel, charge 75% fare |
| Scheduled ride, driver not assigned 5 min after window | Auto-cancel, R15 credit to rider |

## 1.10 Edge Cases & Failure Modes

| Edge Case | Handling |
|-----------|----------|
| Driver goes offline mid-ride | Mark ride as "driver_disconnected", notify admin, allow rider to call emergency |
| Network loss (rider app) | Offline mode: cache last state, queue ride status, reconnect → sync |
| Network loss (driver app) | Keep ride active for 5 min, then auto-pause, notify admin |
| Payment failure mid-ride | Ride continues, payment retried 3x, then flag for manual resolution |
| GPS loss | Use last known location, show "location unavailable", allow manual address entry |
| Double booking (driver accepts 2 rides) | System prevents: only 1 active ride per driver |
| Wallet negative (race condition) | Database-level `balance >= 0` constraint with `SELECT FOR UPDATE` |
| Driver rating < 4.0 | Auto-flag for review, cannot receive new rides until resolved |
| SOS during pool ride | Notify all riders, all drivers, admin; provide all pickup locations |
| Surge pricing during pool | Pool gets base discount + surge applies to discounted fare |
| Payment gateway downtime | Force wallet/cash only, notify admin, queue for retry |
| Database connection exhaustion | PgBouncer pool + retry with exponential backoff |
| Redis failure | Cache miss → direct DB query (graceful degradation) |
| Google Maps API failure | Fallback: straight-line distance × 1.3 estimate |
| Concurrent surge calculation | Redis distributed lock per zone (SETNX with TTL) |
| Ride timeout (24h) | Auto-complete, force payment, flag for admin review |

---

# Part 2: Data Model Architecture

## 2.0 Conventions

- **Primary keys:** UUID (v4) on all tables
- **Timestamps:** `created_at` / `updated_at` with timezone (TIMESTAMPTZ)
- **Soft deletes:** `deleted_at` column where noted
- **Multi-tenancy:** `tenant_id` FK on all tenant-scoped tables
- **Monetary values:** `DECIMAL(16, 2)` in ZAR
- **Coordinates:** `DECIMAL(10, 7)` with PostGIS spatial columns
- **PII fields:** Marked with 🔒 — encrypted at rest (AES-256-GCM)
- **Audit fields:** `created_at`, `updated_at`, `deleted_at`, `created_by` (where applicable)

## 2.1 `tenants`

| Column | Type | Constraints | PII | Notes |
|--------|------|-------------|-----|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | | |
| name | VARCHAR(255) | NOT NULL | | |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | | URL-safe identifier |
| domain | VARCHAR(255) | UNIQUE, nullable | | Custom domain |
| region | VARCHAR(100) | NOT NULL | | e.g., "Phalaborwa" |
| currency | VARCHAR(3) | DEFAULT 'ZAR' | | ISO 4217 |
| is_active | BOOLEAN | DEFAULT true | | |
| settings | JSONB | DEFAULT '{}' | | Tenant-specific config |
| max_surge_multiplier | DECIMAL(3,2) | DEFAULT 3.00 | | Hard cap on surge |
| platform_fee_percent | DECIMAL(5,2) | DEFAULT 15.00 | | Commission percentage |
| min_platform_fee | DECIMAL(10,2) | DEFAULT 5.00 | | Floor fee |
| max_platform_fee | DECIMAL(10,2) | DEFAULT 50.00 | | Cap fee |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | |

**Indexes:** `slug` (unique), `region`

## 2.2 `users`

| Column | Type | Constraints | PII | Encryption | Retention | Notes |
|--------|------|-------------|-----|------------|-----------|-------|
| id | UUID | PK | | | | |
| tenant_id | UUID | FK → tenants.id, nullable | | | | NULL for super-admin |
| name | VARCHAR(255) | NOT NULL | 🔒 | AES-256-GCM | Account + 1yr | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 🔒 | AES-256-GCM | Account + 1yr | Encrypted at rest |
| phone_number | VARCHAR(20) | UNIQUE, nullable | 🔒 | AES-256-GCM | Account + 1yr | Encrypted, E.164 format |
| password | VARCHAR(255) | NOT NULL | | bcrypt(12) | | Hashed, never stored plain |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'rider' | | | | rider/driver/admin/super-admin/dispatcher/support |
| is_active | BOOLEAN | DEFAULT true | | | | |
| is_online | BOOLEAN | DEFAULT false | | | | Drivers only |
| is_approved | BOOLEAN | DEFAULT false | | | | Drivers: admin approval |
| is_kyc_verified | BOOLEAN | DEFAULT false | | | | |
| is_anonymized | BOOLEAN | DEFAULT false | | | | POPIA deletion flag |
| email_verified_at | TIMESTAMPTZ | nullable | | | | |
| kyc_verified_at | TIMESTAMPTZ | nullable | | | | |
| current_latitude | DECIMAL(10,7) | nullable | | | | Last known GPS |
| current_longitude | DECIMAL(10,7) | nullable | | | | Last known GPS |
| last_location_update | TIMESTAMPTZ | nullable | | | | |
| current_ride_id | UUID | FK → rides.id, nullable | | | | Active ride reference |
| emergency_contact_name | VARCHAR(255) | nullable | 🔒 | AES-256-GCM | Account + 1yr | |
| emergency_contact_phone | VARCHAR(20) | nullable | 🔒 | AES-256-GCM | Account + 1yr | |
| last_login_at | TIMESTAMPTZ | nullable | | | | Security audit |
| last_activity_at | TIMESTAMPTZ | nullable | | | | Presence tracking |
| failed_login_attempts | INTEGER | DEFAULT 0 | | | | Brute force protection |
| locked_until | TIMESTAMPTZ | nullable | | | | Account lockout |
| anonymized_at | TIMESTAMPTZ | nullable | | | | When data was anonymized |
| remember_token | VARCHAR(100) | nullable | | | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | | | |
| deleted_at | TIMESTAMPTZ | nullable | | | | Soft delete |

**Indexes:**
- `idx_users_email` on `(email)` — login lookup
- `idx_users_phone` on `(phone_number)` — login lookup
- `idx_users_tenant_role_active` on `(tenant_id, role, is_active)` — admin queries
- `idx_users_driver_discovery` on `(role, is_online, is_approved, tenant_id)` — driver matching
- `idx_users_location` on `(current_latitude, current_longitude)` — spatial

**Relationships:**
- `belongsTo` Tenant
- `hasOne` DriverProfile
- `hasOne` Vehicle
- `hasOne` Wallet
- `hasMany` Ride (as rider)
- `hasMany` Ride (as driver)
- `hasMany` Payment
- `hasMany` ConsentRecord
- `hasMany` KycVerification
- `hasMany` SosAlert
- `hasOne` ReferralCode

## 2.3 `driver_profiles`

| Column | Type | Constraints | PII | Notes |
|--------|------|-------------|-----|-------|
| id | UUID | PK | | |
| user_id | UUID | UNIQUE, FK → users.id | | One profile per driver |
| license_number | VARCHAR(100) | nullable | 🔒 | SA driver's license number |
| license_expiry | DATE | nullable | | |
| id_number | VARCHAR(50) | nullable | 🔒 | SA ID number (encrypted) |
| date_of_birth | DATE | nullable | 🔒 | |
| background_check_status | VARCHAR(20) | DEFAULT 'pending' | | pending/cleared/failed |
| background_check_at | TIMESTAMPTZ | nullable | | |
| total_trips | INTEGER | DEFAULT 0 | | Denormalized counter |
| total_earnings | DECIMAL(16,2) | DEFAULT 0.00 | | Denormalized sum |
| rating_sum | DECIMAL(6,2) | DEFAULT 0.00 | | For running average |
| rating_count | INTEGER | DEFAULT 0 | | |
| average_rating | DECIMAL(3,2) | DEFAULT 0.00 | | Computed from sum/count |
| is_verified | BOOLEAN | DEFAULT false | | Documents verified |
| is_approved | BOOLEAN | DEFAULT false | | Admin approved |
| approved_by | UUID | FK → users.id, nullable | | Admin who approved |
| approved_at | TIMESTAMPTZ | nullable | | |
| rejection_reason | TEXT | nullable | | If rejected |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | |

**Indexes:** `user_id` (unique), `is_approved`, `average_rating`

## 2.4 `vehicles`

| Column | Type | Constraints | PII | Notes |
|--------|------|-------------|-----|-------|
| id | UUID | PK | | |
| user_id | UUID | UNIQUE, FK → users.id | | One vehicle per driver |
| make | VARCHAR(50) | NOT NULL | | e.g., "Toyota" |
| model | VARCHAR(50) | NOT NULL | | e.g., "Corolla" |
| year | INTEGER | NOT NULL | | 2010–2026 |
| color | VARCHAR(30) | NOT NULL | | |
| license_plate | VARCHAR(20) | UNIQUE, NOT NULL | | SA format: e.g., "GP 123-456" |
| category | VARCHAR(20) | DEFAULT 'standard' | | standard/premium/luxury/xl |
| seating_capacity | INTEGER | DEFAULT 4 | | For pool matching |
| insurance_provider | VARCHAR(100) | nullable | | |
| insurance_policy_number | VARCHAR(50) | nullable | 🔒 | |
| insurance_expiry | DATE | nullable | | |
| registration_expiry | DATE | nullable | | Vehicle fitness certificate |
| last_inspection_at | TIMESTAMPTZ | nullable | | |
| is_active | BOOLEAN | DEFAULT true | | |
| photo_url | VARCHAR(500) | nullable | | Vehicle photo |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | |

**Indexes:** `user_id` (unique), `license_plate` (unique), `(category, is_active)`

## 2.5 `rides`

| Column | Type | Constraints | PII | Notes |
|--------|------|-------------|-----|-------|
| id | UUID | PK | | |
| tenant_id | UUID | FK → tenants.id, nullable | | |
| rider_id | UUID | FK → users.id, NOT NULL | | |
| driver_id | UUID | FK → users.id, nullable | | Until accepted |
| pickup_latitude | DECIMAL(10,7) | NOT NULL | | |
| pickup_longitude | DECIMAL(10,7) | NOT NULL | | |
| dropoff_latitude | DECIMAL(10,7) | NOT NULL | | |
| dropoff_longitude | DECIMAL(10,7) | NOT NULL | | |
| pickup_address | TEXT | NOT NULL | | |
| dropoff_address | TEXT | NOT NULL | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | | See state machine |
| category | VARCHAR(20) | DEFAULT 'standard' | | standard/premium/luxury/xl/pool |
| is_pool | BOOLEAN | DEFAULT false | | Pool ride flag |
| pool_group_id | UUID | FK → pool_groups.id, nullable | | |
| distance_km | DECIMAL(8,3) | nullable | | Actual route distance |
| duration_minutes | DECIMAL(5,1) | nullable | | Actual ride duration |
| estimated_distance_km | DECIMAL(8,3) | nullable | | Pre-ride estimate |
| estimated_duration_min | DECIMAL(5,1) | nullable | | Pre-ride estimate |
| base_fare | DECIMAL(16,2) | nullable | | |
| per_km_fare | DECIMAL(16,2) | nullable | | |
| per_min_fare | DECIMAL(16,2) | nullable | | |
| surge_multiplier | DECIMAL(4,2) | DEFAULT 1.00 | | |
| discount_amount | DECIMAL(16,2) | DEFAULT 0.00 | | Promo discount |
| total_fare | DECIMAL(16,2) | nullable | | Final amount |
| estimated_fare | DECIMAL(16,2) | nullable | | For comparison audit |
| platform_fee | DECIMAL(16,2) | nullable | | |
| driver_earnings | DECIMAL(16,2) | nullable | | |
| payment_method | VARCHAR(20) | DEFAULT 'card' | | card/cash/wallet |
| payment_status | VARCHAR(20) | DEFAULT 'pending' | | pending/completed/refunded/failed |
| cancellation_reason | TEXT | nullable | | |
| cancelled_by | VARCHAR(36) | nullable | | User UUID or 'system' |
| cancelled_at | TIMESTAMPTZ | nullable | | |
| waiting_time_minutes | DECIMAL(5,1) | DEFAULT 0 | | Time at pickup |
| route_polyline | TEXT | nullable | | Encoded polyline |
| route_distance_km | DECIMAL(8,3) | nullable | | Route vs straight-line |
| driver_eta | INTEGER | nullable | | Seconds to pickup |
| started_at | TIMESTAMPTZ | nullable | | |
| completed_at | TIMESTAMPTZ | nullable | | |
| rider_rating | SMALLINT | CHECK (1–5), nullable | | |
| driver_rating | SMALLINT | CHECK (1–5), nullable | | |
| rider_comment | TEXT | nullable | | |
| driver_comment | TEXT | nullable | | |
| pickup_location | GEOGRAPHY(Point, 4326) | | | PostGIS computed column |
| dropoff_location | GEOGRAPHY(Point, 4326) | | | PostGIS computed column |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | |

**Ride State Machine:**
```
pending → accepted → driver_arrived → in_progress → completed
   ↓         ↓            ↓               ↓
 cancelled  cancelled    cancelled       cancelled
   ↓
 timeout (auto-cancel after 5 min if no driver)
```

**Indexes:**
- `idx_rides_status_created` on `(status, created_at)` — pending ride queries
- `idx_rides_rider` on `(rider_id, status)` — rider's rides
- `idx_rides_driver` on `(driver_id, status)` — driver's rides
- `idx_rides_tenant` on `(tenant_id, status)` — admin ride list
- `idx_rides_pickup` GIST on `pickup_location` — PostGIS spatial
- `idx_rides_dropoff` GIST on `dropoff_location` — PostGIS spatial

## 2.6 `ride_requests` (for Pool Matching)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, NOT NULL | The individual ride |
| rider_id | UUID | FK → users.id, NOT NULL | |
| pickup_latitude | DECIMAL(10,7) | NOT NULL | |
| pickup_longitude | DECIMAL(10,7) | NOT NULL | |
| dropoff_latitude | DECIMAL(10,7) | NOT NULL | |
| dropoff_longitude | DECIMAL(10,7) | NOT NULL | |
| pickup_window_start | TIMESTAMPTZ | NOT NULL | Earliest pickup time |
| pickup_window_end | TIMESTAMPTZ | NOT NULL | Latest pickup time |
| max_deviation_km | DECIMAL(5,2) | DEFAULT 2.00 | Max route detour |
| flexible_time_min | INTEGER | DEFAULT 15 | Time flexibility |
| pool_status | VARCHAR(20) | DEFAULT 'searching' | searching/matched/cancelled/expired |
| pool_group_id | UUID | FK → pool_groups.id, nullable | |
| matched_at | TIMESTAMPTZ | nullable | |
| expires_at | TIMESTAMPTZ | NOT NULL | Auto-expire if no match |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `pool_status`, `(pickup_location) GIST`, `(pickup_window_start, pickup_window_end)`

## 2.7 `pool_groups`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| driver_id | UUID | FK → users.id, nullable | Assigned driver |
| vehicle_id | UUID | FK → vehicles.id, nullable | |
| status | VARCHAR(20) | DEFAULT 'forming' | forming/in_progress/completed/cancelled |
| max_passengers | INTEGER | DEFAULT 4 | |
| current_passengers | INTEGER | DEFAULT 0 | |
| route_polyline | TEXT | nullable | Optimized combined route |
| total_distance_km | DECIMAL(8,3) | nullable | Combined route distance |
| estimated_duration_min | DECIMAL(5,1) | nullable | |
| pickup_order | JSONB | nullable | Ordered list of pickup stops |
| dropoff_order | JSONB | nullable | Ordered list of dropoff stops |
| started_at | TIMESTAMPTZ | nullable | |
| completed_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.8 `route`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, nullable | |
| pool_group_id | UUID | FK → pool_groups.id, nullable | |
| encoded_polyline | TEXT | NOT NULL | Google polyline |
| distance_km | DECIMAL(8,3) | NOT NULL | |
| duration_seconds | INTEGER | NOT NULL | |
| waypoints | JSONB | nullable | Array of {lat, lng, address} |
| distance_matrix | JSONB | nullable | Pairwise distances for pool |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.9 `locations` (Driver GPS)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| driver_id | UUID | FK → users.id, NOT NULL | |
| ride_id | UUID | FK → rides.id, nullable | Active ride |
| latitude | DECIMAL(10,7) | NOT NULL | |
| longitude | DECIMAL(10,7) | NOT NULL | |
| heading | DECIMAL(5,2) | nullable | 0–360 degrees |
| speed_kmh | DECIMAL(5,2) | nullable | |
| accuracy_meters | DECIMAL(6,2) | nullable | GPS accuracy |
| location_point | GEOGRAPHY(Point, 4326) | | PostGIS spatial |
| recorded_at | TIMESTAMPTZ | NOT NULL | Device timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Retention:** 90 days, then delete.

**Indexes:** `idx_locations_driver_time` on `(driver_id, recorded_at)`, `idx_locations_point` GIST on `location_point`

## 2.10 `payments`

| Column | Type | Constraints | PII | Notes |
|--------|------|-------------|-----|-------|
| id | UUID | PK | | |
| tenant_id | UUID | FK → tenants.id, nullable | | |
| ride_id | UUID | FK → rides.id, nullable | | |
| pool_group_id | UUID | FK → pool_groups.id, nullable | | For pool payments |
| payer_id | UUID | FK → users.id, NOT NULL | | |
| payee_id | UUID | FK → users.id, nullable | | Driver receiving payout |
| amount | DECIMAL(16,2) | NOT NULL | | Total charge |
| currency | VARCHAR(3) | DEFAULT 'ZAR' | | |
| method | VARCHAR(20) | NOT NULL | | card/cash/wallet |
| gateway | VARCHAR(20) | nullable | | payfast/ozow/stripe/cash |
| gateway_reference | VARCHAR(255) | nullable | | External payment ID |
| gateway_response | JSONB | nullable | | Raw gateway response (no card data) |
| platform_fee | DECIMAL(16,2) | DEFAULT 0.00 | | |
| driver_payout | DECIMAL(16,2) | nullable | | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | | pending/processing/completed/failed/refunded/partially_refunded |
| failure_reason | TEXT | nullable | | |
| retry_count | INTEGER | DEFAULT 0 | | |
| paid_at | TIMESTAMPTZ | nullable | | |
| escrow_status | VARCHAR(20) | DEFAULT 'held' | | held/released/disputed/refunded |
| escrow_released_at | TIMESTAMPTZ | nullable | | |
| dispute_window_ends_at | TIMESTAMPTZ | nullable | | |
| cash_received | DECIMAL(16,2) | nullable | | Cash payment tracking |
| cash_discrepancy | DECIMAL(16,2) | nullable | | |
| cash_settled_at | TIMESTAMPTZ | nullable | | |
| cash_reconciled | BOOLEAN | DEFAULT false | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | | |

**Indexes:** `ride_id`, `payer_id`, `(gateway, gateway_reference)`, `(status, created_at)`

## 2.11 `wallets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | UNIQUE, FK → users.id | One wallet per user |
| tenant_id | UUID | FK → tenants.id, nullable | |
| balance | DECIMAL(16,2) | DEFAULT 0.00, CHECK (balance >= 0) | |
| pending_balance | DECIMAL(16,2) | DEFAULT 0.00 | Unsettled funds |
| frozen_balance | DECIMAL(16,2) | DEFAULT 0.00 | Holds/disputes |
| total_deposited | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_spent | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_refunded | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_withdrawn | DECIMAL(16,2) | DEFAULT 0.00 | |
| currency | VARCHAR(3) | DEFAULT 'ZAR' | |
| is_active | BOOLEAN | DEFAULT true | |
| last_transaction_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.12 `wallet_transactions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | FK → wallets.id, NOT NULL | |
| type | VARCHAR(20) | NOT NULL | deposit/withdrawal/payment/refund/referral_bonus/payout/fee/escrow_hold/escrow_release |
| amount | DECIMAL(16,2) | NOT NULL | Positive = credit, negative = debit |
| balance_before | DECIMAL(16,2) | NOT NULL | |
| balance_after | DECIMAL(16,2) | NOT NULL | |
| reference_type | VARCHAR(50) | nullable | ride/payment/payout/promo |
| reference_id | UUID | nullable | UUID of referenced entity |
| status | VARCHAR(20) | DEFAULT 'completed' | pending/completed/failed |
| description | TEXT | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(wallet_id, created_at)`, `(reference_type, reference_id)`, `(type, created_at)`

## 2.13 `transactions` (All Money Movements)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| from_user_id | UUID | FK → users.id, nullable | NULL for system credit |
| to_user_id | UUID | FK → users.id, nullable | NULL for system debit |
| type | VARCHAR(20) | NOT NULL | fare/tip/bonus/refund/cashout/platform_fee/fee/promo_credit |
| amount | DECIMAL(16,2) | NOT NULL | Always positive |
| currency | VARCHAR(3) | DEFAULT 'ZAR' | |
| reference_type | VARCHAR(50) | nullable | ride/payment/wallet/payout |
| reference_id | UUID | nullable | |
| description | TEXT | nullable | |
| metadata | JSONB | nullable | Additional context |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.14 `fares`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, NOT NULL | |
| base_fare | DECIMAL(16,2) | NOT NULL | |
| distance_fare | DECIMAL(16,2) | DEFAULT 0.00 | |
| time_fare | DECIMAL(16,2) | DEFAULT 0.00 | |
| surge_amount | DECIMAL(16,2) | DEFAULT 0.00 | |
| surge_multiplier | DECIMAL(4,2) | DEFAULT 1.00 | |
| booking_fee | DECIMAL(16,2) | DEFAULT 0.00 | |
| discount_amount | DECIMAL(16,2) | DEFAULT 0.00 | |
| pool_discount | DECIMAL(16,2) | DEFAULT 0.00 | |
| platform_fee | DECIMAL(16,2) | DEFAULT 0.00 | |
| driver_earnings | DECIMAL(16,2) | DEFAULT 0.00 | |
| tip_amount | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_fare | DECIMAL(16,2) | NOT NULL | |
| currency | VARCHAR(3) | DEFAULT 'ZAR' | |
| promo_code_id | UUID | FK → promo_codes.id, nullable | |
| fare_estimate | DECIMAL(16,2) | nullable | For audit trail |
| fare_variance_percent | DECIMAL(5,2) | nullable | Actual vs estimate |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.15 `surge_pricing`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| zone_name | VARCHAR(100) | NOT NULL | Human-readable zone |
| zone_boundary | GEOGRAPHY(Polygon, 4326) | | PostGIS polygon |
| multiplier | DECIMAL(3,2) | NOT NULL, DEFAULT 1.00 | 1.00–3.00 |
| trigger_type | VARCHAR(20) | NOT NULL | time_based/demand_based/event_based/manual |
| demand_threshold | DECIMAL(5,2) | DEFAULT 0.70 | Requests per driver ratio |
| active_requests | INTEGER | DEFAULT 0 | Current pending rides in zone |
| active_drivers | INTEGER | DEFAULT 0 | Current online drivers in zone |
| start_time | TIMESTAMPTZ | nullable | |
| end_time | TIMESTAMPTZ | nullable | |
| is_active | BOOLEAN | DEFAULT false | |
| activated_by | UUID | FK → users.id, nullable | Admin who activated (manual) |
| activated_at | TIMESTAMPTZ | nullable | |
| deactivated_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `zone_boundary` GIST, `(is_active, tenant_id)`

## 2.16 `peak_hours`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| name | VARCHAR(100) | NOT NULL | e.g., "Morning Rush" |
| day_of_week | INTEGER[] | NOT NULL | Array: [1,2,3,4,5] (Mon-Fri) |
| start_time | TIME | NOT NULL | |
| end_time | TIME | NOT NULL | |
| surge_multiplier | DECIMAL(3,2) | DEFAULT 1.00 | Base surge during peak |
| driver_bonus_per_ride | DECIMAL(10,2) | DEFAULT 0.00 | Extra incentive |
| pool_discount_percent | DECIMAL(5,2) | DEFAULT 0.00 | Discount for pool during peak |
| is_active | BOOLEAN | DEFAULT true | |
| effective_from | DATE | nullable | |
| effective_until | DATE | nullable | |
| recurring | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK → users.id, nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.17 `ratings`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, NOT NULL | |
| rater_id | UUID | FK → users.id, NOT NULL | |
| rated_user_id | UUID | FK → users.id, NOT NULL | |
| is_driver_rating | BOOLEAN | NOT NULL | true = driver→rider, false = rider→driver |
| score | SMALLINT | NOT NULL, CHECK (1–5) | |
| comment | TEXT | nullable | |
| tags | JSONB | nullable | ["on_time","friendly","clean_vehicle"] |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint:** `(ride_id, rater_id)` — one rating per user per ride

**Indexes:** `(rated_user_id, score)`, `ride_id`

## 2.18 `support_tickets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| ride_id | UUID | FK → rides.id, nullable | |
| subject | VARCHAR(255) | NOT NULL | |
| description | TEXT | NOT NULL | |
| category | VARCHAR(50) | NOT NULL | payment/ride_issue/driver_issue/technical/account/safety/other |
| priority | VARCHAR(10) | DEFAULT 'normal' | low/normal/high/urgent |
| status | VARCHAR(20) | DEFAULT 'open' | open/assigned/in_progress/waiting_on_customer/resolved/closed |
| assigned_to | UUID | FK → users.id, nullable | Support agent |
| resolution_note | TEXT | nullable | |
| satisfaction_rating | SMALLINT | CHECK (1–5), nullable | |
| escalation_level | INTEGER | DEFAULT 0 | Auto-escalation counter |
| auto_escalate_at | TIMESTAMPTZ | nullable | When to auto-escalate |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(status, priority, created_at)`, `(assigned_to, status)`, `user_id`

## 2.19 `ticket_messages`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ticket_id | UUID | FK → support_tickets.id, NOT NULL | |
| sender_id | UUID | FK → users.id, NOT NULL | |
| message | TEXT | NOT NULL | |
| attachment_url | VARCHAR(500) | nullable | |
| is_internal | BOOLEAN | DEFAULT false | Staff-only notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.20 `notifications`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| body | TEXT | nullable | |
| type | VARCHAR(50) | NOT NULL | ride_update/payment/sos/promo/system/support |
| channel | VARCHAR(20) | NOT NULL | push/sms/email/in_app |
| data | JSONB | nullable | Payload for deep linking |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/sent/delivered/failed |
| is_read | BOOLEAN | DEFAULT false | |
| read_at | TIMESTAMPTZ | nullable | |
| sent_at | TIMESTAMPTZ | nullable | |
| delivered_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, is_read, created_at)`, `(type, created_at)`

## 2.21 `notification_templates`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | e.g., "ride:accepted" |
| title_template | TEXT | NOT NULL | |
| body_template | TEXT | NOT NULL | |
| variables | JSONB | NOT NULL | ["driver_name","vehicle"] |
| channel | VARCHAR(20) | DEFAULT 'push' | push/sms/email |
| push_priority | VARCHAR(20) | DEFAULT 'normal' | normal/high |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.22 `documents` (Driver Documents)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| document_type | VARCHAR(50) | NOT NULL | drivers_license_front/drivers_license_back/id_front/id_back/passport/vehicle_registration/professional_driving_permit/police_clearance/proof_of_address/insurance |
| file_path | VARCHAR(500) | NOT NULL | Object storage path |
| file_hash | VARCHAR(64) | | SHA-256 for integrity |
| file_size_bytes | INTEGER | | |
| mime_type | VARCHAR(100) | | |
| is_verified | BOOLEAN | DEFAULT false | |
| verification_notes | TEXT | nullable | |
| expires_at | DATE | nullable | |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | |
| verified_at | TIMESTAMPTZ | nullable | |
| verified_by | UUID | FK → users.id, nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.23 `geofences`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| name | VARCHAR(100) | NOT NULL | e.g., "Phalaborwa CBD", "Airport Zone" |
| type | VARCHAR(20) | NOT NULL | service_area/restricted/airport/dropoff_only/surge_zone |
| boundary | GEOGRAPHY(Polygon, 4326) | NOT NULL | PostGIS polygon |
| properties | JSONB | DEFAULT '{}' | zone-specific settings |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `boundary` GIST, `(is_active, tenant_id)`

## 2.24 `promo_codes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Uppercase, alphanumeric |
| description | TEXT | nullable | |
| discount_type | VARCHAR(20) | NOT NULL | percentage/fixed |
| discount_value | DECIMAL(10,2) | NOT NULL | |
| max_discount | DECIMAL(10,2) | nullable | Cap for percentage discounts |
| min_ride_fare | DECIMAL(10,2) | DEFAULT 0.00 | Minimum fare to apply |
| max_uses | INTEGER | DEFAULT 0 | 0 = unlimited |
| max_uses_per_user | INTEGER | DEFAULT 1 | |
| usage_count | INTEGER | DEFAULT 0 | |
| applicable_categories | JSONB | nullable | ["standard","premium"] or null = all |
| first_ride_only | BOOLEAN | DEFAULT false | |
| starts_at | TIMESTAMPTZ | nullable | |
| expires_at | TIMESTAMPTZ | nullable | |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK → users.id, nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `code` (unique), `(is_active, expires_at, starts_at)`

## 2.25 `audit_logs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| actor_id | UUID | FK → users.id, nullable | NULL for system events |
| actor_role | VARCHAR(20) | nullable | Role at time of action |
| action | VARCHAR(50) | NOT NULL | create/update/delete/approve/reject/login/logout/payment/sos |
| resource_type | VARCHAR(50) | NOT NULL | user/ride/payment/driver/setting/pricing/promo/api_key |
| resource_id | VARCHAR(36) | nullable | UUID of affected entity |
| old_values | JSONB | nullable | Previous state |
| new_values | JSONB | nullable | New state |
| ip_address | VARCHAR(45) | nullable | IPv4/IPv6 |
| user_agent | TEXT | nullable | |
| trace_id | VARCHAR(100) | nullable | Distributed trace ID |
| severity | VARCHAR(20) | DEFAULT 'info' | debug/info/warning/error/critical |
| event_type | VARCHAR(50) | DEFAULT 'admin_action' | admin_action/system_event/security_event/payment_event/ride_event |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**IMMUTABLE:** No UPDATE or DELETE allowed. Enforced by PostgreSQL trigger.

**Indexes:** `(resource_type, resource_id)`, `(actor_id, created_at)`, `(action, created_at)`, `created_at` (BRIN)

## 2.26 `sos_alerts`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | Who triggered |
| ride_id | UUID | FK → rides.id, nullable | Active ride |
| alert_type | VARCHAR(20) | NOT NULL | sos/accident/medical/feel_unsafe |
| latitude | DECIMAL(10,7) | NOT NULL | |
| longitude | DECIMAL(10,7) | NOT NULL | |
| location_description | TEXT | nullable | |
| severity | VARCHAR(20) | DEFAULT 'high' | low/medium/high/critical |
| status | VARCHAR(20) | DEFAULT 'triggered' | triggered/acknowledged/resolved/cancelled/false_alarm |
| acknowledged_by | UUID | FK → users.id, nullable | Admin/dispatcher |
| acknowledged_at | TIMESTAMPTZ | nullable | |
| resolved_at | TIMESTAMPTZ | nullable | |
| resolution_notes | TEXT | nullable | |
| emergency_services_called | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(status, severity, created_at)`, `user_id`

## 2.27 `disputes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, nullable | |
| payment_id | UUID | FK → payments.id, nullable | |
| raised_by | UUID | FK → users.id, NOT NULL | |
| reason | VARCHAR(50) | NOT NULL | overcharge/no_show/route_deviation/safety/other |
| description | TEXT | nullable | |
| evidence_paths | JSONB | nullable | Array of file URLs |
| status | VARCHAR(20) | DEFAULT 'open' | open/investigating/resolved/closed/escalated |
| resolved_by | UUID | FK → users.id, nullable | |
| resolved_at | TIMESTAMPTZ | nullable | |
| resolution | TEXT | nullable | |
| refund_amount | DECIMAL(16,2) | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(status, created_at)`, `raised_by`, `ride_id`

## 2.28 `settings`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | NULL = global setting |
| category | VARCHAR(50) | NOT NULL | Fare/Surge/Platform/Driver/Feature/Payment |
| key | VARCHAR(100) | NOT NULL | |
| sub_key | VARCHAR(50) | nullable | e.g., category name for fare settings |
| value | TEXT | NOT NULL | |
| data_type | VARCHAR(20) | DEFAULT 'string' | decimal/percentage/boolean/json |
| description | TEXT | nullable | |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK → users.id, nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint:** `(tenant_id, category, key, sub_key)`

**Indexes:** `(category, key)`, `(tenant_id, category)`

## 2.29 `consent_records`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| consent_type | VARCHAR(50) | NOT NULL | terms_of_service/privacy_policy/location_tracking/marketing_notifications/data_sharing |
| consent_version | VARCHAR(20) | NOT NULL | Version of document |
| granted | BOOLEAN | NOT NULL | true = granted, false = withdrawn |
| granted_at | TIMESTAMPTZ | NOT NULL | |
| withdrawn_at | TIMESTAMPTZ | nullable | |
| ip_address | VARCHAR(45) | nullable | |
| user_agent | TEXT | nullable | |
| metadata | JSONB | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, consent_type, granted_at)`, `(consent_type, consent_version)`

## 2.30 `kyc_verifications`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| verification_type | VARCHAR(50) | NOT NULL | id_document/passport/drivers_license |
| document_type | VARCHAR(50) | NOT NULL | |
| document_number | VARCHAR(100) | nullable | 🔒 Encrypted at rest |
| document_front_path | VARCHAR(255) | nullable | |
| document_back_path | VARCHAR(255) | nullable | |
| selfie_path | VARCHAR(255) | nullable | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/under_review/approved/rejected/expired |
| rejection_reason | TEXT | nullable | |
| verified_at | TIMESTAMPTZ | nullable | |
| verified_by | UUID | FK → users.id, nullable | |
| expires_at | TIMESTAMPTZ | nullable | |
| metadata | JSONB | nullable | OCR results, risk flags |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, status)`, `(status, created_at)`

## 2.31 `referral_codes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | UNIQUE, FK → users.id | One code per user |
| code | VARCHAR(20) | UNIQUE, NOT NULL | |
| is_active | BOOLEAN | DEFAULT true | |
| usage_count | INTEGER | DEFAULT 0 | |
| max_uses | INTEGER | DEFAULT 50 | Per month |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.32 `referral_redemptions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| referral_code_id | UUID | FK → referral_codes.id | |
| referrer_id | UUID | FK → users.id | |
| referred_id | UUID | FK → users.id | |
| bonus_amount | DECIMAL(16,2) | DEFAULT 25.00 | R25 |
| bonus_paid | BOOLEAN | DEFAULT false | |
| completed_at | TIMESTAMPTZ | nullable | When referred user completes first ride |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.33 `insurance_policies`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| provider | VARCHAR(100) | NOT NULL | |
| policy_number | VARCHAR(100) | NOT NULL | |
| coverage_type | VARCHAR(50) | NOT NULL | public_liability/passenger/vehicle/comprehensive |
| coverage_amount | DECIMAL(16,2) | | |
| excess_amount | DECIMAL(16,2) | | |
| valid_from | DATE | NOT NULL | |
| valid_until | DATE | NOT NULL | |
| document_url | VARCHAR(500) | nullable | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.34 `incident_reports`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| reporter_id | UUID | FK → users.id, NOT NULL | |
| ride_id | UUID | FK → rides.id, nullable | |
| incident_type | VARCHAR(50) | NOT NULL | accident/dispute/damage/theft/medical/safety/other |
| severity | VARCHAR(20) | DEFAULT 'medium' | low/medium/high/critical |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'open' | open/investigating/resolved/closed/escalated |
| assigned_to | UUID | FK → users.id, nullable | |
| resolution | TEXT | nullable | |
| resolved_at | TIMESTAMPTZ | nullable | |
| evidence_paths | JSONB | nullable | |
| insurance_claim_id | VARCHAR(100) | nullable | |
| police_case_number | VARCHAR(100) | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(status, severity)`, `(incident_type, status)`, `reporter_id`, `ride_id`

## 2.35 `webhook_events`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| source | VARCHAR(50) | NOT NULL | payfast/ozow/stripe/internal |
| event_type | VARCHAR(100) | NOT NULL | |
| payload | JSONB | NOT NULL | |
| headers | JSONB | nullable | |
| status | VARCHAR(20) | DEFAULT 'received' | received/processing/completed/failed/dead_letter |
| processing_attempts | INTEGER | DEFAULT 0 | |
| max_attempts | INTEGER | DEFAULT 7 | |
| last_error | TEXT | nullable | |
| next_retry_at | TIMESTAMPTZ | nullable | |
| processed_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(status)`, `(source, status)`, `(next_retry_at) WHERE status = 'failed'`

## 2.36 `push_tokens`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| token | TEXT | NOT NULL | FCM/APNs token |
| platform | VARCHAR(10) | NOT NULL | ios/android/web |
| device_id | VARCHAR(255) | nullable | |
| app_version | VARCHAR(20) | nullable | |
| is_active | BOOLEAN | DEFAULT true | |
| last_used_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, is_active)`, `token`

## 2.37 `ride_chat_messages`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ride_id | UUID | FK → rides.id, NOT NULL | |
| sender_id | UUID | FK → users.id, NOT NULL | |
| message | TEXT | NOT NULL | |
| message_type | VARCHAR(20) | DEFAULT 'text' | text/image/location/sos |
| is_read | BOOLEAN | DEFAULT false | |
| read_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Retention:** 30 days after ride completion, then delete.

**Indexes:** `(ride_id, created_at)`, `sender_id`, `(receiver_id, is_read)`

## 2.38 `scheduled_rides`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| rider_id | UUID | FK → users.id, NOT NULL | |
| pickup_latitude | DECIMAL(10,7) | NOT NULL | |
| pickup_longitude | DECIMAL(10,7) | NOT NULL | |
| pickup_address | TEXT | NOT NULL | |
| dropoff_latitude | DECIMAL(10,7) | NOT NULL | |
| dropoff_longitude | DECIMAL(10,7) | NOT NULL | |
| dropoff_address | TEXT | NOT NULL | |
| category | VARCHAR(20) | NOT NULL | |
| scheduled_at | TIMESTAMPTZ | NOT NULL | |
| pickup_window_min | INTEGER | DEFAULT 10 | |
| estimated_fare | DECIMAL(10,2) | nullable | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/confirmed/searching/dispatched/in_progress/completed/cancelled/missed |
| ride_id | UUID | FK → rides.id, nullable | Linked ride after dispatch |
| recurring_rule | VARCHAR(100) | nullable | RRULE: "FREQ=WEEKLY;BYDAY=MO,WE,FR" |
| recurring_until | DATE | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.39 `api_keys`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| name | VARCHAR(100) | NOT NULL | |
| key_hash | VARCHAR(64) | NOT NULL | SHA-256 of API key |
| key_prefix | VARCHAR(10) | NOT NULL | First 10 chars for ID |
| permissions | JSONB | DEFAULT '["read"]' | |
| allowed_ips | TEXT[] | nullable | IP whitelist |
| rate_limit | INTEGER | DEFAULT 1000 | Requests per hour |
| expires_at | TIMESTAMPTZ | nullable | |
| last_used_at | TIMESTAMPTZ | nullable | |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | FK → users.id, nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| revoked_at | TIMESTAMPTZ | nullable | |

## 2.40 `cash_reconciliation`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| driver_id | UUID | FK → users.id, NOT NULL | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| date | DATE | NOT NULL | |
| total_cash_collected | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_platform_fee_due | DECIMAL(16,2) | DEFAULT 0.00 | |
| total_cash_due_to_driver | DECIMAL(16,2) | DEFAULT 0.00 | |
| cash_deposited | DECIMAL(16,2) | DEFAULT 0.00 | |
| cash_deposit_slip | VARCHAR(500) | nullable | Photo of deposit slip |
| cash_deposit_confirmed | BOOLEAN | DEFAULT false | |
| confirmed_by | UUID | FK → users.id, nullable | |
| confirmed_at | TIMESTAMPTZ | nullable | |
| discrepancy | DECIMAL(16,2) | DEFAULT 0.00 | |
| discrepancy_note | TEXT | nullable | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/partially_reconciled/reconciled/disputed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.41 `driver_payouts`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| driver_id | UUID | FK → users.id, NOT NULL | |
| tenant_id | UUID | FK → tenants.id, nullable | |
| period_start | DATE | NOT NULL | |
| period_end | DATE | NOT NULL | |
| total_rides | INTEGER | DEFAULT 0 | |
| total_fare | DECIMAL(16,2) | DEFAULT 0.00 | |
| platform_fee | DECIMAL(16,2) | DEFAULT 0.00 | |
| driver_earnings | DECIMAL(16,2) | DEFAULT 0.00 | |
| cash_collected | DECIMAL(16,2) | DEFAULT 0.00 | |
| net_payout | DECIMAL(16,2) | DEFAULT 0.00 | driver_earnings - cash_collected |
| payout_method | VARCHAR(20) | DEFAULT 'wallet' | wallet/bank_transfer/payfast/ozow |
| payout_status | VARCHAR(20) | DEFAULT 'pending' | pending/processing/completed/failed |
| bank_account_id | UUID | nullable | |
| reference | VARCHAR(255) | nullable | |
| paid_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.42 `refunds`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| payment_id | UUID | FK → payments.id, NOT NULL | |
| ride_id | UUID | FK → rides.id, nullable | |
| user_id | UUID | FK → users.id, NOT NULL | |
| amount | DECIMAL(16,2) | NOT NULL | |
| reason | TEXT | NOT NULL | |
| reason_category | VARCHAR(50) | NOT NULL | rider_cancellation/driver_no_show/technical_issue/duplicate_charge/service_issue/other |
| requested_by | UUID | FK → users.id, nullable | |
| approved_by | UUID | FK → users.id, nullable | |
| approved_at | TIMESTAMPTZ | nullable | |
| processed_at | TIMESTAMPTZ | nullable | |
| gateway_reference | VARCHAR(255) | nullable | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/approved/processing/completed/rejected/failed |
| rejection_reason | TEXT | nullable | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

## 2.43 `data_retention_policies`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| entity_type | VARCHAR(50) | UNIQUE, NOT NULL | rides/payments/audit_logs/locations/messages |
| retention_days | INTEGER | NOT NULL | |
| archival_days | INTEGER | nullable | Move to cold storage |
| deletion_action | VARCHAR(20) | DEFAULT 'anonymize' | anonymize/delete/archive |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

# Part 3: Peak Hours & Surge Pricing Design

## 3.1 Peak Hours Detection

### Scheduled Peak Hours
Admin-configured recurring time windows stored in `peak_hours` table.

```sql
-- Example: Phalaborwa morning rush
INSERT INTO peak_hours (tenant_id, name, day_of_week, start_time, end_time, surge_multiplier, driver_bonus_per_ride, pool_discount_percent) VALUES
('tenant-phalaborwa', 'Morning Rush', '{1,2,3,4,5}', '06:00', '09:00', 1.50, 10.00, 15.00),
('tenant-phalaborwa', 'Evening Rush', '{1,2,3,4,5}', '16:00', '19:00', 1.50, 10.00, 15.00),
('tenant-phalaborwa', 'Weekend Night', '{5,6}', '21:00', '02:00', 1.75, 15.00, 20.00),
('tenant-phalaborwa', 'Public Holiday', '{0,1,2,3,4,5,6}', '00:00', '23:59', 1.50, 10.00, 15.00);
```

### Real-Time Demand/Supply Surge
Triggered when demand/supply ratio exceeds threshold, independent of scheduled peaks.

```
Algorithm:
1. Every 5 minutes, for each surge zone:
   a. Count active_requests (rides in 'pending' status within zone)
   b. Count active_drivers (online drivers within zone)
   c. ratio = active_requests / MAX(active_drivers, 1)

2. If ratio > demand_threshold (default 0.7):
   multiplier = MIN(1.0 + (ratio - demand_threshold), max_multiplier)

3. If ratio <= demand_threshold for 15 consecutive minutes:
   Reduce multiplier by 0.1x per cycle until 1.0x
```

## 3.2 Surge Multiplier Calculation

```
surge_multiplier = base_surge × demand_surge × event_surge

Where:
- base_surge = peak_hours.surge_multiplier (if active peak window)
- demand_surge = f(demand/supply ratio) (from real-time calculation)
- event_surge = 1.0 (no events) or 1.5-2.0 (special events, admin-set)

Result clamped to [1.0, max_surge_multiplier]
```

**Example calculations:**

| Scenario | base_surge | demand_surge | event_surge | Result |
|----------|-----------|-------------|------------|--------|
| Normal, no demand | 1.0 | 1.0 | 1.0 | 1.0x |
| Peak hour, normal demand | 1.5 | 1.0 | 1.0 | 1.5x |
| Peak hour, high demand (ratio=1.2) | 1.5 | 1.5 | 1.0 | 2.25x |
| Normal, extreme demand (ratio=2.5) | 1.0 | 2.0 | 1.0 | 2.0x |
| Peak + event + high demand | 1.5 | 1.5 | 1.5 | 3.0x (capped) |

## 3.3 Surge Zones

Geographic polygons stored in `geofences` table with `type = 'surge_zone'`. Overlapping zones use the highest multiplier.

```
Zone resolution:
1. Find all surge zones containing the pickup point (PostGIS ST_Contains)
2. For each zone, check if surge is active
3. Apply the highest multiplier among active zones
4. If no zones → no surge (1.0x)
```

## 3.4 Rider Notification

When surge is active:
1. Fare estimate screen shows: "Busy time — fares are higher than usual"
2. Surge multiplier displayed: "1.5x surge"
3. Fare breakdown shows surge line item
4. Rider must explicitly acknowledge surge before confirming

## 3.5 Driver Incentives During Peak

| Incentive | Trigger | Value |
|-----------|---------|-------|
| Bonus per ride | Active during peak hour | R10-R15 per completed ride |
| Higher commission split | Peak hour rides | Driver gets 85% instead of 70% |
| Surge earnings | Surge multiplier applies | 100% of surge goes to driver |
| Streak bonus | 3+ rides during peak | Additional R20 bonus |

## 3.6 Pool Discount During Surge

To encourage pooling and reduce demand:
- Pool rides get additional 10-20% off during surge
- Pool discount applied AFTER surge calculation
- Pool fare = solo_fare × surge_multiplier × (1 - pool_discount_percent)
- Result: pool is always cheaper than solo, even during surge

## 3.7 Admin Controls

| Control | Description |
|---------|-------------|
| Manual surge override | Set specific multiplier for a zone (bypasses algorithm) |
| Max surge cap | Hard limit per tenant (default 3.0x) |
| Schedule peaks | CRUD for recurring peak windows |
| Event peaks | One-time peak windows for events |
| Surge zone management | Create/edit/delete geographic surge zones |
| Driver incentive config | Set bonus amounts, commission splits |
| Surge history | View past surge periods with revenue impact |
| Emergency disable | Kill switch to disable surge entirely |

## 3.8 Revenue Impact Modeling

```
Revenue Impact = (surge_amount × rides_during_surge) - (driver_incentives × rides_during_peak) - (pool_discounts × pool_rides_during_surge)

Example (daily):
- 500 rides during peak hours
- Average surge: 1.5x (0.5x above base)
- Average fare: R80
- Surge revenue: 500 × R40 = R20,000
- Driver incentives: 500 × R10 = R5,000
- Pool discounts: 100 × R15 = R1,500
- Net surge revenue: R20,000 - R5,000 - R1,500 = R13,500
```

---

# Part 4: Ride Pooling Design

## 4.1 Pool Request Creation

Rider selects "Pool" category with:
- Pickup location (required)
- Dropoff location (required)
- Pickup time: "Now" or "Flexible" (select ±15 min window)
- Max deviation: Default 2 km (configurable)
- Number of passengers: 1-4

```
POST /api/v1/rides/pool-request
{
  "pickup_latitude": -23.9045,
  "pickup_longitude": 29.4688,
  "dropoff_latitude": -23.8845,
  "dropoff_longitude": 29.4588,
  "pickup_window_start": "2026-07-01T08:00:00Z",
  "pickup_window_end": "2026-07-01T08:15:00Z",
  "passengers": 2,
  "max_deviation_km": 2.0,
  "flexible_time_min": 15
}
```

## 4.2 Pool Matching Algorithm

```
Input: New pool request R
Output: Matched pool group G or null (offer solo)

Algorithm:
1. Find all existing pool groups G with status='forming' where:
   - G.driver_id IS NULL (no driver assigned yet)
   - G.current_passengers + R.passengers <= G.max_passengers
   - G.tenant_id = R.tenant_id

2. For each candidate group G:
   a. Calculate combined route: R.pickup → R.dropoff via G.waypoints
   b. Calculate deviation: |combined_route - direct_route| for R
   c. Check time compatibility: R.pickup_window overlaps G.estimated_pickup_time
   d. Check capacity: G.current_passengers + R.passengers <= 4

3. Rank valid matches by:
   - Lowest route deviation (40% weight)
   - Best time overlap (30% weight)
   - Fewest current passengers (20% weight)
   - Shortest detour for existing riders (10% weight)

4. If best match score > 0.7 (normalized):
   - Add R to G.current_passengers
   - Add R.pickup to G.pickup_order
   - Add R.dropoff to G.dropoff_order
   - Recalculate G.route_polyline (optimized TSP)
   - Recalculate fare for all riders (pool discount applied)
   - Notify all riders: "You've been matched with X other riders"

5. If no match found within 5 minutes:
   - Offer solo ride at solo fare
   - Notify rider: "No pool match found. Ride solo at R{fare} or wait longer?"
```

## 4.3 Route Optimization (TSP)

For pickup and dropoff ordering, solve a small Traveling Salesman Problem (≤4 passengers):

```
Algorithm: Nearest Neighbor + 2-opt improvement

1. Start at first pickup location
2. Greedily visit nearest unvisited pickup
3. After all pickups collected, visit dropoffs in order of proximity
4. Apply 2-opt swaps to improve route
5. Constraint: No rider's detour > 2 km from direct route
6. Constraint: Total route < 1.5x longest individual route
```

## 4.4 Pool Pricing

```
pool_fare_per_rider = solo_fare × pool_discount_factor × surge_multiplier

Where:
- solo_fare = base_fare + distance_fare + time_fare + booking_fee
- pool_discount_factor = 0.60 to 0.80 (20-40% discount)
- pool_discount_factor = f(route_overlap, deviation_km)
  - High overlap (>80%): 0.60 (40% discount)
  - Medium overlap (50-80%): 0.70 (30% discount)
  - Low overlap (<50%): 0.80 (20% discount)

- platform_fee = solo_platform_fee × 0.75 (reduced for pool)
- driver_earnings = sum(pool_fares) - platform_fee
- Tip: each rider tips independently on their portion
```

## 4.5 Pickup/Dropoff Sequencing

**Driver View:**
```
Stop 1 (Pickup): John — 12 Main St → Arrive in 3 min
Stop 2 (Pickup): Sarah — 45 Oak Ave → Arrive in 7 min
Stop 3 (Dropoff): Sarah — 78 Pine Rd → Arrive in 15 min
Stop 4 (Dropoff): John — 90 Elm St → Arrive in 22 min
```

**Each Rider View:**
```
John sees:
"Pool ride with 1 other rider
Pickup: 12 Main St (0 min)
Dropoff: 90 Elm St (22 min)
Your fare: R45 (was R65 solo — 30% saved)"

Sarah sees:
"Pool ride with 1 other rider
Pickup: 45 Oak Ave (7 min)
Dropoff: 78 Pine Rd (15 min)
Your fare: R35 (was R50 solo — 30% saved)"
```

## 4.6 Cancellation Handling

| Scenario | Action |
|----------|--------|
| Rider cancels before pickup | Remove from pool, recalculate for remaining, notify all |
| Rider cancels after pickup | Cannot cancel (ride in progress) — complete ride first |
| All riders cancel | Cancel pool group, no charge |
| Driver cancels | Cancel entire pool, re-dispatch to other drivers |
| Last rider remaining | Convert pool to solo ride, recalculate fare |

## 4.7 Capacity Management

- Pool group tracks `current_passengers` (0–4)
- `seating_capacity` from driver's vehicle determines max
- When pool is full, `pool_status = 'full'` — no more matching
- Driver can decline pool rides (preference setting)

## 4.8 Pool vs Solo Toggle

**Rider Preferences:**
- Default ride type: Solo / Pool / Ask me
- Pool acceptance: Always / Sometimes / Never
- Max pool deviation: 1 km / 2 km / 3 km

**Driver Preferences:**
- Accept pool rides: Yes / No
- Max pool passengers: 2 / 3 / 4

---

# Part 5: Workflow Simulation

## 5.1 Rider Workflows

### WF-R01: Rider Registration & Phone Verification

```
Preconditions: Rider does not have an account
Happy Path:
  1. Rider opens app → sees splash → taps "Get Started"
  2. Rider enters phone number (E.164 format)
  3. System validates format, checks uniqueness
  4. System sends OTP via SMS gateway (6 digits, 5-min expiry)
  5. Rider enters OTP
  6. System verifies OTP (3 attempts max)
  7. Rider enters: name, email, password
  8. System validates: email unique, password ≥8 chars, name required
  9. System creates User record (role=rider, is_active=true)
  10. System creates Wallet record (balance=0)
  11. System generates ReferralCode
  12. System records consent_records (terms_of_service, privacy_policy)
  13. System issues JWT tokens
  14. App navigates to home screen
  DB Transitions: INSERT users, wallets, referral_codes, consent_records
Alternate Paths:
  A1. Phone already registered → "Account exists. Login instead?" → redirect to login
  A2. OTP expired → "Code expired. Resend?" (max 3 resends)
  A3. OTP verification failed 3x → "Too many attempts. Try again in 15 minutes."
  A4. Email already registered → Validation error on email field
Failure Paths:
  F1. SMS gateway down → "Unable to send code. Try again later." (queue for retry)
  F2. Database error → "Something went wrong. Please try again."
  F3. Network loss → Queue request, retry on reconnect
```

### WF-R02: Rider Books Solo Ride (Happy Path)

```
Preconditions: Rider is logged in, has payment method
Happy Path:
  1. Rider opens app → sees map with current location
  2. Rider taps search bar → enters destination
  3. System returns autocomplete suggestions (Google Places)
  4. Rider selects destination
  5. System calculates route, distance, duration
  6. System displays fare estimate: "R{fare} (Standard)"
  7. Rider selects ride category (Standard/Premium/Pool)
  8. Rider selects payment method (Card/Cash/Wallet)
  9. Rider optionally enters promo code
  10. Rider taps "Confirm Ride"
  11. System creates Ride (status=pending)
  12. System initiates driver matching
  13. App shows "Finding your driver..."
  14. Driver accepts → Ride status=accepted
  15. App shows driver info, ETA, vehicle details
  16. Driver navigates to pickup
  17. Driver taps "Arrived" → Ride status=driver_arrived
  18. App shows "Your driver has arrived"
  19. 2-min free wait, then R15/waiting minute
  20. Driver taps "Start Ride" → Ride status=in_progress
  21. App shows real-time tracking on map
  22. Driver navigates to dropoff
  23. Driver taps "Complete Ride" → Ride status=completed
  24. Payment processed
  25. App shows fare breakdown + receipt
  26. Rider rates driver (1-5 stars + comment)
  27. Done
  DB Transitions: INSERT rides → UPDATE rides (status) → INSERT payments → INSERT ratings
Alternate Paths:
  A1. No driver available within 5km → Expand radius (up to 10km)
  A2. All drivers decline → "No drivers available. Try again in a few minutes."
  A3. Surge pricing active → Show surge multiplier on fare estimate
  A4. Rider cancels within 2 min → Free cancellation
  A5. Rider cancels after 2 min → R15 fee charged
  A6. Payment fails → "Payment failed. Please update payment method."
Failure Paths:
  F1. Driver goes offline mid-ride → Notify admin, allow rider to call emergency
  F2. GPS loss → Use last known location
  F3. Network loss during ride → Ride continues, reconnect → sync
  F4. Payment gateway timeout → Retry 3x, then flag for manual resolution
```

### WF-R03: Rider Books Pool Ride

```
Preconditions: Rider is logged in, pool available in area
Happy Path:
  1. Rider selects "Pool" category
  2. Rider enters pickup/dropoff
  3. System shows pool fare estimate: "R{pool_fare} (solo: R{solo_fare}, save {discount}%)"
  4. Rider selects pickup window (now or flexible ±15 min)
  5. Rider confirms
  6. System creates ride_request (pool_status=searching)
  7. Pool matching algorithm runs (every 30 seconds)
  8. Match found → System creates/joins pool_group
  9. All riders notified: "You've been matched with {n} other riders"
  10. Driver assigned to pool_group
  11. Driver navigates to first pickup
  12. Driver collects all passengers
  13. Driver navigates to dropoffs in optimized order
  14. Each rider dropped off → notified "Dropped off. Thanks for pooling!"
  15. Last rider dropped off → ride completes
  16. Each rider pays their pool_fare
  17. Each rider rates independently
  DB Transitions: INSERT ride_requests, pool_groups, rides → UPDATE pool_groups → INSERT payments
Alternate Paths:
  A1. No pool match in 5 min → Offer solo ride
  A2. Pool match found but route deviation > 2 km → Reject match, continue searching
  A3. Rider cancels pool before pickup → Remove from pool, recalculate for others
  A4. Driver's vehicle too small → Reject pool assignment, re-match
Failure Paths:
  F1. Pool matching service down → Fall back to solo matching
  F2. One rider cancels mid-pool → Complete remaining riders, refund canceling rider
```

### WF-R04: Rider Pays with Wallet

```
Preconditions: Ride completed, wallet balance ≥ fare
Happy Path:
  1. Ride completes → Fare calculated: R80
  2. System checks wallet balance: R150
  3. System debits wallet: R150 - R80 = R70
  4. Payment record created (method=wallet, status=completed)
  5. WalletTransaction created (type=payment, amount=-80)
  6. Driver earnings credited to driver wallet
  7. Rider sees receipt: "Paid from wallet. Balance: R70"
  DB Transitions: UPDATE wallets SET balance = balance - 80; INSERT payments, wallet_transactions
Failure Paths:
  F1. Insufficient balance → "Wallet balance too low. Top up or use another method."
  F2. Concurrent transaction (race condition) → SELECT FOR UPDATE on wallet row → retry
  F3. Wallet frozen → "Wallet is currently restricted. Contact support."
```

### WF-R05: Rider Rates Driver

```
Preconditions: Ride completed
Happy Path:
  1. App shows rating screen (1-5 stars)
  2. Rider selects stars
  3. Rider optionally types comment
  4. Rider taps "Submit"
  5. Rating record created
  6. Driver's average_rating recalculated
  7. If rating ≤ 2 → Support ticket auto-created
  8. App returns to home screen
  DB Transitions: INSERT ratings; UPDATE driver_profiles SET rating_sum, rating_count, average_rating
```

### WF-R06: Rider Requests Refund

```
Preconditions: Ride completed, payment made
Happy Path:
  1. Rider goes to ride history → selects ride → "Request Refund"
  2. Rider selects reason category (overcharge/no_show/route_deviation/safety/other)
  3. Rider enters description
  4. Rider optionally uploads evidence (photo)
  5. System creates refund request (status=pending)
  6. Support agent reviews
  7. Agent approves → refund processed to original payment method
  8. Rider notified: "Refund of R{amount} processed"
  DB Transitions: INSERT refunds → UPDATE refunds SET status → UPDATE payments → INSERT wallet_transactions
Alternate Paths:
  A1. Agent rejects → Rider notified with reason
  A2. Auto-approved (technical issue, duplicate charge) → Instant refund
```

### WF-R07: Rider Triggers SOS

```
Preconditions: Active ride in progress
Happy Path:
  1. Rider presses SOS button (visible during ride)
  2. App shows confirmation: "Are you sure? This will alert authorities."
  3. Rider confirms (10-sec cancel window available)
  4. System creates SosAlert (status=triggered)
  5. Push notification to all admin/dispatcher accounts
  6. Email to rider's emergency contact
  7. SMS to platform emergency number
  8. Admin dashboard shows SOS with map pin, rider info, driver info
  9. Admin acknowledges → SosAlert status=acknowledged
  10. Admin calls emergency services if needed
  11. Admin resolves → status=resolved
  DB Transitions: INSERT sos_alerts → UPDATE sos_alerts
Alternate Paths:
  A1. Rider cancels within 10 sec → status=false_alarm
  A2. No admin responds in 5 min → Auto-escalate (SMS to all admins)
```

## 5.2 Driver Workflows

### WF-D01: Driver Registration & Document Upload

```
Preconditions: Admin creates driver account
Happy Path:
  1. Admin creates driver account via admin dashboard
  2. Driver receives email/SMS with temporary password
  3. Driver logs in → changes password
  4. Driver completes profile (emergency contact, date of birth)
  5. Driver uploads documents:
     - Driver's license (front + back)
     - ID document (front + back)
     - Vehicle registration
     - Insurance certificate
     - Professional driving permit
     - Police clearance
  6. System stores documents, runs OCR scan
  7. System validates: license expiry > 30 days, ID format valid
  8. Admin reviews documents in dashboard
  9. Admin approves → driver.is_approved = true
  10. Driver notified: "Application approved! You can now go online."
  11. Driver can toggle online status
  DB Transitions: UPDATE users (is_approved) → UPDATE driver_profiles → INSERT documents
Alternate Paths:
  A1. Admin rejects → Driver notified with reason, can re-upload
  A2. Document expired → "Please upload a current document"
  A3. OCR fails → Flag for manual review
```

### WF-D02: Driver Goes Online & Receives Ride

```
Preconditions: Driver is approved, documents verified
Happy Path:
  1. Driver opens app → taps "Go Online"
  2. System validates: is_approved=true, documents verified
  3. System sets is_online=true, records location
  4. App shows "You're online. Waiting for rides..."
  5. Nearby ride request arrives (Socket.io event)
  6. App shows ride request: pickup, dropoff, distance, fare estimate
  7. Driver has 30 seconds to accept/decline
  8. Driver taps "Accept"
  9. System assigns ride: ride.driver_id = driver.id, ride.status = accepted
  10. Rider notified: "Driver found! {name} is on their way"
  11. App shows navigation to pickup
  12. Driver navigates to pickup
  13. Driver taps "Arrived" → ride.status = driver_arrived
  14. Rider notified: "Your driver has arrived"
  15. Wait up to 5 min (2 min free, then R15/min)
  16. Rider enters vehicle
  17. Driver taps "Start Ride" → ride.status = in_progress
  18. App shows navigation to dropoff
  19. Driver arrives at dropoff
  20. Driver taps "Complete Ride" → ride.status = completed
  21. Payment processed
  22. Driver sees earnings: "R{amount} earned"
  23. Rider rates driver
  24. Driver rates rider
  25. Done
  DB Transitions: UPDATE users → UPDATE rides → INSERT payments → INSERT ratings
Alternate Paths:
  A1. Driver declines → Auto-forward to next driver
  A2. Driver goes offline while waiting → Remove from driver pool
  A3. Rider cancels during wait → Driver notified, R15 cancellation fee
  A4. Rider no-show after 5 min → Auto-cancel, driver gets R25 fee
  A5. Driver cancels (rider not yet picked up) → Driver penalty
Failure Paths:
  F1. Network loss → Keep ride active for 5 min, then pause
  F2. GPS loss → Use last known location
  F3. Payment fails → Ride completes, payment retried via queue
```

### WF-D03: Driver Cash Payment & Reconciliation

```
Preconditions: Ride completed, rider paid cash
Happy Path:
  1. Ride completes, rider pays R80 cash
  2. Driver marks ride as "paid_in_cash"
  3. System records: payment.method=cash, payment.status=completed
  4. Platform fee (R12) recorded as driver debt
  5. End of day: driver sees cash reconciliation screen
  6. Driver confirms cash collected: R80
  7. Driver owes platform: R12
  8. Net: driver keeps R68
  9. Driver deposits R12 to platform bank account
  10. Driver uploads deposit slip photo
  11. Admin confirms deposit
  12. Cash reconciliation completed
  DB Transitions: INSERT cash_reconciliation → UPDATE cash_reconciliation
```

### WF-D04: Driver Cash Out (Instant Payout)

```
Preconditions: Driver has pending earnings > R50
Happy Path:
  1. Driver opens earnings screen → sees available balance: R500
  2. Driver taps "Cash Out"
  3. Driver selects amount: R500
  4. System calculates fee: R500 × 2% = R10
  5. Driver confirms: "Receive R490?"
  6. System creates driver_payout (status=processing)
  7. Payout sent via Ozow/PayFast
  8. Driver wallet debited R500
  9. Driver notified: "R490 deposited to your bank account"
  10. Driver_payout status = completed
  DB Transitions: INSERT driver_payouts → UPDATE wallets → INSERT wallet_transactions
Alternate Paths:
  A1. Insufficient balance → "Balance too low for instant payout"
  A2. Payout fails → "Payout failed. Try again or contact support."
  A3. Daily limit exceeded → "Daily limit reached. Try tomorrow."
```

## 5.3 Admin Workflows

### WF-A01: Admin Approves Driver

```
Preconditions: Driver has uploaded all required documents
Happy Path:
  1. Admin opens driver management → pending approvals tab
  2. Admin sees list of drivers awaiting approval
  3. Admin clicks on driver → sees profile, documents, OCR results
  4. Admin verifies: license valid, insurance current, vehicle inspected
  5. Admin taps "Approve"
  6. System sets driver.is_approved = true, driver_profiles.is_verified = true
  7. Driver notified via push + email: "Approved!"
  8. Audit log recorded
  9. Driver can now go online
  DB Transitions: UPDATE users, driver_profiles → INSERT audit_logs
Alternate Paths:
  A1. Admin rejects → Enter reason → Driver notified with reason
  A2. Document expired → Admin requests re-upload
  A3. Missing document → Admin requests specific document
```

### WF-A02: Admin Manages Surge Pricing

```
Preconditions: Admin has pricing management access
Happy Path:
  1. Admin opens pricing management → surge pricing tab
  2. Admin sees current surge status: "No active surge"
  3. Admin can: view history, toggle surge, set manual override
  4. For manual override:
     a. Admin selects zone on map
     b. Admin sets multiplier: 2.0x
     c. Admin sets duration: 2 hours
     d. Admin confirms
  5. System activates surge for zone
  6. All ride estimates in zone show surge multiplier
  7. After duration expires → surge auto-deactivates
  8. Admin can manually deactivate early
  9. Audit log recorded
  DB Transitions: INSERT/UPDATE surge_pricing → INSERT audit_logs
```

### WF-A03: Admin Handles Dispute

```
Preconditions: Rider has filed a dispute
Happy Path:
  1. Admin opens support → disputes tab
  2. Admin sees dispute with ride details, rider message, evidence
  3. Admin reviews ride data (route, GPS, payment, chat)
  4. Admin contacts driver if needed
  5. Admin decides: full refund / partial refund / no refund
  6. Admin enters resolution notes
  7. Admin processes refund
  8. Rider notified: "Your dispute has been resolved. R{amount} refunded."
  9. Dispute status = resolved
  10. Audit log recorded
  DB Transitions: UPDATE disputes → INSERT refunds → UPDATE payments → INSERT audit_logs
```

### WF-A04: Admin Manages Scheduled Rides

```
Preconditions: None
Happy Path:
  1. Admin opens scheduled rides tab
  2. Admin sees list of scheduled rides (pending, active, completed)
  3. Admin can view details, cancel, modify
  4. System auto-dispatches scheduled rides 30 min before
  5. If no driver found 5 min after window → notify rider
  6. If 15 min no driver → auto-cancel, R15 credit
  7. Admin sees missed rides, can manually intervene
```

## 5.4 Dispatcher Workflows

### WF-DISP01: Dispatcher Monitors Live Rides

```
Preconditions: Dispatcher logged in
Happy Path:
  1. Dispatcher opens live monitoring dashboard
  2. Dashboard shows: active rides on map, driver positions, queue depth
  3. Dispatcher can filter by: status, driver, zone
  4. Dispatcher sees alerts: stuck rides (>30 min), SOS, payment failures
  5. Dispatcher can reassign: select ride → "Reassign" → system finds new driver
  6. Dispatcher can override: set ride status manually
  7. All actions logged in audit_logs
```

## 5.5 Support Agent Workflows

### WF-SA01: Support Agent Handles Ticket

```
Preconditions: Ticket assigned to agent
Happy Path:
  1. Agent opens ticket → sees full context (ride details, chat, payment)
  2. Agent communicates with rider via ticket_messages
  3. Agent may need to contact driver (via system message)
  4. Agent resolves issue (refund, explanation, etc.)
  5. Agent enters resolution note
  6. Agent resolves ticket → status = resolved
  7. Rider rates satisfaction
  8. Ticket archived
  DB Transitions: UPDATE support_tickets → INSERT ticket_messages
```

---

# Part 6: South African Compliance

## 6.1 POPIA (Protection of Personal Information Act)

### Lawful Basis for Processing

| Data | Basis | Justification |
|------|-------|---------------|
| Name, phone, email | Contract | Necessary for ride-hailing service delivery |
| Location data | Consent + Contract | Required for ride matching and tracking |
| Payment data | Contract | Required for payment processing |
| ID documents (drivers) | Legal obligation | National Transport Act compliance |
| Emergency contact | Consent | Safety feature, voluntary |
| Marketing preferences | Consent | Optional, withdrawable |
| Ride history | Legal obligation | SARS tax records (5 years) |
| Ratings | Legitimate interest | Service quality improvement |

### Consent Capture

At registration, rider explicitly consents to:
1. Terms of Service (required)
2. Privacy Policy (required)
3. Location tracking (required for service)
4. Marketing communications (optional, default off)
5. Data sharing with service providers (required)

Consent is versioned, timestamped, and logged in `consent_records`.

### Data Subject Rights Implementation

| Right | Endpoint | Process |
|-------|----------|---------|
| Access | `GET /api/v1/compliance/data-export` | Export all user data as JSON within 30 days |
| Rectification | `PUT /api/v1/users/profile` | User can edit profile directly |
| Erasure | `POST /api/v1/compliance/delete-account` | Anonymize within 30 days, keep financial records |
| Restriction | `POST /api/v1/compliance/withdraw-consent` | Withdraw specific consents |
| Portability | `GET /api/v1/compliance/data-export` | JSON format, machine-readable |
| Objection | `POST /api/v1/compliance/withdraw-consent` | Opt-out of marketing, analytics |

### Anonymization Process

When right-to-erasure is exercised:
```
1. Set user.is_anonymized = true
2. Set user.anonymized_at = NOW()
3. Replace name with "Deleted User {uuid_prefix}"
4. Nullify email, phone_number, password
5. Nullify emergency_contact fields
6. Set is_active = false
7. Keep ride records (financial audit obligation)
8. Keep payment records (SARS compliance)
9. Anonymize audit_logs (replace actor_id with 'anonymized')
10. Remove from search indexes within 24 hours
11. Retain anonymized records per data_retention_policies
```

## 6.2 PCI DSS Compliance

### Card Data Handling

**NEVER** store raw card numbers, CVVs, or expiry dates. All card data handled by PayFast/Ozow tokenization.

```
1. Rider enters card details in PayFast/Ozow hosted payment page
2. Gateway returns token (not card data)
3. Token stored in payments.gateway_reference
4. Subsequent charges use token (not raw card)
5. Gateway responses stored in payments.gateway_response (JSONB)
6. gateway_response is audited for card data leaks (no PAN, no CVV in logs)
```

### PCI DSS Level 4 Requirements

| Requirement | Implementation |
|-------------|---------------|
| Install and maintain network security controls | Nginx WAF, firewall rules |
| Apply secure configurations | Docker hardened images, non-root containers |
| Protect stored account data | No card data stored; tokens only |
| Protect card data with encryption | TLS 1.3 for transit; no data at rest |
| Protect systems from malicious software | Container isolation, minimal attack surface |
| Develop secure systems | Laravel security best practices, input validation |
| Restrict access by business need-to-know | RBAC, least-privilege |
| Identify users and authenticate access | JWT + role-based auth |
| Restrict physical access to cardholder data | Cloud provider physical security |
| Log and monitor all access | Audit logs on all payment events |
| Test security regularly | Quarterly ASV scans, annual SAQ |
| Maintain information security policy | Documented, reviewed annually |

### SA Payment Association Requirements

- PCI DSS Level 4 SAQ-A or SAQ-A-EP (since no card data touches our servers)
- Quarterly ASV scan by approved vendor
- Annual Self-Assessment Questionnaire completion
- Compliance certificate displayed on request

## 6.3 SARS Tax Requirements

### VAT (15%)

| Component | VAT Treatment |
|-----------|--------------|
| Platform fee | Subject to 15% VAT |
| Driver earnings | Driver's responsibility (if registered) |
| Fare charged to rider | Includes 15% VAT if platform is VAT-registered |
| Invoice format | SARS-compliant tax invoice |

**Tax Invoice Requirements:**
- Invoice number (sequential)
- Date of issue
- Seller details (company name, registration number, VAT number)
- Buyer details (name, address)
- Description of services
- Amount excluding VAT
- VAT amount (15%)
- Total including VAT
- Currency (ZAR)

### Driver Tax Obligations

- Drivers earning > R50,000/year must register for income tax
- Platform provides annual earnings statement (IT3b equivalent)
- Platform withholds tax if required by SARS
- Driver responsible for own provisional tax payments

## 6.4 National Transport Act Compliance

| Requirement | Implementation |
|-------------|---------------|
| Professional driving permit (PrDP) | Required for all drivers, verified during onboarding |
| Vehicle fitness certificate | Annual inspection, tracked in vehicles table |
| Insurance | Comprehensive insurance required, tracked in insurance_policies |
| Driver licensing | SA driver's license verified via OCR |
| Vehicle age limit | Max 15 years old (configurable per region) |
| Vehicle inspection | Annual, tracked in vehicles.last_inspection_at |

## 6.5 FICA (Financial Intelligence Centre Act) Compliance

| Requirement | Implementation |
|-------------|---------------|
| Identity verification | KYC via document upload + OCR |
| Driver verification | ID document, driver's license, proof of address |
| Rider verification | Phone number verification (OTP) |
| Suspicious transaction reporting | Admin flagging system for unusual patterns |
| Record keeping | 5-year retention of all identity documents |
| Risk assessment | Driver background check status tracked |

---

# Part 7: Ops & Monitoring

## 7.1 Logging Strategy

### Structured JSON Logging

```json
{
  "@timestamp": "2026-07-01T08:15:30.123Z",
  "level": "info",
  "service": "laravel-api",
  "environment": "production",
  "trace_id": "trace_abc123",
  "span_id": "span_def456",
  "context": "ride",
  "message": "Ride completed successfully",
  "ride_id": "ride_xyz",
  "driver_id": "driver_abc",
  "rider_id": "rider_def",
  "fare_amount": 80.00,
  "duration_minutes": 22,
  "distance_km": 12.5,
  "ip_address": "196.23.45.67",
  "user_agent": "EasyRyde-Rider/1.2.0 iOS"
}
```

### PII Masking

```php
// Fields automatically masked in logs:
'phone_number' => '***MASKED***',
'email' => 'j***@***.com',
'id_number' => '***MASKED***',
'password' => '[REDACTED]',
'card_number' => '****-****-****-1234',
'gateway_response' => ['card' => '[REDACTED]']
```

### Correlation IDs

Every request generates a `trace_id` that flows through:
1. Mobile app → HTTP header `X-Trace-ID`
2. Nginx → forwards to Laravel
3. Laravel → logs, Redis pub/sub
4. Socket.io server → logs, WebSocket events
5. Node.js jobs → logs

Enables end-to-end debugging of any request across all services.

## 7.2 Metrics

### Key Metrics (Prometheus)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, endpoint, status | Total API requests |
| `http_request_duration_ms` | Histogram | method, endpoint | API latency distribution |
| `ride_status_changes_total` | Counter | from_status, to_status | Ride state transitions |
| `ride_matching_duration_ms` | Histogram | category | Time to match driver |
| `payment_processing_duration_ms` | Histogram | gateway, method | Payment processing time |
| `payment_failures_total` | Counter | gateway, reason | Payment failure count |
| `active_drivers_gauge` | Gauge | tenant_id | Currently online drivers |
| `active_rides_gauge` | Gauge | tenant_id | Currently active rides |
| `websocket_connections` | Gauge | — | Current WebSocket connections |
| `queue_depth` | Gauge | queue_name | Pending jobs in queue |
| `database_connections` | Gauge | — | Active DB connections |
| `redis_memory_bytes` | Gauge | — | Redis memory usage |
| `surge_multiplier` | Gauge | zone | Current surge multiplier per zone |
| `driver_utilization_ratio` | Gauge | tenant_id | Online drivers with active rides / total online |
| `revenue_per_hour` | Gauge | tenant_id | Hourly revenue |

### Grafana Dashboards

1. **Real-Time Operations** — Active rides, driver positions, queue depth, WebSocket connections
2. **API Performance** — Latency percentiles, error rates, throughput
3. **Payment Health** — Success rates, processing times, gateway comparison
4. **Business Intelligence** — Daily rides, revenue, driver utilization, peak patterns
5. **Infrastructure** — DB connections, Redis memory, CPU, disk

## 7.3 SLOs (Service Level Objectives)

| SLO | Target | Measurement Window | Error Budget |
|-----|--------|-------------------|-------------|
| API availability | 99.9% | 30 days | 43 min downtime |
| API latency p95 | < 200ms | 30 days | 5% of requests |
| API latency p99 | < 500ms | 30 days | 1% of requests |
| Ride matching time | < 5s | 30 days | 5% of matches |
| Payment success rate | > 99.5% | 30 days | 0.5% failures |
| WebSocket uptime | 99.9% | 30 days | 43 min downtime |
| Push notification delivery | > 95% | 7 days | 5% undelivered |

## 7.4 Alerting Rules

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| High API error rate | 5xx > 1% for 5 min | Critical | PagerDuty + Slack |
| API latency spike | p95 > 500ms for 5 min | Warning | Slack |
| Payment gateway down | Success rate < 90% for 5 min | Critical | PagerDuty + Slack |
| Database connections | > 80% pool for 5 min | Warning | Slack |
| Database connections | > 95% pool for 2 min | Critical | PagerDuty |
| Redis memory | > 80% for 10 min | Warning | Slack |
| Queue backlog | > 1000 jobs for 5 min | Warning | Slack |
| Queue backlog | > 5000 jobs for 5 min | Critical | PagerDuty |
| SOS triggered | Any | Critical | PagerDuty + SMS |
| Driver churn | > 10% daily | Warning | Slack (daily report) |
| Cancellation rate | > 30% for 1 hour | Warning | Slack |
| Surge activation | Any | Info | Slack |
| Webhook failures | > 10 dead letters | Warning | Slack |
| Certificate expiry | < 30 days | Warning | Slack |
| Backup failure | Any | Critical | PagerDuty |

## 7.5 Backup Schedule

| Backup Type | Schedule | Retention | Storage |
|-------------|----------|-----------|---------|
| PostgreSQL full dump | Daily 02:00 SAST | 30 days local, 1 year S3 | S3 (encrypted, region: af-south-1) |
| PostgreSQL WAL archiving | Every 5 minutes | 7 days | S3 |
| Weekly full dump | Sunday 03:00 SAST | 12 weeks | S3 |
| Monthly full dump | 1st of month 04:00 | 12 months | S3 |
| Redis RDB snapshot | Every 15 minutes | 24 hours | Docker volume |
| Redis AOF | Every second | 7 days | Docker volume |
| Application config | On change | Git history | Git repository |

### Backup Verification

```
Weekly (Monday 05:00):
1. Restore weekly backup to staging
2. Run smoke tests
3. Verify row counts match production
4. Alert if verification fails
```

## 7.6 Disaster Recovery

| Scenario | RPO | RTO | Method |
|----------|-----|-----|--------|
| Database corruption | 5 min | 1 hour | Point-in-time recovery from WAL |
| Single table drop | 1 hour | 2 hours | Restore from backup, replay WAL |
| Entire region failure | 24 hours | 4 hours | Cross-region S3 restore |
| Ransomware | 1 week | 4 hours | Cold backup restore (offline copy) |
| Application failure | 0 | 5 min | Auto-restart, health check, rollback |
| Redis failure | 0 | 1 min | Failover to replica, rebuild from DB |

### DR Runbook

```
1. Detection: Monitoring alerts → On-call engineer notified
2. Assessment: Determine scope, impact, root cause
3. Containment: Isolate affected systems
4. Recovery:
   a. Database: Restore from latest backup + WAL replay
   b. Application: Deploy from last known good
   c. Cache: Rebuild from database
5. Verification: Run smoke tests, verify data integrity
6. Communication: Update status page, notify affected users
7. Post-mortem: Root cause analysis, prevent recurrence
```

## 7.7 Deployment Checklist & Rollback Plan

### Pre-Deployment Checklist

```
□ All tests passing (unit, integration, E2E)
□ Code review completed and approved
□ Database migrations tested on staging
□ No breaking changes (or migration path documented)
□ Environment variables updated (if needed)
□ API documentation updated
□ Changelog updated
□ Health checks passing on staging
□ Load test completed (if performance-sensitive change)
□ Security scan completed
□ Rollback plan documented
```

### Deployment Steps

```
1. Tag release in Git
2. Build Docker images
3. Push to container registry
4. Run database migrations (if any)
5. Deploy to canary (10% traffic)
6. Monitor for 15 minutes
7. If healthy → deploy to all instances
8. If unhealthy → rollback immediately
9. Verify health checks on production
10. Update deployment log
```

### Rollback Plan

```
If deployment fails:
1. Stop new deployment
2. Revert to previous Docker image tag
3. Rollback database migrations (if non-destructive)
4. If destructive migration: restore from pre-deployment backup
5. Verify health checks
6. Notify team via Slack
7. Conduct post-mortem
```

### Blue-Green Deployment

```
Green (current): Running stable version
Blue (new): Deploying new version

1. Deploy to Blue
2. Run smoke tests on Blue
3. Switch traffic: Green → Blue (Nginx upstream change)
4. Monitor Blue for 30 minutes
5. If healthy: Keep Blue as new Green
6. If unhealthy: Switch back to Green immediately
7. Decommission old Green
```

---

## Appendix A: Entity Relationship Summary

```
Tenant ──┬── User ──┬── DriverProfile
         │          │── Vehicle
         │          │── Wallet ── WalletTransaction
         │          │── Ride (as rider) ──┬── Payment
         │          │                     │── Fare
         │          │                     │── Rating
         │          │                     │── RideChatMessage
         │          │── Ride (as driver)
         │          │── Location
         │          │── ConsentRecord
         │          │── KycVerification
         │          │── Document
         │          │── SosAlert
         │          │── ReferralCode ── ReferralRedemption
         │          │── PushToken
         │          └── Notification
         │
         ├── PoolGroup ──┬── Ride (multiple)
         │               └── Route
         │
         ├── SurgePricing
         ├── PeakHour
         ├── PromoCode ── PromoCodeRedemption
         ├── Geofence
         ├── Setting
         ├── AuditLog
         ├── WebhookEvent
         ├── SupportTicket ── TicketMessage
         ├── Dispute
         ├── Refund
         ├── InsurancePolicy
         ├── IncidentReport
         ├── ScheduledRide
         ├── CashReconciliation
         ├── DriverPayout
         └── DataRetentionPolicy
```

## Appendix B: Index Strategy Summary

| Priority | Table | Index | Rationale |
|----------|-------|-------|-----------|
| P0 | rides | `(status, created_at)` | Pending ride discovery |
| P0 | rides | `(rider_id, status)` | Rider active ride |
| P0 | rides | `(driver_id, status)` | Driver active ride |
| P0 | users | `(role, is_online, is_approved, tenant_id)` | Driver discovery |
| P0 | users | `email` | Login lookup |
| P0 | users | `phone_number` | Login lookup |
| P0 | payments | `(gateway, gateway_reference)` | Webhook dedup |
| P0 | rides | `pickup_location GIST` | PostGIS spatial |
| P1 | pool_groups | `status + tenant_id` | Active pool matching |
| P1 | ride_requests | `pool_status + pickup_location` | Pool search |
| P1 | surge_pricing | `zone_boundary GIST` | Zone containment |
| P1 | locations | `(driver_id, recorded_at)` | GPS history |
| P1 | notifications | `(user_id, is_read, created_at)` | Unread queries |
| P1 | kyc_verifications | `(status, created_at)` | Admin review queue |
| P1 | support_tickets | `(status, priority, created_at)` | Triage queue |
| P1 | audit_logs | `(resource_type, resource_id)` | Audit trail |
| P2 | wallet_transactions | `(wallet_id, created_at)` | Transaction history |
| P2 | webhook_events | `(source, status)` | Failed webhook processing |
| P2 | peak_hours | `(tenant_id, day_of_week, start_time)` | Active peak lookup |

## Appendix C: Scheduled Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| ExpireStaleRideRequests | 1 min | Cancel rides pending > 5 min |
| ProcessPendingDriverPayouts | 1 min | Credit driver wallets |
| UpdateSurgePricing | 5 min | Recalculate surge multipliers |
| CleanupExpiredDriverLocations | 5 min | Mark stale drivers offline |
| RefreshDriverHeatmap | 5 min | Rebuild materialized view |
| GenerateHourlyAnalytics | 60 min | Aggregate stats for dashboards |
| CheckDocumentExpirations | 60 min | Alert on expiring documents |
| RetryFailedWebhooks | 60 min | Retry up to 24h back |
| GenerateDailyReports | Daily 00:30 | Build ops report, email admins |
| ExpirePromoCodes | Daily 01:00 | Deactivate expired promos |
| CleanupAuditLogs | Daily 02:00 | Archive logs > 90 days |
| ProcessDriverSettlements | Daily 03:00 | Weekly payout batch |
| CleanupLocations | Daily 03:30 | Delete GPS data > 90 days |
| CleanupChatMessages | Daily 04:00 | Delete messages > 30 days |
| SendWeeklyDriverReports | Weekly Mon 06:00 | Earnings summary to drivers |
| GenerateMonthlyInvoices | Monthly 1st 04:00 | SARS-compliant invoices |
| CheckPeakHourSchedules | Every 5 min | Activate/deactivate peaks |
| DatabaseBackup | Daily 02:00 | Full pg_dump |
| BackupVerification | Weekly Mon 05:00 | Restore + smoke test |

---

*This document is the authoritative design specification for EasyRyde v2.0. All prior plan documents are superseded by this specification for any conflicting requirements.*
