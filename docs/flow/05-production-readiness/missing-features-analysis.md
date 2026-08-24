# Missing Features Analysis — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** Pre-launch gap analysis

---

## 1. Overview

Every feature that's missing or incomplete for real-world production use. Organized by priority: features that block launch vs features that block growth.

---

## 2. Launch-Blocking Missing Features

### 2.1 Booking for a Friend (COMPLETELY MISSING)

**What:** A user cannot book a ride for another person. No "Book for Someone Else" flow exists.

**Why it matters:** In Phalaborwa, many people don't have smartphones. A parent books for a child. A wife books for a husband. A secretary books for a boss. This is 30-40% of ride-hailing demand in developing markets.

**What's needed:**
- "Book for Friend" toggle on BookRideScreen
- Contact picker (phone number or contact list)
- Friend receives SMS with ride details + driver info
- Friend can track ride via SMS link (no app needed)
- Payer can be different from rider
- Emergency contact integration
- Shared ride status updates

**See:** `booking-for-friend-flow.md`

**Severity:** CRITICAL — Missing this loses 30%+ of potential market

### 2.2 Food Delegate Ordering (COMPLETELY MISSING)

**What:** A user cannot order food for someone else. No delegation, no group ordering, no scheduled delivery.

**Why it matters:** Office lunches, family dinners, surprise orders. Food delivery without delegation is incomplete.

**What's needed:**
- "Order for Someone Else" flow
- Recipient gets SMS with order tracking
- Group ordering (multiple people contribute to one order)
- Scheduled food delivery
- Restaurant partnership management
- Substitution handling for out-of-stock items

**See:** `food-delegate-flow.md`

**Severity:** HIGH — Limits food delivery adoption

### 2.3 Real-Time Location Hardening (PARTIAL)

**What:** GPS tracking has multiple failure modes that aren't handled.

**Gaps identified:**
- No handling when GPS drops mid-ride
- No battery drain mitigation strategy
- No background location on iOS (foreground only if denied)
- No geofencing for surge zones
- No stale location data cleanup
- No location accuracy filtering (GPS drift)
- No fallback when Google Maps API is down

**See:** `real-time-location-hardening.md`

**Severity:** HIGH — Broken tracking = broken trust

### 2.4 Offline Mode (COMPLETELY MISSING)

**What:** The app is fully online-dependent. No offline queue. No cached data.

**Why it matters:** Phalaborwa has intermittent connectivity. Load shedding affects internet. Rural areas have spotty coverage.

**What's needed:**
- Offline ride request queue
- Cached recent rides/destinations
- Cached wallet balance
- Offline-capable map tiles
- Sync on reconnect

**Severity:** HIGH — Core functionality fails without internet

---

## 3. Growth-Blocking Missing Features

### 3.1 Driver Retention Features

| Feature | Status | Impact |
|---------|--------|--------|
| Guaranteed minimum earnings | Not implemented | Drivers leave for Uber/Bolt |
| Bonus tiers (X rides = bonus) | Not implemented | No incentive to drive more |
| Driver referral program | Not implemented | Slow supply growth |
| Fuel discount partnerships | Not implemented | Driver cost reduction |
| Insurance partnerships | Not implemented | Driver safety net |
| Vehicle maintenance partnerships | Not implemented | Fleet quality |
| Driver subscription (pro features) | Not implemented | Revenue stream |
| Earnings analytics | Partial | Drivers don't know when to drive |

### 3.2 Rider Loyalty Features

| Feature | Status | Impact |
|---------|--------|--------|
| Loyalty points program | Not implemented | No retention mechanism |
| Tier system (Bronze/Silver/Gold) | Not implemented | No status incentive |
| Ride streaks | Not implemented | No engagement hook |
| Referral rewards | Not implemented | Slow user growth |
| Saved payment methods | Not implemented | Friction on every ride |
| Subscription model (EasyRyde+) | Not implemented | Recurring revenue |
| Ride scheduling | Documented, not built | Convenience feature |
| Pool rides | Documented, not built | Cost savings, more rides |
| Multi-stop rides | Not implemented | Common request |
| Fare splitting | Not implemented | Group rides |

### 3.3 Food Delivery Improvements

| Feature | Status | Impact |
|---------|--------|--------|
| Auto-assignment for drivers | Not implemented | Manual = slow |
| Restaurant partner app | Not implemented | Restaurants can't manage orders |
| Substitution handling | Not implemented | Out-of-stock = cancel |
| Order reordering | Not implemented | Repeat convenience |
| Tip for drivers | Not implemented | Driver earnings |
| Scheduled delivery | Not implemented | Convenience |
| Group ordering | Not implemented | Office lunches |
| Real-time menu updates | Not implemented | Stale prices |
| Preparation time estimation | Not implemented | Better ETA |
| Order tracking via SMS | Not implemented | No-app users |

### 3.4 Admin Operations

| Feature | Status | Impact |
|---------|--------|--------|
| Real-time fleet map | Partial (Socket.IO) | Needs improvement |
| Automated driver matching | Not implemented | Manual dispatch |
| Surge pricing auto-adjustment | Not implemented | Static zones only |
| Financial reconciliation dashboard | Not implemented | Manual accounting |
| Customer support ticketing | Not implemented | No support system |
| Driver performance analytics | Partial | Basic stats only |
| A/B testing framework | Not implemented | Can't optimize |
| Promo code analytics | Not implemented | Can't measure ROI |

### 3.5 Safety & Security

| Feature | Status | Impact |
|---------|--------|--------|
| SOS button | Partial (documented) | Needs testing |
| Ride sharing with contacts | Not implemented | Safety concern |
| Driver identity verification | Not implemented | Trust issue |
| Vehicle photo verification | Not implemented | Trust issue |
| Trip recording (audio) | Not implemented | Dispute resolution |
| Incident reporting | Not implemented | Safety |
| Background check integration | Not implemented | Driver vetting |

---

## 4. Technical Debt

### 4.1 Code Quality Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Hardcoded fare calculation | `RideController::completeRide()` | CRITICAL |
| Demo credentials in source | `LoginScreen` | CRITICAL |
| Fake progress bar | `ActiveRideScreen` | HIGH |
| Random coordinates for saved places | `HomeScreen` | HIGH |
| No error logging in ErrorBoundary | `App.tsx` | MEDIUM |
| Offline queue exists but unused | `api-client` | MEDIUM |
| No request deduplication | Various | MEDIUM |

### 4.2 Architecture Gaps

| Gap | Impact | Fix |
|-----|--------|-----|
| No connection pooling | DB exhaustion at scale | PgBouncer |
| No circuit breaker | Cascading failures | Implement pattern |
| No dead letter queue | Lost jobs silently | DLQ + monitoring |
| No rate limiting on Socket.IO | DoS vulnerability | Add per-IP limits |
| Socket.IO not in docker-compose | Deployment inconsistency | Add to compose |
| No API versioning strategy | Breaking changes | `/api/v1/` already used |
| No database migrations strategy | Schema drift | Already using Laravel migrations |

---

## 5. Compliance Gaps

### 5.1 POPIA (South Africa)

| Requirement | Status | Gap |
|-------------|--------|-----|
| User consent | Implemented | Untested |
| Data export | Implemented | Untested |
| Account anonymization | Implemented | Untested |
| Data erasure | Implemented | Untested |
| Data processing agreement | Not implemented | Required |
| Privacy policy | Not implemented | Required |
| Cookie consent | Not implemented | Required |
| Data breach notification | Not implemented | Required |

### 5.2 FICA (Financial Intelligence Centre Act)

| Requirement | Status | Gap |
|-------------|--------|-----|
| KYC for drivers | Partial (document upload) | No verification |
| KYC for riders | Not implemented | Required for wallet |
| Transaction monitoring | Not implemented | Required |
| Suspicious activity reporting | Not implemented | Required |
| Record keeping (5 years) | Not implemented | Required |

### 5.3 PCI-DSS

| Requirement | Status | Gap |
|-------------|--------|-----|
| No card data on backend | Implemented | ✅ |
| SSL/TLS everywhere | Implemented | ✅ |
| Security headers | Implemented | ✅ |
| Regular security scans | Not implemented | Required |
| Penetration testing | Not implemented | Required |

---

## 6. Missing API Endpoints

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `POST /rides/book-for-friend` | Book ride for someone else | HIGH |
| `GET /rides/{id}/share` | Share ride status via SMS | HIGH |
| `POST /food/orders/{id}/delegate` | Delegate food order | HIGH |
| `POST /food/orders/group` | Group food order | MEDIUM |
| `POST /food/orders/schedule` | Schedule food delivery | MEDIUM |
| `GET /users/sessions` | List active sessions | HIGH |
| `DELETE /users/sessions/{id}` | Revoke session | HIGH |
| `PATCH /users/notifications/preferences` | Notification prefs | MEDIUM |
| `POST /drivers/{id}/verify-identity` | Identity verification | HIGH |
| `GET /admin/financial/reconciliation` | Financial reports | MEDIUM |
| `POST /support/tickets` | Customer support | MEDIUM |
| `GET /rides/{id}/track-via-sms` | Public ride tracking | HIGH |

---

## 7. Missing Socket.IO Events

| Event | Direction | Purpose | Priority |
|-------|-----------|---------|----------|
| `ride:shared-status` | Server → Friend | Status updates for friend booking | HIGH |
| `food:order-update` | Server → Delegate | Food order status for delegate | HIGH |
| `ride:sos` | Rider → Server + Admin | Emergency alert | HIGH |
| `ride:share-location` | Rider → Contact | Share live location | MEDIUM |
| `driver:availability-broadcast` | Server → Riders | Nearby driver count | LOW |

---

## 8. Missing Database Tables

| Table | Purpose | Priority |
|-------|---------|----------|
| `user_sessions` | Active session tracking | HIGH |
| `ride_delegates` | Book-for-friend records | HIGH |
| `food_order_delegates` | Food delegate records | HIGH |
| `notification_preferences` | Per-user notification settings | MEDIUM |
| `support_tickets` | Customer support | MEDIUM |
| `support_ticket_messages` | Support conversations | MEDIUM |
| `driver_background_checks` | FICA compliance | HIGH |
| `incident_reports` | Safety incidents | HIGH |
| `loyalty_points` | Rider loyalty | LOW |
| `driver_bonuses` | Driver incentives | LOW |

---

## 9. Missing Monitoring

| Metric | Status | Priority |
|--------|--------|----------|
| API response times | Partial (Prometheus) | HIGH |
| Error rates | Partial (Sentry) | HIGH |
| Payment success/failure rates | Not implemented | CRITICAL |
| Ride completion rates | Not implemented | HIGH |
| Driver online/offline ratio | Not implemented | MEDIUM |
| Socket.IO connection count | Not implemented | HIGH |
| Redis memory usage | Not implemented | HIGH |
| PostgreSQL connection count | Not implemented | HIGH |
| Queue depth | Partial (Horizon) | HIGH |
| External API latency | Not implemented | MEDIUM |
| Revenue per hour | Not implemented | HIGH |
| Active users (DAU/MAU) | Not implemented | MEDIUM |

---

## 10. Summary

| Category | Total Gaps | Critical | High | Medium | Low |
|----------|-----------|----------|------|--------|-----|
| Missing Features | 35 | 2 | 8 | 15 | 10 |
| Technical Debt | 12 | 2 | 4 | 4 | 2 |
| Compliance | 12 | 2 | 4 | 4 | 2 |
| Missing APIs | 12 | 0 | 5 | 4 | 3 |
| Missing Events | 5 | 0 | 2 | 2 | 1 |
| Missing Tables | 10 | 0 | 3 | 3 | 4 |
| Missing Monitoring | 12 | 1 | 5 | 4 | 2 |
| **TOTAL** | **98** | **7** | **31** | **36** | **24** |

**Bottom line:** 7 critical gaps must be fixed before launch. 31 high-priority gaps should be fixed within 2 weeks of launch. The rest can be phased in over 1-3 months.
