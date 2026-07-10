# Phase 1: Requirements Expansion

**Version:** 1.0.0
**Created:** 2026-07-08T16:05:00Z
**Status:** Draft
**Superpowers Phase:** 1 of 8 — Requirements Expansion (Mandatory)
**Prepared by:** opencode
**Sources:** functional-spec.md, user-personas.md, non-functional-spec.md, compliance-spec.md, final.md, security-assessment.md, MASTER_PROJECT_PLAN.md, PRODUCTION_PLAN.md

---

## Summary

EasyRyde is a production-ready ride-hailing and food delivery platform for Phalaborwa, Limpopo, South Africa. It serves three user types: Riders (riders requesting transport), Drivers (private or fixed-salary), and Admins (single-admin control model). The platform operates in a real-money, real-client context with South African regulatory requirements (POPIA, FICA, PCI-DSS, SA Tax, SA Labour Law). Phalaborwa-specific constraints include: 87% Black population, 52% female, median income R24,700/year, R25-50/GB data pricing, 76% Android penetration, 31% entry-level smartphone tier, and low-signal areas requiring offline-tolerant flows.

---

## 1. Actors

### 1.1 Primary Actors

| Actor | Role | Device | Key Needs |
|-------|------|--------|-----------|
| **Rider** (Thandi) | Request rides, pay fares, rate drivers | Samsung A02-A14 (Android 8+), limited data (R200/month prepaid) | Fast booking, cash payment option, safety sharing, advance scheduling |
| **Driver** (Johannes) | Accept rides, navigate, collect fares, receive payouts | Tecno/Samsung mid-range, dual SIM, R100 data bundle per 3 days | Flexible hours, weekly payouts, fair dispatch, earnings visibility |
| **Admin** (Maria) | Manage platform: pricing, drivers, compliance, incidents, payouts | Desktop browser + tablet | Full ops visibility, audit trails, bulk actions, incident response |

### 1.2 Secondary Actors

| Actor | Role | Interaction |
|-------|------|-------------|
| **System** | Automated processes | Surge calculation, driver matching, scheduled ride dispatch, payout batching, data retention |
| **Payment Gateway** (PayFast/Ozow) | Process payments | Redirect-based EFT, webhook confirmations, refund processing |
| **SMS Provider** | Deliver OTPs, alerts | Programmable SMS (Twilio/Clickatell) for OTP, SOS alerts |
| **Push Notification** (FCM) | Deliver push notifications | Ride status, driver arrival, new ride requests, SOS |
| **GPS/Geocoding** (Nominatim) | Address lookup, routing | Forward/reverse geocoding, OSRM route calculation |
| **External Regulators** | POPIA, FICA, SARS, CCMA | Compliance reporting, data subject requests, breach notification |

### 1.3 Actor Consent Requirements

| Actor | Consent Types | Withdrawal |
|-------|--------------|------------|
| Rider | Registration consent, data processing, location tracking, marketing comms | In-app settings: "Withdraw consent" → 30-day anonymisation schedule |
| Driver | Registration consent, FICA document processing, background check, location tracking, earnings data sharing | In-app settings + written notification to Information Officer |
| Admin | Staff monitoring, audit logging | Employment contract (no withdrawal — legitimate interest) |

---

## 2. User Stories

### 2.1 Rider User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-R01 | As a rider, I want to register with my phone number so I can book rides | Enter SA mobile → 6-digit OTP → profile setup → account created. Support +27 format. | P0 |
| US-R02 | As a rider, I want to book a ride quickly so I don't miss my shift | Enter pickup/drop-off → see fare estimate → confirm → matched in <15 seconds (target) | P0 |
| US-R03 | As a rider, I want to pay with cash because I budget in cash | Select "Cash" payment → ride completes → driver confirms cash receipt → no card charged | P0 |
| US-R04 | As a rider, I want to see my driver's details before riding so I feel safe | After match: driver photo, name, car model, plate number, rating, ETA displayed | P0 |
| US-R05 | As a rider, I want to share my live location with my mother so she knows I'm safe | Tap "Share Ride" → generate WhatsApp/SMS link → live tracking until ride ends → link expires | P0 |
| US-R06 | As a rider, I want to schedule a ride for tomorrow morning so I don't worry about taxis | Select future time (1-72h) → confirm → system dispatches 15 min before → driver assigned 5 min before | P1 |
| US-R07 | As a rider, I want to rate my driver after the ride so good drivers are rewarded | 1-5 stars + optional comment → prompted within 2 min of ride end → affects driver rating | P1 |
| US-R08 | As a rider, I want to see my ride history so I can track my spending | Paginated list → filter by date/status → tap for receipt details → rebook option | P1 |
| US-R09 | As a rider, I want to send an SOS alert if I feel unsafe during a ride | Red button → sends location every 5s to admin + SMS alert → admin calls within 30s → "Help is on the way" | P0 |
| US-R10 | As a rider, I want to chat with my driver during the ride so I can clarify directions | In-app chat → only during ACTIVE ride → admin can view if flagged → message delivery <200ms | P1 |
| US-R11 | As a rider, I want to receive a digital receipt after my ride so I have proof of payment | PDF receipt generated on completion → email + SMS + in-app → shows distance, fare breakdown, VAT | P1 |
| US-R12 | As a rider, I want to add trusted contacts who auto-receive my ride details | Add up to 5 contacts → opt-in per ride → auto-share when ride starts → opt-out anytime | P2 |
| US-R13 | As a rider, I want to use the app even with intermittent connectivity | Offline: cached map tiles, cached last 20 rides, "No connection" banner → queue actions → sync on reconnect | P1 |
| US-R14 | As a rider, I want to self-delete my account because I want to leave the platform | Self-service deletion → re-authenticate → financial records anonymised → non-financial data purged within 30 days | P1 |

### 2.2 Driver User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-D01 | As a driver, I want to go online/offline with one tap so I control my hours | Tap toggle → Online: eligible for requests → Offline: no requests. Auto-offline after 3 consecutive rejects or 30 min idle. | P0 |
| US-D02 | As a driver, I want to see ride details before accepting so I can decide if it's worth my time | Notification: pickup location, estimated distance, estimated fare, rider rating → 30s countdown → accept/reject | P0 |
| US-D03 | As a driver, I want to navigate to pickup and drop-off using Google Maps | Deep link to Google Maps/Waze with coordinates → opens navigation → returns to app after | P0 |
| US-D04 | As a driver, I want to see my earnings in real time so I know if I'm meeting my target | Today/week/month view → gross fare, platform fee, net earnings, ride count, hours online → auto-refresh | P0 |
| US-D05 | As a driver, I want to receive a weekly payout so I can pay my family's bills | Every Monday: calculate Mon-Sun earnings → batch process → bank deposit within 24h → driver notified | P0 |
| US-D06 | As a driver, I want to report when a rider pays me cash so the system tracks it | Rider pays cash → driver taps "Received Cash" → payment recorded → earnings updated | P0 |
| US-D07 | As a driver, I want to manage my documents (license, insurance) in the app | Upload/renew docs → expiry tracking → 30-day reminder → cannot accept rides if expired >7 days | P1 |
| US-D08 | As a driver, I want to see a weekly statement PDF so I can file my taxes | Auto-generated Monday → PDF available in-app → shows all rides, fees, net amount, payout status | P1 |
| US-D09 | As a driver, I want to send an SOS alert if a rider threatens me | Red button on ride screen → sends location + ride details to admin → admin calls within 30s | P0 |
| US-D10 | As a driver, I want the app to work with low data because data is expensive in Phalaborwa | Data-efficient mode: compressed images, batched location updates, reduce map detail on 2G/3G | P1 |
| US-D11 | As a driver, I want to request payout of my available balance when I need it | Min R100 → request payout → processed within 24h (automated) or next business day | P1 |
| US-D12 | As a driver, I want the app to notify me after 12 hours so I don't drive exhausted | After 12h continuous online: notification → "Consider taking a break" → auto-offline after 14h (with override) | P2 |

### 2.3 Admin User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-A01 | As an admin, I want a live dashboard with KPIs so I can see everything at a glance | Rides today, revenue, active drivers, cancellation %, avg wait time, avg rating → auto-refresh 30s | P0 |
| US-A02 | As an admin, I want to approve/reject driver applications efficiently | View uploaded docs side-by-side → approve/reject with reason → driver notified | P0 |
| US-A03 | As an admin, I want to set pricing per zone so I can optimize for township vs CBD vs mine | Rate card editor: per-km, per-min, base fare, min fare by ride type → preview impact on example trip | P0 |
| US-A04 | As an admin, I want to see an audit trail for all actions so I can investigate issues | Every admin action logged: who, what, when, IP, diff → searchable, filterable, exportable | P0 |
| US-A05 | As an admin, I want to handle SOS alerts immediately with full context | Alert panel: rider/driver details, live GPS, ride timeline, chat transcript → call within 30s → resolve with notes | P0 |
| US-A06 | As an admin, I want to process weekly driver payouts in a batch | Review payout queue → approve → batch processed via payment gateway → success/failure tracking | P0 |
| US-A07 | As an admin, I want to create and track promo codes for marketing | Create: type (fixed/percentage/free ride), value, max uses, expiry, min fare → track usage and conversion | P1 |
| US-A08 | As an admin, I want to manage food delivery orders and restaurants | Restaurant CRUD, menu management, order status tracking, delivery driver assignment | P1 |
| US-A09 | As an admin, I want to view compliance reports (POPIA, FICA) | Exportable reports: FICA status, document expiry, KYC completeness, retention compliance | P1 |
| US-A10 | As an admin, I want to suspend/reactivate users with audit trail | Immediate suspension with reason → user notified → re-activate with audit trail → compliance report | P1 |
| US-A11 | As an admin, I want to respond to data subject requests (POPIA) within 72 hours | Data export: automated JSON endpoint. Deletion: verify identity → anonymise → confirm within 72h SLA | P1 |
| US-A12 | As an admin, I want to generate weekly/monthly reports without dev help | Pre-built report templates: revenue, rides, drivers, compliance → export CSV/PDF → email to stakeholders | P2 |

---

## 3. Functional Requirements

### 3.1 Authentication Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-AUTH-01 | Rider registration (phone) | SA mobile number → 6-digit OTP via SMS → verify → name + email (optional) → account created. OTP expires 5 min. 3 retries max. | functional-spec:AUTH-R-01 |
| FR-AUTH-02 | Rider registration (Google SSO) | OAuth flow → profile pre-filled → phone verification required → account created | functional-spec:AUTH-R-02 |
| FR-AUTH-03 | Rider registration (Apple SSO) | Same as Google but Apple-only on iOS. Required by App Store. | functional-spec:AUTH-R-03 |
| FR-AUTH-04 | Rider login | Phone + OTP or SSO. Token-based session (7-day expiry). Remember device. | functional-spec:AUTH-R-04 |
| FR-AUTH-05 | Password reset | Email-based reset link → new password → confirm → token invalidated. 60-min expiry. | functional-spec:AUTH-R-05 |
| FR-AUTH-06 | Profile management | Update name, email, phone, emergency contacts, default payment method | functional-spec:AUTH-R-06 |
| FR-AUTH-07 | Account deletion (self-service) | Verify identity → financial records anonymised → non-financial data purged within 30 days (POPIA) | functional-spec:AUTH-R-07 |
| FR-AUTH-08 | Driver registration | Phone + email + password → upload ID doc → upload license → upload vehicle papers → submit for approval | functional-spec:AUTH-D-01 |
| FR-AUTH-09 | Driver login | Phone/email + password. JWT token. Must be approved + not suspended. Max 1 active session. | functional-spec:AUTH-D-02 |
| FR-AUTH-10 | Admin creates driver | Admin fills details → system sends invite link → driver sets password → KYC required before activation | functional-spec:AUTH-D-03 |
| FR-AUTH-11 | Admin login | Email + password + TOTP 2FA. IP-restricted access. | functional-spec:AUTH-A-01 |
| FR-AUTH-12 | Role-based access | Super Admin, Ops Admin, Finance Admin, Support Admin. Granular CRUD permissions per module. | functional-spec:AUTH-A-02 |
| FR-AUTH-13 | Admin audit log | Every login, action, config change logged: timestamp, admin ID, IP, diff | functional-spec:AUTH-A-03 |
| FR-AUTH-14 | Token format | Sanctum token, 7-day expiry (mobile). SPA session cookie (admin web). Refresh by re-login. | functional-spec:AUTH-01, security-model |
| FR-AUTH-15 | Rate limiting | 10 req/min on auth endpoints. 60/min general. 3 OTP/10min per phone. Redis-backed. | functional-spec:AUTH-02 |
| FR-AUTH-16 | Device fingerprint | Login records device ID + user agent + IP. Flag unknown devices. | functional-spec:AUTH-03 |

### 3.2 Ride Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-RIDE-01 | Fare estimate | Pickup + drop-off → OSRM real road distance → rate card + time multiplier → price breakdown. ±20% tolerance. | functional-spec:RIDE-01, final.md:§2 |
| FR-RIDE-02 | Ride type selection | Economy, Standard, Premium, XL → prices update live. Per-type rate cards in SystemSetting table. | functional-spec:RIDE-02 |
| FR-RIDE-03 | Surge pricing | Dynamic multiplier (1.0x-2.5x): time of day, demand ratio, special events. Show surge indicator to rider before booking. | functional-spec:RIDE-03 |
| FR-RIDE-04 | Request ride | Confirm → SEARCHING state → broadcast to nearby drivers (3km, expand 1km/15s up to 8km) | functional-spec:RIDE-04, final.md:§3 |
| FR-RIDE-05 | Driver matching | Nearest available (online, not on ride) within 3km. Expand radius by 1km every 15s. Max 8km. First-to-accept wins (atomic DB). | functional-spec:RIDE-05 |
| FR-RIDE-06 | 60-second timeout | No driver accepts in 60s → "No drivers available, try again later" → auto-cancel `no_driver` status | functional-spec:RIDE-06 |
| FR-RIDE-07 | Arrived notification | Push + SMS: "Your driver [name] has arrived in [car model] [plate]" | functional-spec:RIDE-07 |
| FR-RIDE-08 | 5-minute grace timer | Driver waits 5 min after ARRIVED. Timer displayed to both. Rider doesn't appear → driver can cancel with fee. | functional-spec:RIDE-08 |
| FR-RIDE-09 | Live fare metering | During IN_PROGRESS: fare updates every 30s based on actual GPS distance + time | functional-spec:RIDE-09 |
| FR-RIDE-10 | Final fare calculation | Base + distance (actual GPS path) + time (actual duration) + surge. Within 20% of estimate or adjustment. | functional-spec:RIDE-10 |
| FR-RIDE-11 | Cancellation (rider) | Before driver ARRIVED: free. After ARRIVED: R15 fee. Rider selects reason. | functional-spec:RIDE-11 |
| FR-RIDE-12 | Cancellation (driver) | 1% cancellation rate allowed. >1% → reduced dispatch priority for 24h. Driver selects reason. | functional-spec:RIDE-12 |
| FR-RIDE-13 | Rating | 1-5 stars + optional comment for both. Prompted within 2 min of ride end. Affects driver rating. | functional-spec:RIDE-13 |
| FR-RIDE-14 | Digital receipt | Generated on completion. Distance, time, base fare, per-km, per-min, surge, platform fee, total. PDF + email + in-app. | functional-spec:RIDE-14 |
| FR-RIDE-15 | Ride history | Paginated list. Filter by date/status. Tap for details, receipt, rebook. | functional-spec:RIDE-15 |
| FR-RIDE-16 | Rebook | One-tap from history — same pickup/drop-off, same ride type. | functional-spec:RIDE-16 |
| FR-RIDE-17 | Schedule ride | Select future time (1-72h). Confirm availability. Dispatch 15 min before. Driver assigned 5 min before or rider notified. | functional-spec:RIDE-17, final.md:§7 |
| FR-RIDE-18 | Cancellation reasons | Enum: `driver_not_responding`, `long_wait`, `changed_mind`, `accidental_request`, `other`. Required on cancel. | final.md:§7 |

### 3.3 Driver Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-DRV-01 | Go online/offline | One-tap toggle. Auto-offline after 3 consecutive rejects or 30 min idle. | functional-spec:DRV-01, DRV-02 |
| FR-DRV-02 | Ride request notification | Sound + vibration + heads-up. Pickup, estimated distance, estimated fare, rider rating. 30s countdown. | functional-spec:DRV-03, DRV-04 |
| FR-DRV-03 | Busy mode | After accepting ride → unavailable for new requests until ride completes. | functional-spec:DRV-05 |
| FR-DRV-04 | Navigate to pickup/drop-off | Deep link to Google Maps/Waze with coordinates. | functional-spec:DRV-06, DRV-07 |
| FR-DRV-05 | Live GPS reporting | 5-second intervals during ACTIVE ride. Aggregated to 10s for rider view. Background tracking with `expo-location`. | functional-spec:DRV-08, final.md:§4 |
| FR-DRV-06 | Earnings dashboard | Today/week/month. Gross fare, platform fee, net earnings, ride count, hours online. | functional-spec:DRV-09 |
| FR-DRV-07 | Trip earnings detail | Per-ride: fare, distance, time, tip, platform fee. | functional-spec:DRV-10 |
| FR-DRV-08 | Weekly statement | Auto-generated Monday. PDF in-app. All rides, fees, net amount, payout status. | functional-spec:DRV-11 |
| FR-DRV-09 | Payout request | Min R100. Processed within 24h or next business day. 3 retries on failure. | functional-spec:DRV-12 |
| FR-DRV-10 | Vehicle management | Make, model, year, colour, plate, photos (exterior, interior). | functional-spec:DRV-13 |
| FR-DRV-11 | Document management | Upload/renew: license, registration, insurance, permit. Expiry tracking + 30-day reminder. Cannot ride if expired >7 days. | functional-spec:DRV-14 |
| FR-DRV-12 | Profile | Photo, bio, language preference, bank details (for payouts). | functional-spec:DRV-15 |

### 3.4 Payment Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-PAY-01 | Cash payment | Rider pays driver in cash → driver confirms "received" in app → no gateway charge. | functional-spec:PAY-04, final.md:§5 |
| FR-PAY-02 | PayFast EFT | Redirect to PayFast → EFT/deposit → webhook confirms payment. | functional-spec:PAY-02 |
| FR-PAY-03 | Ozow instant EFT | Redirect to Ozow → bank auto-login → confirm → webhook confirms. | functional-spec:PAY-03 |
| FR-PAY-04 | Wallet | Top-up via any digital method. Balance shown at booking. Auto-use before other methods. | functional-spec:PAY-05 |
| FR-PAY-05 | Auto-charge (digital) | On COMPLETED: charge rider's selected payment method. | functional-spec:PAY-06 |
| FR-PAY-06 | Escrow hold | Charge goes to EasyRyde holding account. Held 24h before released to driver escrow. | functional-spec:PAY-07 |
| FR-PAY-07 | Escrow release | 24h after completion: funds move from holding to driver available balance. | functional-spec:PAY-08 |
| FR-PAY-08 | Payment failure | If charge fails → notify rider → retry link. 3 failures → restrict account. | functional-spec:PAY-09 |
| FR-PAY-09 | Refund | Admin initiates: full or partial. Rider notified. Driver balance adjusted. | functional-spec:PAY-10 |
| FR-PAY-10 | Weekly payout batch | Every Monday: calculate Mon-Sun earnings → batch process → bank deposit. | functional-spec:PAY-11 |
| FR-PAY-11 | Payout reporting | Admin sees: total amount, driver count, success/failure rate, transaction IDs. | functional-spec:PAY-12 |
| FR-PAY-12 | Failed payout retry | Notify driver + admin. 3 retry attempts. | functional-spec:PAY-13 |

### 3.5 Food Delivery Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-FOOD-01 | Restaurant registration | Admin creates: name, address, GPS, contact, hours, cuisine, photos. | functional-spec:FOOD-01 |
| FR-FOOD-02 | Menu management | Categories, items, modifiers (size, extras), prices, photos, availability. | functional-spec:FOOD-02 |
| FR-FOOD-03 | Restaurant dashboard | Web: view orders, mark status, update availability. | functional-spec:FOOD-03 |
| FR-FOOD-04 | Browse restaurants | List with search, filter by cuisine, rating, distance. | functional-spec:FOOD-04 |
| FR-FOOD-05 | View menu | Categories, descriptions, photos, modifiers, special instructions. | functional-spec:FOOD-05 |
| FR-FOOD-06 | Cart | Add/remove items, quantities, total. Delivery address + special instructions. | functional-spec:FOOD-06 |
| FR-FOOD-07 | Place order | Confirm cart → payment → order placed → PENDING. | functional-spec:FOOD-07 |
| FR-FOOD-08 | Order tracking | Real-time status + driver location after pickup. | functional-spec:FOOD-08 |
| FR-FOOD-09 | Driver assignment | After PREPARING: find nearest available driver, assign for pickup. | functional-spec:FOOD-09 |
| FR-FOOD-10 | Delivery fee | Restaurant → customer distance × per-km rate. | functional-spec:FOOD-10 |
| FR-FOOD-11 | Rating | Rate food (1-5) and delivery (1-5) separately after DELIVERED. | functional-spec:FOOD-11 |

### 3.6 Admin Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-ADM-01 | KPI dashboard | Live: rides today, revenue, active drivers, cancellation %, avg wait, avg rating. Auto-refresh 30s. | functional-spec:ADM-01 |
| FR-ADM-02 | Charts | 24h ride volume, 7-day revenue, driver online count, cancellation reasons. | functional-spec:ADM-02 |
| FR-ADM-03 | Alert panel | System alerts, SOS incidents, failed payments, driver disputes. | functional-spec:ADM-03 |
| FR-ADM-04 | Rider management | Search, filter (active/suspended/deleted), sort, profile view. | functional-spec:ADM-04 |
| FR-ADM-05 | Driver management | Search, filter (pending/active/suspended/approved), KYC status, profile + docs. | functional-spec:ADM-05 |
| FR-ADM-06 | Driver approval | View docs side-by-side. Approve/reject with reason. | functional-spec:ADM-06 |
| FR-ADM-07 | Suspend/reactivate user | Immediate suspension with reason → notified → re-activate with audit trail. | functional-spec:ADM-07 |
| FR-ADM-08 | Rate card editor | Edit per-km, per-min, base, min fare by ride type. Preview impact. | functional-spec:ADM-08 |
| FR-ADM-09 | Surge config | Enable/disable, max multiplier, time-based schedule. | functional-spec:ADM-09 |
| FR-ADM-10 | Promo codes | Type (fixed/percentage/free ride), value, max uses, expiry, min fare. | functional-spec:ADM-10 |
| FR-ADM-11 | Audit log | All admin actions: who, what, when, IP, diff. Searchable, filterable, exportable. | functional-spec:ADM-11 |
| FR-ADM-12 | Incident management | SOS alerts, dispute reports. Timeline view. Resolution workflow. | functional-spec:ADM-12 |
| FR-ADM-13 | KYC report | All drivers: doc status, expiry dates, verification status. Export CSV. | functional-spec:ADM-13 |
| FR-ADM-14 | Data retention | Auto-purge per retention schedule. Admin views purge log. | functional-spec:ADM-14 |
| FR-ADM-15 | Payout queue | Weekly pending payouts. Total + per-driver breakdown. | functional-spec:ADM-15 |
| FR-ADM-16 | Process payout | Admin reviews → approves → batch via payment gateway. | functional-spec:ADM-16 |
| FR-ADM-17 | Payout history | All past payouts: status, date, amount, driver list. | functional-spec:ADM-17 |

### 3.7 Safety Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-SFT-01 | SOS button (rider) | Red button on ride screen. Sends: location every 5s, ride details, contact → admin dashboard + SMS. | functional-spec:SFT-01 |
| FR-SFT-02 | SOS confirmation | "Help is on the way." Admin calls within 30s or dispatches support. | functional-spec:SFT-02 |
| FR-SFT-03 | Ride sharing | Share live tracking via WhatsApp/SMS/share sheet. Link expires after ride ends. | functional-spec:SFT-03 |
| FR-SFT-04 | Trusted contacts | Up to 5 contacts. Auto-share ride details when ride starts (opt-in). | functional-spec:SFT-04 |
| FR-SFT-05 | In-app chat | Rider ↔ Driver during ACTIVE ride. Admin viewable if flagged. <200ms delivery. | functional-spec:SFT-05 |
| FR-SFT-06 | Incident reporting | Post-ride: type (safety/harassment/accident/other), description, photos. | functional-spec:SFT-06 |
| FR-SFT-07 | Driver verification | Doc photos + live selfie at registration. Reverification every 6 months. | functional-spec:SFT-07 |
| FR-SFT-08 | Night mode | 10PM-5AM: only "verified" badge drivers (extra background check) receive ride requests. | functional-spec:SFT-08 |

### 3.8 Notification Module

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-NOT-01 | Push notifications (FCM) | Ride status, SOS, receipts, promos. Configurable per user. | functional-spec:NOT-01, final.md:§6 |
| FR-NOT-02 | Email notifications | Receipts, weekly summaries, account verification, password reset. | functional-spec:NOT-02 |
| FR-NOT-03 | SMS notifications | OTP (programmable SMS), critical alerts (SOS, suspension). Immediate attention only. | functional-spec:NOT-03 |
| FR-NOT-04 | In-app notification center | History with read/unread. Tap to navigate. | functional-spec:NOT-04 |
| FR-NOT-05 | Notification preferences | Per-channel toggle (push/email/SMS) per notification type. Saved per user. | functional-spec:NOT-05 |

### 3.9 Geocoding & Routing (from final.md)

| ID | Requirement | Acceptance Criteria | Source |
|----|-------------|---------------------|--------|
| FR-GEO-01 | Geocoding (Nominatim) | `GET /v1/places/search?q=...` → proxy to Nominatim → return `[{id, name, lat, lng, address}]`. Cache Redis 1h. | final.md:§1 |
| FR-GEO-02 | Reverse geocoding | `GET /v1/places/reverse?lat=...&lng=...` → address string via Nominatim. | final.md:§1 |
| FR-GEO-03 | Route service (OSRM) | `RouteService.php` → OSRM → `{distance_km, duration_minutes, polyline}`. Haversine fallback. | final.md:§2 |
| FR-GEO-04 | Public fare estimate | `GET /v1/rides/fare-estimate?pickup_lat=...&dropoff_lat=...&category=...` | final.md:§2 |
| FR-GEO-05 | Route polyline rendering | Render on rider + driver tracking screens. `react-native-maps` Polyline. | final.md:§11 |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Category | Metric | Target | Measurement |
|----------|--------|--------|-------------|
| API reads (GET) | p50/p95/p99 | <100ms / <300ms / <600ms | Laravel Telescope + Sentry |
| API writes (POST/PUT) | p50/p95/p99 | <200ms / <500ms / <1,000ms | Laravel Telescope + Sentry |
| Auth endpoints | p50/p95/p99 | <500ms / <1,500ms / <3,000ms | Laravel Telescope + Sentry |
| Fare estimation | p50/p95/p99 | <200ms / <400ms / <800ms | Custom middleware |
| Payment processing | p50/p95/p99 | <1,000ms / <3,000ms / <5,000ms | Gateway + Sentry |
| GPS location delivery | p95 | <200ms | Socket.io event timing |
| Ride state broadcast | p95 | <100ms | Socket.io event timing |
| Chat message delivery | p95 | <200ms | Socket.io event timing |
| WebSocket reconnect | max | <3s | Client timer |
| Concurrent WS connections | target | 10,000 | Load test |
| Mobile cold start | target | <1.5s (mid-range) | React Native profiler |
| Mobile warm start | target | <0.5s (mid-range) | React Native profiler |
| Mobile bundle size | target | <50MB | Expo build output |
| Mobile memory | target | <150MB typical session | Profiler |
| Battery drain (1h GPS) | target | <10% | Battery profiler |
| DB read queries | p95 | <50ms | PostgreSQL slow query log |
| DB write queries | p95 | <100ms | PostgreSQL slow query log |
| PostGIS spatial query | target | <50ms | Query timing |

### 4.2 Scalability

| Aspect | Current Target | Growth (6mo) |
|--------|---------------|-------------|
| Concurrent rides | 100 | 500 |
| Active daily users | 5,000 | 20,000 |
| Driver peak concurrency | 80 | 300 |
| WebSocket connections | 10,000 | 30,000 |
| API requests/minute | 5,000 | 20,000 |
| Scheduled jobs/day | 50 | 200 |
| Push notifications/day | 20,000 | 100,000 |

### 4.3 Availability

| Tier | Uptime % | Max Monthly Downtime |
|------|----------|---------------------|
| Core platform (API, rides, payments, auth) | 99.9% | 43 minutes |
| Admin dashboard | 99.5% | 3.6 hours |
| Food delivery | 99.5% | 3.6 hours |
| Real-time tracking | 99.0% | 7.2 hours |

### 4.4 Offline & Connectivity (Phalaborwa-Specific)

| Condition | Behavior |
|-----------|----------|
| Intermittent connection | Queue API calls, retry on reconnect |
| Data saver mode | Disable auto-play animations, compress images |
| 2G/3G fallback | Reduce map detail level, batch location updates |
| Connection restored | Sync queued actions, refresh stale data |
| No GPS signal | "GPS weak" indicator, last known + network location |
| Offline (home screen) | Cached map tiles, "No connection" banner |
| Offline (ride tracking) | Last known position + "Live updates paused" |
| Offline (history) | Cached last 20 rides |

### 4.5 Security

| Control | Requirement | Standard |
|---------|-------------|----------|
| Password hashing | bcrypt, cost factor 12 | Laravel default |
| Token expiry | 7 days (mobile), SPA session (web) | Sanctum |
| 2FA (admin) | TOTP, 30s window | Authenticator app |
| Rate limiting | Auth: 10/min. General: 60/min. OTP: 3/10min. SOS: 5/min. | Redis-backed |
| PII encryption | AES-256 at rest (name, email, phone, ID) | Column-level |
| TLS | 1.3 minimum on all external | Nginx + Let's Encrypt |
| CORS | Whitelist specific origins. No wildcard. | config/cors.php |
| Headers | X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy | Nginx |
| WAF | Cloudflare or AWS WAF | SQL injection, XSS, DDoS |
| API gateway | Request validation, IP whitelist for admin | Nginx |
| Session invalidation | Password change, suspension, admin force-logout | Sanctum |

### 4.6 Data Protection

| Data Type | Encryption at Rest | Encryption in Transit | Notes |
|-----------|-------------------|----------------------|-------|
| PII (name, email, phone) | AES-256 | TLS 1.3 | Column-level |
| Payment tokens | N/A (tokenised by PayFast/Ozow) | TLS 1.3 | Never stored raw |
| Driver documents | AES-256 (S3 SSE) | TLS 1.3 | Server-side |
| GPS locations | AES-256 | TLS 1.3 | Anonymised after 90 days |
| Chat messages | AES-256 | TLS 1.3 + WSS | Deleted after 1 year |
| Passwords | bcrypt (not reversible) | N/A | Never logged |
| API keys | AES-256 (env vars) | TLS 1.3 | Rotated every 90 days |

---

## 5. Regulatory Requirements

### 5.1 POPIA — Protection of Personal Information Act

| ID | Requirement | Implementation | Penalty |
|----|-------------|----------------|---------|
| REG-POPIA-01 | Explicit consent before collecting PI | Registration: checkbox with plain-language explanation. Consent recorded: timestamp + version. | Fine up to R10M or imprisonment |
| REG-POPIA-02 | Consent withdrawal | In-app "Withdraw consent" → stop processing → begin 30-day anonymisation. | Fine up to R10M |
| REG-POPIA-03 | Consent versioning | Each event: user_id, consent_version, timestamp, IP. Versions documented. | Fine up to R10M |
| REG-POPIA-04 | Minors (under 18) | Age gate. If <18: guardian consent form. Reject if unverified. | Fine up to R10M |
| REG-POPIA-05 | Right to access | `GET /api/v1/account/data-export` → JSON with all PII. 72-hour SLA. | Fine up to R10M |
| REG-POPIA-06 | Right to rectification | Profile edit. Ride history correction via support ticket. | Fine up to R10M |
| REG-POPIA-07 | Right to erasure | Self-service deletion. Financial records anonymised. Non-financial purged within 30 days. Re-auth before deletion. | Fine up to R10M |
| REG-POPIA-08 | Right to data portability | Export endpoint: machine-readable JSON. All user-generated data. | Fine up to R10M |
| REG-POPIA-09 | Right to object | Opt-out marketing. Opt-out analytics sharing. Record objection with timestamp. | Fine up to R10M |
| REG-POPIA-10 | Breach notification (Regulator) | Within 72 hours: nature, categories, number affected, remediation. | Fine up to R10M |
| REG-POPIA-11 | Breach notification (Subjects) | If harm likely: direct email + SMS. | Fine up to R10M |
| REG-POPIA-12 | Information Officer | Register with SA Information Regulator. Published on privacy policy. | Fine up to R10M |

### 5.2 FICA — Financial Intelligence Centre Act

| ID | Requirement | Implementation | Penalty |
|----|-------------|----------------|---------|
| REG-FICA-01 | Verify driver identity | SA ID book/card + proof of address + face verification. Home Affairs check via third-party. | Fine up to R100M |
| REG-FICA-02 | Beneficial ownership | If account operated for another: collect beneficial owner details. | Fine up to R100M |
| REG-FICA-03 | Risk rating | Each driver: low/medium/high. Enhanced due diligence for high-risk. | Fine up to R100M |
| REG-FICA-04 | Document retention (5 years) | After account closure: retain ID, proof of address, verification for 5 years. | Fine up to R100M |
| REG-FICA-05 | Document expiry monitoring | License: track, remind 30 days before, deactivate if expired >7 days. | Fine up to R100M |
| REG-FICA-06 | Periodic re-verification | Every 12 months: re-verify ID, proof of address, face. Trigger early on risk change. | Fine up to R100M |
| REG-FICA-07 | Reportable transactions | Cash >R24,999.99 → report to FIC within 2 business days. | Fine up to R100M |
| REG-FICA-08 | Suspicious transactions | Flag: rapid ride churn, payment cycling, refund abuse. Report to FIC. | Fine up to R100M |

### 5.3 PCI-DSS — Payment Card Industry Data Security Standard

| ID | Requirement | Implementation | Penalty |
|----|-------------|----------------|---------|
| REG-PCI-01 | Never store PAN | All card data via PayFast/Ozow redirect. Never touch raw card data. SAQ-A compliant. | $500K/month + loss of processing |
| REG-PCI-02 | Tokenisation | PayFast/Ozow handle card entry. Store only token + last 4 digits. | $500K/month |
| REG-PCI-03 | TLS on all connections | TLS 1.3 minimum. HSTS enabled. | $500K/month |
| REG-PCI-04 | Webhook verification | Stripe: `constructEvent()`. PayFast: MD5 + passphrase. Ozow: HMAC-SHA256. All idempotent. | $500K/month |
| REG-PCI-05 | Access control | Only finance admin sees payment details. Developers: never. Support: masked. | $500K/month |
| REG-PCI-06 | Vulnerability scanning | Weekly external scan. Quarterly ASV scan if >300K card transactions/year. | $500K/month |
| REG-PCI-07 | Penetration testing | Annual external firm. After major infrastructure changes. | $500K/month |

### 5.4 SA Tax Law

| ID | Requirement | Implementation | Penalty |
|----|-------------|----------------|---------|
| REG-TAX-01 | VAT registration | If annual revenue >R1M: register, calculate 15% VAT on platform fee. | Interest + penalties up to 200% |
| REG-TAX-02 | Digital receipts | Every transaction: PDF + email + in-app. VAT breakdown. Retain 7 years. | Interest + penalties |
| REG-TAX-03 | Driver tax guidance | In-app: "You are responsible for declaring earnings to SARS. Provisional tax may apply." | Informational |
| REG-TAX-04 | Annual earnings report | By 31 May each year: provide driver with annual earnings statement. | Informational |

### 5.5 SA Labour Law

| ID | Requirement | Implementation | Penalty |
|----|-------------|----------------|---------|
| REG-LAB-01 | Independent contractor | Written ToS: driver sets hours, uses own vehicle, no exclusivity, no guaranteed earnings. | CCMA claims, back-pay |
| REG-LAB-02 | No employer obligations | No PAYE, UIF, SDL, pension. No annual/sick leave. No company equipment. | CCMA claims |
| REG-LAB-03 | Control test compliance | Platform does NOT control: when driver works, routes, other work. Platform DOES control: safety, quality, payment. | CCMA claims |
| REG-LAB-04 | Fair cancellation | Both parties cancel with reasonable notice. No penalty for circumstances outside control. | Legal costs |
| REG-LAB-05 | Transparent earnings | Full fare breakdown per ride. No hidden deductions. Platform fee clear. | Legal costs |
| REG-LAB-06 | Dispute resolution | Submit dispute → admin reviews 24h → written decision → appeal option. | Legal costs |
| REG-LAB-07 | Non-discrimination | Dispatch: proximity + rating only. No race/gender/location discrimination. Audited quarterly. | Legal costs |
| REG-LAB-08 | Deactivation policy | Written reasons. 7-day notice (except safety). Appeal process. | CCMA claims |
| REG-LAB-09 | Working hours notification | After 12h: notification. Auto-offline after 14h (with override). | Safety compliance |

---

## 6. Privacy Requirements

| ID | Requirement | Implementation |
|----|-------------|----------------|
| PRIV-01 | Data minimisation | Collect only what's necessary. Phone for auth, name for identification, email optional. No unnecessary fields. |
| PRIV-02 | Purpose limitation | Each data field has documented purpose. No repurposing without new consent. |
| PRIV-03 | Consent capture | Explicit opt-in checkbox on registration. Plain language. Recorded with timestamp + version. |
| PRIV-04 | Consent revocation | In-app "Withdraw consent" → stop processing → 30-day anonymisation window. |
| PRIV-05 | Anonymisation | After retention period: PII replaced with anonymous identifiers. Aggregate analytics only. |
| PRIV-06 | Pseudonymisation | UUIDs as primary identifiers in APIs. Internal IDs never exposed in URLs. |
| PRIV-07 | Access logging | Every PII access logged: who, what, when, why. Append-only logs. |
| PRIV-08 | Third-party sharing | Only: payment gateways (PayFast/Ozow), cloud providers (AWS), regulators (as required by law). Documented in privacy policy. |
| PRIV-09 | International transfers | If data leaves SA (PayFast US, AWS): adequacy safeguards documented. |
| PRIV-10 | DPIA | Data Protection Impact Assessment conducted annually and before major feature launches. |

---

## 7. Security Requirements

| ID | Requirement | Implementation |
|----|-------------|----------------|
| SEC-01 | Authentication hardening | bcrypt cost 12+. Token expiry 7 days. Session invalidation on password change/suspension. |
| SEC-02 | Rate limiting | Auth: 10/min. General: 60/min. OTP: 3/10min. SOS: 5/min. File upload: 10/min. Redis-backed. |
| SEC-03 | Input validation | FormRequest classes on ALL endpoints. No inline validation. |
| SEC-04 | RBAC enforcement | Role middleware on all routes. Policy gates for resource access. No IDOR. |
| SEC-05 | PII encryption | AES-256 column-level for: name, email, phone, ID number. Key rotation quarterly. |
| SEC-06 | API security headers | X-Content-Type-Options: nosniff. X-Frame-Options: DENY. CSP. Referrer-Policy. HSTS. |
| SEC-07 | CORS lock | Whitelist specific origins. No wildcard. Admin origin separate from API. |
| SEC-08 | Webhook signature verification | Stripe: constructEvent(). PayFast: MD5+passphrase. Ozow: HMAC-SHA256. All idempotent + logged. |
| SEC-09 | Admin audit logging | Every admin action: who, what, when, IP, diff. Immutable (append-only). |
| SEC-10 | Device fingerprinting | Login: device ID + user agent + IP. Flag unknown devices. Alert on suspicious. |
| SEC-11 | Account lockout | 5 failed attempts → 15-min lock. Notification to user. Admin override. |
| SEC-12 | Firebase key rotation | Remove from git history. Rotate key. Load from env var. Purge from all commits. |
| SEC-13 | SQL injection prevention | No raw DB::statement() with user input. Parameter binding everywhere. Semgrep CI gate. |
| SEC-14 | XSS prevention | Blade `{{ }}` escaping. No `{!! !!}` on user content. CSP restricts inline scripts. |
| SEC-15 | CSRF protection | Web routes: VerifyCsrfToken. API routes: token auth (no CSRF needed). |

---

## 8. Audit Requirements

| ID | Requirement | Retention | Format |
|----|-------------|-----------|--------|
| AUD-01 | Admin action logs | 5 years | JSON: who, what, when, IP, diff |
| AUD-02 | User login/logout | 1 year | JSON: user, timestamp, IP, device, success/fail |
| AUD-03 | Payment transactions | 7 years | Ledger: double-entry, immutable |
| AUD-04 | Ride lifecycle events | 5 years | JSON: ride_id, state, timestamp, actor |
| AUD-05 | Consent records | 5 years | JSON: user, version, timestamp, IP |
| AUD-06 | Data subject requests | 5 years | JSON: request type, SLA, outcome |
| AUD-07 | SOS/incident logs | 5 years | JSON: details, response time, resolution |
| AUD-08 | System health logs | 30 days hot, 12 months cold | Structured JSON, correlation ID |
| AUD-09 | FICA verification logs | 5 years | JSON: driver, doc type, verification result |
| AUD-10 | PII access logs | 5 years | Append-only: who, what, when, why |

---

## 9. Data Retention Requirements

| Data Category | Retention Period | Rationale | Action After |
|---------------|-----------------|-----------|-------------|
| Rider profile | 5 years after last activity | POPIA + business need | Anonymise or delete |
| Driver profile | 5 years after last activity | FICA (5-year requirement) | Anonymise financial, purge rest |
| Ride records | 5 years | Tax + dispute resolution | Anonymise PII, retain aggregate |
| Payment transactions | 7 years | SARS tax requirement | Retain (no PII — tokenised) |
| Chat messages | 1 year | Dispute resolution | Delete |
| GPS location data | 90 days | Operational need | Anonymise to aggregate heatmaps |
| Driver documents | 5 years after account closure | FICA requirement | Securely delete |
| Audit logs | 5 years | POPIA + business need | Archive to cold storage |
| Session tokens | Expiry + 30 days | Security | Delete |
| Marketing preferences | Until consent withdrawn or 5 years inactive | POPIA | Delete |
| Consent records | 5 years | POPIA compliance | Archive |

---

## 10. Performance Requirements (Phalaborwa-Specific)

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| App cold start | <1.5s on Samsung A02 | Entry-level device, 2GB RAM |
| App bundle size | <50MB | R25-50/GB data pricing |
| Image loading | Lazy + compressed | Data-conscious users |
| Map rendering | <1s, reduced detail on 2G/3G | Low-signal areas |
| GPS tracking battery | <10% per hour | Driver devices mid-range |
| Location update frequency | 5s active ride, 15s idle | Battery optimisation |
| Offline map cache | Last-viewed area tiles | Intermittent connectivity |
| API payload size | Minimised JSON, no unnecessary fields | Data efficiency |
| WebSocket reconnection | <3s automatic | Unstable connections |
| Push notification delivery | <5s end-to-end | Time-sensitive (ride requests) |
| SMS delivery | <30s for OTP | Critical path for auth |
| Fare calculation | <200ms p95 | Pre-booking confidence |

---

## 11. Localization / Timezone / Currency

| Aspect | Requirement |
|--------|-------------|
| Currency | ZAR (South African Rand) — all prices, fares, payouts |
| Timezone | SAST (UTC+2) — no DST. All timestamps stored as UTC, displayed as SAST. |
| Languages (initial) | English (primary), Afrikaans, Sepedi — in-app language selector |
| Date format | DD/MM/YYYY (South African standard) |
| Time format | 24-hour (14:30) or 12-hour with AM/PM — user preference |
| Number format | Space as thousands separator (R 1 200.00), comma as decimal |
| Phone format | +27 XX XXX XXXX (SA mobile), landline: +27 XX XXX XXXX |
| Address format | South African: street, suburb, town/city, province, postal code |
| Emergency number | 10111 (SAPS), 10177 (Ambulance), 10177 (Fire) — displayed in SOS screen |
| Load shedding | Reference to Eskom load shedding schedule — impact on availability |

---

## 12. Accessibility Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| WCAG 2.1 AA | Minimum | All screens must pass automated audit |
| Color contrast | 4.5:1 text, 3:1 UI | Verify all interactive elements |
| Screen reader | VoiceOver (iOS) + TalkBack (Android) | Semantic labels on all interactive elements |
| Touch targets | 44x44pt minimum | All buttons, links, form fields |
| Font scaling | Support up to 200% | Dynamic type on iOS, font scaling on Android |
| Reduced motion | Respect system setting | Disable animations when enabled |
| Error identification | Text + icon + color | Never color-only error indication |
| Form labels | Every input has visible label | Placeholder is not a label |
| Focus management | Logical tab order | Keyboard navigation on admin web |

---

## 13. Business Rules

| ID | Rule | Edge Case |
|----|------|-----------|
| BR-01 | Platform fee: 20% of ride fare | If fare is R0 (promo): platform fee = R0 |
| BR-02 | Minimum fare: R25 (Economy) | Below minimum: round up to minimum |
| BR-03 | Surge multiplier: 1.0x-2.5x | Never exceed 2.5x. Show indicator before booking. |
| BR-04 | Cancellation fee: R15 (after driver ARRIVED) | If driver cancels after ARRIVED: no fee to rider |
| BR-05 | Driver cancellation rate threshold: 1% | >1% in 7-day rolling window → reduced priority for 24h |
| BR-06 | Driver auto-offline: 3 consecutive rejects or 30 min idle | Override available for driver |
| BR-07 | Ride timeout: 60 seconds (no driver accepts) | Auto-cancel, notify rider "No drivers available" |
| BR-08 | Grace period: 5 minutes after ARRIVED | Timer displayed to both. Rider no-show → driver can cancel with fee |
| BR-09 | Fare tolerance: ±20% of estimate | If final fare >120% of estimate → rider gets automatic adjustment |
| BR-10 | Night mode: 10PM-5AM only verified drivers | Verified = extra background check badge |
| BR-11 | Working hours: auto-offline after 14h continuous | Driver can override (for safety, not fatigue) |
| BR-12 | Payout minimum: R100 | Below R100: accumulated until threshold reached |
| BR-13 | Weekly payout: every Monday | If Monday is public holiday: next business day |
| BR-14 | OTP expiry: 5 minutes | After expiry: must request new OTP |
| BR-15 | Document expiry: deactivate if >7 days expired | 30-day reminder before expiry |
| BR-16 | Scheduled ride: 1-72 hours ahead | Within 15 min of scheduled time: begin driver search |
| BR-17 | Wallet auto-use: before other payment methods | If wallet balance < fare: charge remaining to selected method |
| BR-18 | Data retention: automated purge per schedule | Admin can view purge log. No manual override for compliance. |
| BR-19 | Promo code: one per ride | Cannot stack promos. Max 50% discount via promo. |
| BR-20 | Driver rating: below 4.0 → warning | Below 3.5 for 30 days → deactivated (with notice + appeal) |

---

## 14. Edge Cases

| ID | Edge Case | Expected Behavior |
|----|-----------|-------------------|
| EC-01 | Network loss during ride booking | Queue request. On reconnect: retry or notify failure. No duplicate rides (idempotency key). |
| EC-02 | GPS signal lost during ride | "GPS weak" indicator. Use last known + network location. Fare uses last known point. |
| EC-03 | Payment gateway timeout | Hold ride status. Retry 3x. If all fail: notify rider, allow cash fallback. |
| EC-04 | Driver app crashes mid-ride | Auto-reconnect on restart. Resume ride state from DB. No data loss. |
| EC-05 | Rider app crashes during booking | On restart: check ride status. If SEARCHING: continue. If none: show home. |
| EC-06 | Duplicate ride request (network retry) | Idempotency key prevents duplicate. Return existing ride. |
| EC-07 | Driver accepts ride but goes offline | If offline >2 min during ACCEPTED: re-dispatch to another driver. Notify rider. |
| EC-08 | Rider cancels while driver en route | If before ARRIVED: free cancel. If after: R15 fee. Driver notified immediately. |
| EC-09 | Payment charged but ride not completed (app crash) | If ride not COMPLETED in 30 min: auto-complete with last known fare. |
| EC-10 | SOS triggered accidentally | 10-second countdown to cancel. If not cancelled: proceed with SOS. |
| EC-11 | Multiple riders book same driver (race condition) | Atomic DB update. First confirmed booking wins. Others get "Driver no longer available". |
| EC-12 | Driver's phone dies mid-ride | If no GPS for 5 min: notify admin. Rider can call driver (phone number visible). |
| EC-13 | Promo code abuse (multiple accounts) | Track by device fingerprint + IP. Flag suspicious patterns. Admin review. |
| EC-14 | Scheduled ride but no driver available at time | Notify rider 5 min before. Offer cancel or wait. |
| EC-15 | Currency edge: fare rounds to R0.00 | Never charge R0. Minimum fare applies. |
| EC-16 | Load shedding: no power at restaurant (food delivery) | Restaurant marks "closed". Orders cancelled. Rider notified. No charge. |
| EC-17 | Driver provides wrong plate number | Rider can report via incident form. Admin investigates. Driver flagged. |
| EC-18 | Rider enters wrong drop-off location | During SEARCHING: rider can cancel free. After STARTED: chat with driver to correct. |
| EC-19 | Concurrent admin edits to pricing | Optimistic locking. Last-write-wins with admin notification of conflict. |
| EC-20 | Database connection lost | Queue workers pause. API returns 503 with Retry-After header. |

---

## 15. Failure Modes

| ID | Failure Mode | Impact | Mitigation |
|----|-------------|--------|------------|
| FM-01 | OSRM unreachable | Fare estimation uses Haversine fallback | Log fallback. Alert ops. Never block ride. |
| FM-02 | PayFast/Ozow downtime | No digital payments | Cash fallback. Queue digital payments. Notify admin. |
| FM-03 | FCM push failure | Drivers miss ride requests | SMS fallback for ride requests. Log failure. |
| FM-04 | SMS gateway failure | OTPs not delivered | Retry 3x. Offer voice OTP as backup. |
| FM-05 | Redis crash | Rate limiting, session cache, geo-index lost | PostgreSQL fallback for sessions. Rate limiting disabled (alert ops). |
| FM-06 | PostgreSQL crash | All data operations fail | Return 503. Queue requests. WAL for recovery. |
| FM-07 | Socket.io server crash | Real-time tracking stops | Auto-reconnect clients. GPS updates queued. Resume on restart. |
| FM-08 | Firebase key compromised | Unauthorized push notifications | Rotate key immediately. Audit sent notifications. |
| FM-09 | Admin account compromised | Full platform access | Force logout all sessions. Revoke tokens. Notify admin. |
| FM-10 | Data breach (PII exposed) | Regulatory penalty + reputation | Breach notification (72h). Contain. Investigate. Remediate. |
| FM-11 | Cascading service failure | Multiple services down | Circuit breaker pattern. Isolate failures. Graceful degradation. |
| FM-12 | Disk space exhaustion | Logs/storage fill up | Auto-rotation. Alert at 85%. Hard stop at 95%. |

---

## 16. Worst-Case Scenarios

| ID | Scenario | Impact | Response |
|----|----------|--------|----------|
| WC-01 | Driver assaults rider | Physical harm, legal liability, media coverage | SOS alert → immediate admin response → police report → driver deactivated → legal counsel → media statement |
| WC-02 | Data breach: 10,000 rider records exposed | POPIA fine up to R10M, reputation destruction | 72h regulator notification → affected user notification → forensic investigation → remediation → public disclosure |
| WC-03 | Payment gateway processes fraudulent charges | Financial loss, chargebacks, card processor revocation | Freeze affected accounts → dispute charges → PCI forensics → gateway notification → user reimbursement |
| WC-04 | Platform-wide outage during morning peak (7AM) | Hundreds of missed rides, driver earnings lost, rider trust destroyed | Status page update → driver/rider SMS notification → estimated recovery time → post-incident review |
| WC-05 | Driver goes missing with rider (kidnapping scenario) | Life-threatening, criminal investigation | SOS alert → GPS tracking → police notification → emergency response → media management → legal support |
| WC-06 | SARS audit: unpaid VAT | Fine up to 200% of tax due + interest | Engage tax advisor immediately → compute arrears → negotiate payment plan → remediate process |
| WC-07 | CCMA claim: driver reclassified as employee | Back-pay UIF/SDL, pension contributions, legal costs | Legal counsel → review classification test → settle or defend → update ToS |
| WC-08 | App store rejection (Apple/Google) | Delayed launch, revenue loss | Pre-submission compliance check → rapid remediation → appeal → alternative distribution |
| WC-09 | Load shedding: 4+ hours daily | Reduced driver availability, fewer rides, lower revenue | Dynamic pricing adjustment → driver incentives for peak hours → offline-capable features |
| WC-10 | Key driver exodus to competitor | Supply shortage, longer wait times, rider churn | Retention bonuses → driver loyalty program → platform improvements → competitive pricing |

---

## 17. Prioritized Backlog with Acceptance Criteria

### P0 — Must Have (Launch Blockers)

| ID | Feature | Acceptance Criteria | Effort |
|----|---------|---------------------|--------|
| BL-P0-01 | Phone registration + OTP auth | SA mobile → OTP → profile → account. 5-min expiry. 3 retries. | 8h |
| BL-P0-02 | Rider ride booking (Economy/Standard) | Pickup/drop-off → fare estimate → confirm → SEARCHING state. | 16h |
| BL-P0-03 | Driver matching + accept/reject | 3km radius, expand 1km/15s, 60s timeout. First-to-accept atomic. | 16h |
| BL-P0-04 | Ride lifecycle (SEARCHING → COMPLETED) | All 6 states with correct transitions. DB-level enforcement. | 16h |
| BL-P0-05 | Real-time driver tracking (GPS) | 5s active, 15s idle. Background tracking. Rider sees smooth animation. | 12h |
| BL-P0-06 | Cash payment flow | Rider selects cash → ride completes → driver confirms. No gateway charge. | 8h |
| BL-P0-07 | PayFast EFT integration | Redirect → EFT → webhook → confirm. Idempotent. | 16h |
| BL-P0-08 | Driver earnings dashboard | Today/week/month. Real-time update. | 8h |
| BL-P0-09 | Weekly payout batch | Monday: calculate → batch → bank deposit. 3 retries on failure. | 12h |
| BL-P0-10 | SOS alert (rider + driver) | Red button → location every 5s → admin + SMS. Admin calls within 30s. | 12h |
| BL-P0-11 | Admin KPI dashboard | Live cards + charts. Auto-refresh 30s. | 12h |
| BL-P0-12 | Driver approval workflow | View docs → approve/reject → notify driver. | 8h |
| BL-P0-13 | Rate limiting on all endpoints | Auth: 10/min. General: 60/min. Redis-backed. | 4h |
| BL-P0-14 | POPIA consent on registration | Checkbox + plain language. Recorded timestamp + version. | 4h |
| BL-P0-15 | Admin audit logging | Every action: who, what, when, IP, diff. Immutable. | 6h |

### P1 — Should Have (Post-Launch Priority)

| ID | Feature | Acceptance Criteria | Effort |
|----|---------|---------------------|--------|
| BL-P1-01 | Surge pricing | 1.0x-2.5x multiplier. Show indicator. Configurable by admin. | 8h |
| BL-P1-02 | Cancellation reasons + fees | Enum reasons. R15 fee after ARRIVED. Driver threshold 1%. | 6h |
| BL-P1-03 | Rating system | 1-5 stars + comment. Both parties. Prompted 2 min after. | 6h |
| BL-P1-04 | Ride history + receipts | Paginated. Filter. PDF receipt. | 8h |
| BL-P1-05 | Scheduled rides | 1-72h ahead. Dispatch 15 min before. | 12h |
| BL-P1-06 | Push notifications (FCM) | Ride status, SOS, receipts. Token registration on login. | 8h |
| BL-P1-07 | In-app chat (rider ↔ driver) | During ACTIVE ride only. <200ms delivery. Admin viewable. | 10h |
| BL-P1-08 | Ride sharing (WhatsApp/SMS) | Live tracking link. Expires after ride. | 6h |
| BL-P1-09 | Geocoding (Nominatim) | Search + reverse. Redis cache 1h. | 6h |
| BL-P1-10 | Route service (OSRM) | Real road distance + time + polyline. Haversine fallback. | 8h |
| BL-P1-11 | Driver documents + expiry tracking | Upload/renew. 30-day reminder. Deactivate if expired >7 days. | 8h |
| BL-P1-12 | POPIA data export/deletion | `GET /account/data-export`. `DELETE /user/anonymize`. 72h SLA. | 8h |
| BL-P1-13 | Driver management (admin) | Search, filter, KYC status, profile. | 6h |
| BL-P1-14 | Rate card editor (admin) | Edit per-km, per-min, base. Preview impact. | 6h |
| BL-P1-15 | Promo codes (admin) | Create, track, limit. Fixed/percentage/free ride. | 8h |
| BL-P1-16 | Offline mode (mobile) | Cached maps, cached rides, "No connection" banner, queue sync. | 10h |
| BL-P1-17 | Form validation (all screens) | Proper error messages, loading states, empty states. | 8h |
| BL-P1-18 | Night mode (10PM-5AM) | Only verified drivers receive requests. | 4h |

### P2 — Nice to Have

| ID | Feature | Acceptance Criteria | Effort |
|----|---------|---------------------|--------|
| BL-P2-01 | Food delivery backend | Restaurant CRUD, menu, order lifecycle. | 20h |
| BL-P2-02 | Food delivery mobile screens | Browse, order, track. | 16h |
| BL-P2-03 | Trusted contacts (auto-share) | Up to 5 contacts. Opt-in per ride. | 6h |
| BL-P2-04 | Incident reporting | Post-ride form. Type, description, photos. | 6h |
| BL-P2-05 | Weekly driver statement PDF | Auto-generated Monday. | 4h |
| BL-P2-06 | Docker + CI/CD | Dockerfile, docker-compose, GitHub Actions. | 12h |
| BL-P2-07 | Sentry error tracking | Backend + mobile. | 4h |
| BL-P2-08 | PHPUnit tests (80% service coverage) | All services tested. | 20h |
| BL-P2-09 | Admin data export (CSV/PDF) | Reports: revenue, rides, drivers. | 8h |
| BL-P2-10 | Ozow instant EFT | Redirect → bank → webhook. | 8h |
| BL-P2-11 | Wallet system | Top-up, balance, auto-use. | 10h |
| BL-P2-12 | Multi-language (Afrikaans, Sepedi) | In-app selector. | 12h |

---

## 18. Feature Priority Matrix (from functional-spec)

| Module | P0 | P1 | P2 | Total |
|--------|----|----|----|-------| 
| Auth | 7 | 3 | 0 | 10 |
| Ride | 11 | 6 | 2 | 19 |
| Driver | 8 | 5 | 2 | 15 |
| Payment | 9 | 3 | 1 | 13 |
| Food | 7 | 3 | 1 | 11 |
| Admin | 11 | 5 | 1 | 17 |
| Safety | 5 | 2 | 1 | 8 |
| Notification | 3 | 2 | 0 | 5 |
| **Total** | **61** | **29** | **8** | **98** |

---

## 19. Acceptance Criteria Template

Every feature in the backlog must meet this criteria before being marked "Done":

1. **Functional**: All acceptance criteria met and verified
2. **Tests**: Unit tests pass, feature tests pass, minimum coverage threshold met
3. **Security**: Input validation, auth check, rate limiting applied
4. **Performance**: Response time within NFR targets
5. **Accessibility**: Screen reader compatible, touch targets adequate
6. **Offline**: Graceful degradation or offline message (where applicable)
7. **Error handling**: Loading, error, empty states implemented
8. **Audit**: Relevant events logged
9. **POPIA**: Consent collected, data minimised, retention configured (where applicable)
10. **Code review**: Reviewed and approved by reviewer agent

---

## 20. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | TBD | TBD | ⬜ Pending |
| Tech Lead | TBD | TBD | ⬜ Pending |
| Security Officer | TBD | TBD | ⬜ Pending |
| Compliance Officer | TBD | TBD | ⬜ Pending |
| QA Lead | TBD | TBD | ⬜ Pending |

---

**Status:** Draft — Pending Approval
**Next Phase:** Phase 2 — Data Model Architecture
**Blocker:** None — ready for review and approval
