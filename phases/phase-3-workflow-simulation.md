# Phase 3: Workflow Simulation

**Version:** 1.0.0
**Created:** 2026-07-08T18:00:00Z
**Status:** Draft
**Superpowers Phase:** 3 of 8 — Workflow Simulation (Mandatory)
**Prepared by:** opencode
**Depends on:** Phase 1 — Requirements Expansion (v1.0.0, Draft), Phase 2 — Data Model Architecture (v1.0.0, Draft)
**Sources:** Phase 1 (§1 Actors, §2 User Stories, §3 Functional Requirements, §14 Edge Cases, §15 Failure Modes), Phase 2 (§3 Per-Table Specification, §4 State Machines), functional-spec.md, final.md

---

## Summary

This document simulates every user journey end-to-end: happy path, alternate paths, failure paths, timeout paths, retry logic, error messages, UI/API inputs/outputs, state transitions, and DB transitions. Each workflow includes a sequence diagram (text form) and all state machine diagrams (text form). This is the single source of truth for how the system behaves in every scenario.

---

## Table of Contents

1. [Rider Workflows](#1-rider-workflows)
2. [Driver Workflows](#2-driver-workflows)
3. [Admin Workflows](#3-admin-workflows)
4. [Food Delivery Workflows](#4-food-delivery-workflows)
5. [System Workflows](#5-system-workflows)
6. [State Machines](#6-state-machines)
7. [Sequence Diagrams — E2E Flows](#7-sequence-diagrams--e2e-flows)
8. [Failure Matrix & Recovery](#8-failure-matrix--recovery)
9. [Sign-Off](#9-sign-off)

---

## 1. Rider Workflows

### WF-R01: Rider Registration (Phone)

**Actor:** Rider
**FR Reference:** FR-AUTH-01

#### Preconditions
- Rider does NOT have an existing account
- Rider has a valid South African mobile number (+27 format)
- SMS provider (Twilio/Clickatell) is operational
- Rate limiter allows new registration from this IP/device

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Register" | Show registration form | — | — | Phone input field |
| 2 | Enter phone number: +2782XXXXXXX | Validate format, check uniqueness | `GET /api/v1/auth/check-phone?phone=+2782XXXXXXX` | — | ✅ "Number available" |
| 3 | Tap "Send OTP" | Generate 6-digit OTP, store in Redis (TTL 5min), send SMS | `POST /api/v1/auth/send-otp` | Redis: `otp:{phone}` = code, TTL 300s | "OTP sent to +2782XXXXXXX" |
| 4 | Enter OTP: 123456 | Verify against Redis, increment attempt counter | `POST /api/v1/auth/verify-otp` | Redis: increment `otp_attempts:{phone}` | ✅ OTP verified |
| 5 | Enter name, optional email | Validate inputs | `POST /api/v1/auth/register` | — | Profile form |
| 6 | Tap "Create Account" | Create user, send welcome push, log consent | `POST /api/v1/auth/register` | `INSERT users` (role=rider), `INSERT consent_records` | ✅ "Welcome to EasyRyde!" |

**State Transitions:** None (pre-ride)
**DB Transitions:** `users` INSERT, `consent_records` INSERT

#### Alternate Paths

| Path | Condition | Behavior |
|------|-----------|----------|
| A1: Email provided | email field filled | Create user with email, send verification email |
| A2: Existing phone | Phone already in `users.email_hash` | "Account already exists. Would you like to log in?" |

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Invalid phone format | Reject | "Please enter a valid SA mobile number (+27...)" | Immediate |
| F2: Phone already registered | Reject | "An account already exists with this number" | No (redirect to login) |
| F3: OTP expired | Reject OTP | "OTP expired. Please request a new one." | Yes (resend OTP) |
| F4: OTP wrong 3 times | Lock OTP, log attempt | "Too many failed attempts. Please wait 5 minutes." | Wait 5min |
| F5: SMS provider down | Log error, fallback to retry | "Could not send SMS. Please try again." | Yes (retry 3x, 30s interval) |
| F6: Network timeout | Log error | "Connection timed out. Please check your network." | Yes (client retry) |

#### Timeout Paths

| Timeout | Duration | Action |
|---------|----------|--------|
| OTP validity | 5 minutes | Expire OTP, require resend |
| SMS delivery | 30 seconds | Log warning, retry send |
| API response | 10 seconds | Show "Connection timed out" |

#### Retry Logic

| Retry | Max Attempts | Interval | Backoff |
|-------|-------------|----------|---------|
| OTP send | 3 | 30s | None |
| OTP verify | 3 (then lock) | Immediate | None |
| Registration POST | 3 | 5s | Exponential (5s → 10s → 20s) |

---

### WF-R02: Rider Ride Booking

**Actor:** Rider
**FR Reference:** FR-RIDE-04, FR-RIDE-05, FR-RIDE-06

#### Preconditions
- Rider is logged in
- Rider has location services enabled (or enters address manually)
- At least 1 driver is online in the area
- Payment method is set (card, cash, or wallet with balance)

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Where to?" | Show recent places + search bar | — | — | Search UI |
| 2 | Enter pickup address | Geocode via Nominatim, show pin on map | `GET /api/v1/places/search?q=...` | — | Map with pin |
| 3 | Confirm pickup | Store pickup coordinates | — | — | Pickup confirmed |
| 4 | Enter dropoff address | Geocode, calculate route via OSRM | `GET /api/v1/places/search?q=...`, `GET /api/v1/rides/fare-estimate?...` | — | Route displayed |
| 5 | Confirm dropoff | Calculate fare: base + distance + time + surge | — | — | Fare breakdown shown |
| 6 | Select ride type (Economy/Standard/Premium) | Show per-type pricing | — | — | 3 options with prices |
| 7 | Select payment method | Show available methods | — | — | Cash/Card/Wallet toggle |
| 8 | Tap "Book Ride" | Create ride (SEARCHING), broadcast to nearby drivers via Socket.IO | `POST /api/v1/rides` | `INSERT rides` (status=searching) | "Looking for drivers..." with spinner |
| 9 | Driver accepts within 60s | Match ride to driver, transition to MATCHED | `PUT /api/v1/rides/{id}/accept` (driver) | `UPDATE rides` (status=matched, driver_id=?) | "Driver found! [Name] in [Car] [Plate]" |
| 10 | Driver en route | Track driver GPS, show ETA | Socket.IO: `driver_location` event | — | Map with driver moving |
| 11 | Driver arrives | Notify rider, start 5-min timer | Push notification | `UPDATE rides` (status=arrived, arrived_at=now) | "Your driver has arrived!" + timer |
| 12 | Rider enters vehicle | — | — | — | "Ride in progress" screen |
| 13 | Driver starts ride | Fare meter begins, track GPS | `PUT /api/v1/rides/{id}/start` | `UPDATE rides` (status=in_progress, started_at=now) | Live fare + route |
| 14 | Ride completes | Calculate final fare, process payment, prompt rating | `PUT /api/v1/rides/{id}/complete` | `UPDATE rides` (status=completed, total_fare=?), `UPDATE payments` | "Ride complete! Total: R150" |
| 15 | Rate driver (5 stars) | Submit rating, update driver average | `POST /api/v1/rides/{id}/rate` | `INSERT ratings`, `UPDATE driver_profiles` | "Thanks for your feedback!" |
| 16 | View receipt | Show PDF receipt | `GET /api/v1/rides/{id}/receipt` | — | Receipt with breakdown |

**State Transitions:** searching → matched → arrived → in_progress → completed
**DB Transitions:** `rides` INSERT → UPDATE (multiple) → `payments` INSERT → `ratings` INSERT

#### Alternate Paths

| Path | Condition | Behavior |
|------|-----------|----------|
| A1: Cash payment | payment_method=cash | Skip gateway charge, driver confirms "Received Cash" |
| A2: Wallet payment | payment_method=wallet, balance sufficient | Deduct from wallet balance |
| A3: Surge pricing active | demand/supply ratio > threshold | Show "Surge" indicator, multiply fare by 1.5x-2.5x |
| A4: Promo code applied | valid promo code entered | Apply discount before fare calculation |

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: No drivers online (60s timeout) | Cancel ride, refund if paid | "No drivers available. Please try again later." | Yes (manual) |
| F2: Driver cancels after accept | Re-broadcast to next driver, notify rider | "Driver cancelled. Finding another driver..." | Auto (3x max) |
| F3: All drivers cancel | Cancel ride, notify rider | "Could not find a driver. Please try again." | No |
| F4: Payment fails (digital) | Hold ride, notify rider | "Payment failed. Please update your payment method." | Yes (retry link) |
| F5: GPS lost during ride | Continue with last known, warn rider | "GPS signal lost. Ride tracking may be delayed." | Auto-reconnect |
| F6: Network lost mid-ride | Queue actions, sync on reconnect | "Reconnecting..." banner | Auto |
| F7: Fare estimate >20% of actual | Flag for review, auto-adjust | "Final fare adjusted to R{amount}" | No |

#### Timeout Paths

| Timeout | Duration | Action |
|---------|----------|--------|
| Driver search | 60 seconds | Cancel, notify "No drivers available" |
| Driver arrival | 30 minutes | Warn rider, allow cancel without fee |
| Rider no-show after arrived | 5 minutes | Driver can cancel, charge R15 cancellation fee |
| Payment processing | 30 seconds | Retry once, then fail |
| Socket.IO reconnect | 5 seconds | Show "Reconnecting..." then reconnect |

#### Retry Logic

| Retry | Max Attempts | Interval | Backoff |
|-------|-------------|----------|---------|
| Driver search (expand radius) | 8 (3km→11km) | 15s | None |
| Payment charge | 3 | 30s | Exponential |
| Socket.IO reconnect | 10 | 1s → 30s | Exponential |

---

### WF-R03: Rider Cancellation

**Actor:** Rider
**FR Reference:** FR-RIDE-11

#### Preconditions
- Ride is in SEARCHING, MATCHED, or ARRIVED state
- Rider is logged in

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Cancel Ride" | Show cancellation form | — | — | Reason selection UI |
| 2 | Select reason (e.g., "Changed mind") | — | — | — | Reason selected |
| 3 | Tap "Confirm Cancel" | Cancel ride, notify driver, process fee if applicable | `POST /api/v1/rides/{id}/cancel` | `UPDATE rides` (status=cancelled, cancellation_fee=?) | "Ride cancelled" |
| 4 | View refund (if applicable) | Process partial/full refund | — | `UPDATE payments` | Refund details shown |

**State Transitions:** MATCHED → CANCELLED, ARRIVED → CANCELLED (with fee), SEARCHING → CANCELLED (no fee)
**DB Transitions:** `rides` UPDATE (status=cancelled, cancellation_fee=R15 if arrived)

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Ride already completed | Reject | "Ride already completed. No cancellation possible." | No |
| F2: Cancellation after grace period | Charge fee | "R15 cancellation fee applied." | No |
| F3: Network timeout | Queue cancel request | "Cancel request queued. Will process when online." | Auto-sync |

---

### WF-R04: Rider SOS Alert

**Actor:** Rider
**FR Reference:** FR-SFT-01, FR-SFT-02

#### Preconditions
- Ride is IN_PROGRESS
- Rider has location services enabled

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap red "SOS" button | Confirm dialog: "Are you in danger?" | — | — | Confirmation modal |
| 2 | Tap "Yes, send SOS" | Create SOS alert, start location broadcast (5s), notify admin + SMS to emergency contacts | `POST /api/v1/sos` | `INSERT sos_alerts` (status=active), `UPDATE rides` (sos_triggered=true) | "Help is on the way! Stay calm." |
| 3 | Location broadcast | Send GPS every 5s to admin dashboard | Socket.IO: `sos_location` event | `UPDATE sos_alerts` (location history) | Pulsing red indicator |
| 4 | Admin acknowledges | Admin calls rider within 30s | — | `UPDATE sos_alerts` (status=acknowledged, acknowledged_by=admin) | "Admin has been alerted. Help is coming." |
| 5 | Incident resolved | Admin resolves with notes | `PUT /api/v1/sos/{id}/resolve` | `UPDATE sos_alerts` (status=resolved, resolution_notes=?) | "SOS resolved. You are safe." |

**State Transitions:** active → acknowledged → resolved
**DB Transitions:** `sos_alerts` INSERT → UPDATE (multiple)

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Network lost | Queue SOS, retry when online, log to local storage | "SOS queued. Will send when connected." | Auto |
| F2: Admin doesn't acknowledge in 30s | Escalate: send SMS to all admins, log SLA breach | "Escalating to senior admin..." | Auto |
| F3: Emergency contact SMS fails | Log, retry, fallback to WhatsApp | "Emergency SMS failed. Retrying..." | 3x retry |
| F4: GPS unavailable | Use cell tower location (low accuracy) | "Location accuracy reduced." | — |

#### Timeout Paths

| Timeout | Duration | Action |
|---------|----------|--------|
| SOS broadcast | Until ride ends or resolved | Continuous 5s location updates |
| Admin SLA | 30 seconds | Escalate to senior admin |
| Emergency contact SMS | 10 seconds | Retry 3x |

---

### WF-R05: Ride Sharing (Trusted Contacts)

**Actor:** Rider
**FR Reference:** FR-SFT-03, FR-SFT-04

#### Preconditions
- Ride is MATCHED or IN_PROGRESS
- Rider has added trusted contacts (up to 5)

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Share Ride" | Generate tracking link with ride token | `POST /api/v1/rides/{id}/share` | `UPDATE rides` (share_token=generated) | Share sheet (WhatsApp/SMS/Copy) |
| 2 | Share via WhatsApp | Send link with ride details | — | — | "Link shared!" |
| 3 | Recipient opens link | Show live map with driver/rider location, ETA, ride details | `GET /api/v1/rides/share/{token}` | — | Public tracking page |
| 4 | Ride ends | Link expires, notify recipient | — | `UPDATE rides` (share_token=null) | "Ride completed. Link expired." |

**State Transitions:** None (tracking link is separate from ride state)
**DB Transitions:** `rides` UPDATE (share_token, then null)

---

### WF-R06: Schedule Ride

**Actor:** Rider
**FR Reference:** FR-RIDE-17

#### Preconditions
- Rider is logged in
- Future time selected (1-72 hours ahead)
- Payment method set

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Schedule Ride" | Show date/time picker | — | — | Calendar + time UI |
| 2 | Select date/time (tomorrow 07:00) | Validate future time, check availability | `POST /api/v1/rides/schedule` | `INSERT scheduled_rides` (status=pending) | "Scheduled for 07:00 tomorrow" |
| 3 | 15 minutes before scheduled time | System searches for available drivers | System cron job | `UPDATE scheduled_rides` (status=searching) | "Looking for drivers..." |
| 4 | 5 minutes before or driver found | Assign driver, notify rider | `POST /api/v1/scheduled-rides/{id}/dispatch` | `UPDATE scheduled_rides` (status=confirmed), `INSERT rides` | "Driver confirmed! [Name] will arrive at 07:00" |
| 5 | Ride proceeds | Standard ride flow | — | — | Standard ride UI |

**State Transitions:** pending → searching → confirmed → in_progress → completed
**DB Transitions:** `scheduled_rides` INSERT → UPDATE → `rides` INSERT

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: No drivers found | Notify rider 30 min before, suggest alternatives | "No drivers available for your scheduled time. Book now?" | Auto-retry at 10min before |
| F2: Driver cancels scheduled ride | Re-dispatch immediately, notify rider | "Your driver cancelled. Finding replacement..." | Auto (3x) |
| F3: Rider cancels scheduled ride | Cancel, refund if paid | "Scheduled ride cancelled." | No |

---

### WF-R07: Rating & Review

**Actor:** Rider
**FR Reference:** FR-RIDE-13

#### Preconditions
- Ride status = COMPLETED
- Within 2 hours of ride completion
- Not already rated

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | App shows rating prompt | Display 5-star selector + comment field | — | — | Rating UI |
| 2 | Tap 5 stars, add comment "Great driver!" | Submit rating | `POST /api/v1/rides/{id}/rate` | `INSERT ratings` (rating=5, comment=...), `UPDATE driver_profiles` (rating_sum+=5, rating_count+=1) | "Thanks for your feedback!" |
| 3 | Driver gets notification | Push: "You received a 5-star rating!" | — | — | Driver gets tip notification |

**State Transitions:** None (rating is a side effect)
**DB Transitions:** `ratings` INSERT, `driver_profiles` UPDATE

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Already rated | Reject | "You've already rated this ride." | No |
| F2: Ride not completed | Reject | "Can only rate completed rides." | No |
| F3: Rating >2 stars with comment | Flag for review | "Thank you. Your feedback helps us improve." | No |

---

### WF-R08: Self-Service Account Deletion

**Actor:** Rider
**FR Reference:** FR-AUTH-07

#### Preconditions
- Rider is logged in
- No active ride or scheduled ride
- No outstanding payment disputes

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Go to Settings → "Delete Account" | Show confirmation + consequences | — | — | Deletion warning page |
| 2 | Confirm with password | Verify identity | `POST /api/v1/account/delete` | — | "Final confirmation" |
| 3 | Tap "Delete My Account" | Schedule deletion (30-day grace), anonymize PII immediately | `DELETE /api/v1/account` | `UPDATE users` (anonymized_at=now, deleted_at=now+30d) | "Account scheduled for deletion" |
| 4 | 30-day grace period | Send reminder at day 7 and day 14 | Cron job | — | Email reminders |
| 5 | Grace period expires | Permanent deletion: purge user data, keep financial records anonymized | System cron | `DELETE users`, `ANonymize payments`, `ANonymize rides` | — |

**State Transitions:** active → anonymized → deleted
**DB Transitions:** `users` UPDATE (anonymized_at) → DELETE (after 30 days)

---

## 2. Driver Workflows

### WF-D01: Driver Registration & KYC

**Actor:** Driver
**FR Reference:** FR-AUTH-08, FR-AUTH-10

#### Preconditions
- Driver does NOT have an existing account
- Driver has: SA ID, valid license, vehicle registration, insurance
- Admin has enabled new driver registration (or admin creates account)

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Open driver app → "Register" | Show registration form | — | — | Registration UI |
| 2 | Enter phone, email, password | Validate uniqueness, format | `POST /api/v1/driver/register` | — | Form validated |
| 3 | Tap "Create Account" | Create user (role=driver, is_approved=false), create driver_profile | `POST /api/v1/driver/register` | `INSERT users`, `INSERT driver_profiles` | "Account created! Complete KYC." |
| 4 | Upload ID document | Store file, create KYC record (status=pending) | `POST /api/v1/kyc/identity` | `INSERT kyc_verifications` (type=identity, status=pending) | "ID uploaded. Under review." |
| 5 | Upload license | Store file, create KYC record | `POST /api/v1/kyc/license` | `INSERT kyc_verifications` (type=license, status=pending) | "License uploaded." |
| 6 | Upload vehicle registration | Store file, create KYC record | `POST /api/v1/kyc/vehicle` | `INSERT kyc_verifications` (type=vehicle, status=pending) | "Vehicle docs uploaded." |
| 7 | Upload insurance | Store file, create KYC record | `POST /api/v1/kyc/insurance` | `INSERT kyc_verifications` (type=insurance, status=pending) | "Insurance uploaded." |
| 8 | Take selfie for verification | Store selfie, create KYC record | `POST /api/v1/kyc/face` | `INSERT kyc_verifications` (type=face, status=pending) | "Selfie captured." |
| 9 | Submit for review | Notify admin, show pending status | — | — | "Application submitted! Review within 48h." |
| 10 | Admin reviews (see WF-A02) | Admin approves/rejects each document | — | — | — |
| 11 | Admin approves | Driver receives push notification, account activated | — | `UPDATE users` (is_approved=true), `UPDATE driver_profiles` (is_approved=true) | "Your account is approved! Go online to start earning." |

**State Transitions:** is_approved=false → is_approved=true (after admin approval)
**DB Transitions:** `users` INSERT → UPDATE, `driver_profiles` INSERT → UPDATE, `kyc_verifications` INSERT × N → UPDATE

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: KYC rejected (expired doc) | Reject specific doc, keep others | "Your license is expired. Please upload a valid one." | Yes (re-upload) |
| F2: KYC rejected (poor photo) | Reject, ask for retake | "Document photo is unclear. Please retake." | Yes (retake) |
| F3: All KYC rejected | Reject entire application | "Application rejected. Please reapply with valid documents." | Yes (re-apply) |
| F4: KYC pending >48h | Escalate to admin | "Your application is being reviewed. Thank you for your patience." | — |

---

### WF-D02: Go Online/Offline

**Actor:** Driver
**FR Reference:** FR-DRV-01

#### Preconditions
- Driver is approved (is_approved=true)
- Driver has no active ride
- Driver has no document expiry >7 days

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Tap "Go Online" toggle | Validate: approved, no active ride, docs valid | `POST /api/v1/driver/online` | `UPDATE users` (is_online=true, last_location_update=now) | Green indicator: "You're online!" |
| 2 | Location tracking starts | GPS updates every 15s (idle) | Socket.IO: `driver_location` event | `UPDATE users` (current_lat, current_lng) | Map shows current location |
| 3 | Ride request received | Push notification, 30s countdown | Socket.IO: `ride_request` event | — | "New ride request! Pickup 2km away. R85. [30s countdown]" |
| 4 | Tap "Go Offline" toggle | Stop location tracking, remove from dispatch pool | `POST /api/v1/driver/offline` | `UPDATE users` (is_online=false) | Gray indicator: "You're offline" |

**State Transitions:** offline → online → offline
**DB Transitions:** `users` UPDATE (is_online, current_lat/lng)

#### Alternate Paths

| Path | Condition | Behavior |
|------|-----------|----------|
| A1: Auto-offline (3 rejects) | Driver rejects 3 consecutive rides | Auto-offline + "You've been set offline. Go online when ready." |
| A2: Auto-offline (30 min idle) | No ride requests for 30 min | Auto-offline + "You've been set offline due to inactivity." |
| A3: Auto-offline (14h continuous) | Driver online >14h | Auto-offline + "You've been driving for 14 hours. Please rest." |
| A4: Documents expired | License/insurance expired >7 days | "Cannot go online. Please renew your documents." |

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: GPS unavailable | Allow online, mark as "location unavailable" | "GPS unavailable. Location tracking paused." | Auto-reconnect |
| F2: Network lost while online | Maintain online state, queue location updates | "Reconnecting..." banner | Auto |
| F3: Driver has active ride | Reject | "You have an active ride. Complete it first." | No |

---

### WF-D03: Accept/Reject Ride Request

**Actor:** Driver
**FR Reference:** FR-DRV-02, FR-DRV-03

#### Preconditions
- Driver is online
- Ride request received within dispatch radius

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Receive ride request notification | Show pickup, distance, estimated fare, rider rating, 30s countdown | Socket.IO: `ride_request` | — | "New ride: 2km pickup, R85, Rider 4.8⭐" |
| 2 | Tap "Accept" | Atomic DB accept (first-to-accept wins), notify rider, stop dispatching to other drivers | `POST /api/v1/rides/{id}/accept` | `UPDATE rides` (status=matched, driver_id=this_driver) | "Ride accepted! Navigate to pickup." |
| 3 | Tap "Navigate" | Deep link to Google Maps with pickup coordinates | — | — | Google Maps opens |
| 4 | Arrive at pickup | Tap "Arrived" to notify rider | `PUT /api/v1/rides/{id}/arrive` | `UPDATE rides` (status=arrived, arrived_at=now) | "Rider notified. Waiting..." |
| 5 | 5-min timer starts | Timer displayed, rider notified | — | — | Countdown timer |
| 6 | Rider enters vehicle | Tap "Start Ride" | `PUT /api/v1/rides/{id}/start` | `UPDATE rides` (status=in_progress, started_at=now) | "Ride in progress" |
| 7 | Navigate to dropoff | Deep link to Google Maps with dropoff coordinates | — | — | Navigation |
| 8 | Arrive at dropoff | Tap "Complete Ride" | `PUT /api/v1/rides/{id}/complete` | `UPDATE rides` (status=completed) | "Ride complete!" |

**State Transitions:** online → matched → arrived → in_progress → completed → online
**DB Transitions:** `rides` UPDATE (status, driver_id, timestamps)

#### Alternate Paths

| Path | Condition | Behavior |
|------|-----------|----------|
| A1: Reject ride | Driver taps "Reject" within 30s | Remove from this driver's queue, re-broadcast to next driver |
| A2: 30s timeout | Driver doesn't respond | Auto-reject, re-broadcast to next driver |
| A3: Rider cancels during MATCHED | Rider cancels before arrival | Cancel ride, notify driver, no fee if before arrival |
| A4: Rider no-show (5 min) | Rider doesn't appear after ARRIVED | Driver can cancel, charge R15 fee |

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Accept race condition (2 drivers) | Atomic DB lock, first wins | "Ride was taken by another driver." (loser) | Auto-receive next request |
| F2: Network lost after accept | Queue "arrived" action, sync when online | "Reconnecting..." | Auto |
| F3: GPS lost during ride | Continue with last known, warn | "GPS lost. Ride tracking may be delayed." | Auto-reconnect |

---

### WF-D04: Cash Payment Confirmation

**Actor:** Driver
**FR Reference:** FR-PAY-01, US-D06

#### Preconditions
- Ride is IN_PROGRESS
- Rider selected "Cash" payment method
- Ride completes

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Ride completes | Show fare: R150 | — | — | "Ride complete. Fare: R150" |
| 2 | Rider hands cash to driver | — | — | — | — |
| 3 | Driver taps "Received Cash" | Create cash reconciliation record | `POST /api/v1/payments/cash-confirm` | `INSERT cash_reconciliations` (ride_id, amount, confirmed_by=driver) | "Cash confirmed. R150 added to earnings." |
| 4 | Wallet credited | Driver wallet balance updated | — | `UPDATE wallets` (balance += R150 - platform_fee) | Balance shown |

**State Transitions:** None (payment method side effect)
**DB Transitions:** `cash_reconciliations` INSERT, `wallets` UPDATE

---

### WF-D05: Payout Request

**Actor:** Driver
**FR Reference:** FR-DRV-09, FR-PAY-09

#### Preconditions
- Driver has available wallet balance ≥ R100
- Driver has bank account details on file

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Go to Earnings → "Request Payout" | Show available balance, min R100 | — | — | "Available: R1,250. Min payout: R100" |
| 2 | Enter amount (R500) | Validate ≥R100, ≤ available | — | — | Amount entered |
| 3 | Tap "Request Payout" | Create payout request, lock funds | `POST /api/v1/payouts/request` | `INSERT driver_payouts` (status=pending, amount=500), `UPDATE wallets` (locked += 500) | "Payout requested! Processing within 24h." |
| 4 | Admin reviews (see WF-A06) | Admin approves batch | — | — | — |
| 5 | Payment processed | Bank transfer initiated | `PUT /api/v1/payouts/{id}/process` | `UPDATE driver_payouts` (status=processing, transaction_id=?) | "Payout processing..." |
| 6 | Transfer successful | Notify driver, update balance | Webhook from payment gateway | `UPDATE driver_payouts` (status=completed), `UPDATE wallets` (locked -= 500) | "R500 deposited to your bank account!" |

**State Transitions:** pending → processing → completed (or failed)
**DB Transitions:** `driver_payouts` INSERT → UPDATE, `wallets` UPDATE

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Insufficient balance | Reject | "Insufficient balance. Available: R{amount}" | No |
| F2: Bank details missing | Reject | "Please add your bank details first." | Redirect to profile |
| F3: Payout below min | Reject | "Minimum payout is R100." | No |
| F4: Bank transfer fails | Retry 3x, notify driver + admin | "Payout failed. Retrying..." | 3x auto-retry |

---

### WF-D06: Document Renewal

**Actor:** Driver
**FR Reference:** FR-DRV-11

#### Preconditions
- Driver has uploaded documents previously
- Document expiry approaching (30 days or expired)

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Document expiring in 30 days | Push notification + in-app warning | System cron | — | "Your license expires in 30 days. Please renew." |
| 2 | Tap "Renew" | Show upload form | — | — | Document upload UI |
| 3 | Upload new document | Store, create new KYC record, keep old active until new approved | `POST /api/v1/kyc/renew/{doc_type}` | `INSERT kyc_verifications` (status=pending) | "Document uploaded. Under review." |
| 4 | Admin approves new doc | Old record archived, new record active | — | `UPDATE kyc_verifications` (status=approved) | "Document renewed!" |
| 5 | Document expires without renewal | Auto-deactivate driver, notify admin | System cron | `UPDATE users` (is_active=false) | "Cannot go online. Document expired." |

**State Transitions:** active → expiring → renewed (or expired → deactivated)
**DB Transitions:** `kyc_verifications` INSERT → UPDATE

---

## 3. Admin Workflows

### WF-A01: Admin Login (2FA)

**Actor:** Admin
**FR Reference:** FR-AUTH-11, FR-AUTH-12

#### Preconditions
- Admin account exists with email + password + TOTP enabled
- Access from allowed IP (if IP restriction enabled)

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Enter email + password | Validate credentials, check IP, check lockout | `POST /api/v1/admin/login` | — | "Password verified. Enter 2FA code." |
| 2 | Enter TOTP code (from authenticator app) | Verify TOTP, create session | `POST /api/v1/admin/login/totp` | `INSERT admin_audit_logs` (action=login) | Admin dashboard |
| 3 | Session active | Cookie-based session (SPA), IP-restricted | — | — | Full admin dashboard |

**State Transitions:** unauthenticated → authenticated → session_active
**DB Transitions:** `admin_audit_logs` INSERT

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Wrong password | Increment attempts, lock at 5 | "Invalid email or password." | 5 attempts |
| F2: Wrong TOTP | Increment attempts, lock at 5 | "Invalid 2FA code." | 5 attempts |
| F3: IP not allowed | Reject | "Access denied from this IP address." | No |
| F4: Account suspended | Reject | "Account suspended. Contact super admin." | No |

---

### WF-A02: Driver KYC Approval

**Actor:** Admin
**FR Reference:** FR-ADM-05, FR-ADM-06

#### Preconditions
- Driver has submitted KYC documents
- Admin has ops-admin or super-admin role

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Open "Pending Approvals" | List drivers with pending KYC | `GET /api/v1/admin/kyc/pending` | — | Queue of drivers |
| 2 | Select driver | Show all uploaded documents side-by-side | `GET /api/v1/admin/kyc/{driver_id}` | — | Document viewer |
| 3 | Review ID document | Show image, zoom | — | — | ID front/back |
| 4 | Tap "Approve ID" | Mark KYC record approved | `PUT /api/v1/admin/kyc/{kyc_id}/approve` | `UPDATE kyc_verifications` (status=approved, verified_by=admin_id) | "ID approved ✅" |
| 5 | Repeat for all documents | All KYC records approved | — | — | — |
| 6 | Tap "Approve Driver" | Activate driver account, notify driver | `PUT /api/v1/admin/drivers/{driver_id}/approve` | `UPDATE users` (is_approved=true), `UPDATE driver_profiles` (is_approved=true) | "Driver approved and notified!" |

**State Transitions:** pending → approved (per document) → driver approved
**DB Transitions:** `kyc_verifications` UPDATE × N, `users` UPDATE, `driver_profiles` UPDATE

#### Alternate Paths

| Path | Condition | Behavior |
|------|-----------|----------|
| A1: Reject document | Document invalid | `UPDATE kyc_verifications` (status=rejected, rejection_reason=?) → driver notified to re-upload |
| A2: Partial approve | Some docs pass, some fail | Approve passing docs, reject failing → driver re-uploads failing only |

---

### WF-A03: Pricing Configuration

**Actor:** Admin
**FR Reference:** FR-ADM-08, FR-ADM-09

#### Preconditions
- Admin has super-admin or ops-admin role

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Open "Pricing" | Show current rate cards per ride type | `GET /api/v1/admin/pricing` | — | Rate card table |
| 2 | Edit Economy rate: per-km R8.50 → R9.00 | Validate change, preview impact on example trip | `PUT /api/v1/admin/pricing/economy` | `UPDATE system_settings` (key=pricing_economy, value=JSON) | "Preview: 10km trip: R85 → R90" |
| 3 | Tap "Save" | Apply new pricing, log change | — | `INSERT admin_audit_logs` (action=pricing_change, diff=?) | "Pricing updated! New rates active." |
| 4 | Enable surge | Set max multiplier (2.5x), time-based schedule | `PUT /api/v1/admin/pricing/surge` | `UPDATE system_settings` | "Surge pricing enabled" |

**State Transitions:** None (configuration change)
**DB Transitions:** `system_settings` UPDATE, `admin_audit_logs` INSERT

---

### WF-A04: SOS Incident Response

**Actor:** Admin
**FR Reference:** FR-ADM-05, FR-SFT-01, FR-SFT-02

#### Preconditions
- SOS alert active (from WF-R04)
- Admin is logged in

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | SOS alert appears on dashboard | Red flashing alert with rider/driver details, live GPS | Socket.IO: `sos_alert` | — | "SOS ALERT: [Rider] in ride with [Driver]" |
| 2 | Tap "Acknowledge" | Stop flashing, start 30s call timer | `PUT /api/v1/sos/{id}/acknowledge` | `UPDATE sos_alerts` (status=acknowledged, acknowledged_by=admin_id) | "Call rider within 30s" |
| 3 | Call rider | Phone app opens with rider number | — | — | Phone dialer |
| 4 | Resolve incident | Enter resolution notes, select outcome | `PUT /api/v1/sos/{id}/resolve` | `UPDATE sos_alerts` (status=resolved, resolution_notes=?, resolved_at=now) | "Incident resolved." |
| 5 | Create incident report | Document for compliance | `POST /api/v1/incidents` | `INSERT incident_reports` (type=sos, ride_id=?) | Report saved |

**State Transitions:** active → acknowledged → resolved
**DB Transitions:** `sos_alerts` UPDATE, `incident_reports` INSERT, `admin_audit_logs` INSERT

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Admin doesn't acknowledge in 30s | Escalate to super admin | "ESCALATED: Unacknowledged SOS" | Auto-escalate |
| F2: Can't reach rider | Escalate: police, emergency services | "Unable to reach rider. Escalating to authorities." | Manual |
| F3: Driver not responding | Flag driver, consider suspension | "Driver not responding to admin contact." | — |

---

### WF-A05: Weekly Payout Batch Processing

**Actor:** Admin
**FR Reference:** FR-PAY-10, FR-ADM-16

#### Preconditions
- It's Monday (payout day)
- Drivers have completed rides in the past week
- Payment gateway is operational

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Open "Payout Queue" | Calculate Mon-Sun earnings per driver, show batch | `GET /api/v1/admin/payouts/queue` | — | "15 drivers, R45,000 total" |
| 2 | Review per-driver breakdown | Show earnings, platform fees, net payout | — | — | Detailed table |
| 3 | Tap "Process Batch" | Submit batch to payment gateway | `POST /api/v1/admin/payouts/process` | `UPDATE driver_payouts` (status=processing) | "Processing 15 payouts..." |
| 4 | Gateway processes transfers | Each transfer success/failure logged | Webhook | `UPDATE driver_payouts` (status=completed/failed) | "14/15 successful, 1 failed" |
| 5 | Review failures | Show failed payout, reason, retry option | — | — | Failed payout details |
| 6 | Retry failed payout | Re-process failed transfers | `POST /api/v1/admin/payouts/retry/{id}` | `UPDATE driver_payouts` | "Retry processing..." |

**State Transitions:** queued → processing → completed/failed
**DB Transitions:** `driver_payouts` UPDATE × N, `admin_audit_logs` INSERT

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Payment gateway down | Queue batch, alert admin | "Gateway unavailable. Payout batch queued." | Retry at next opportunity |
| F2: Insufficient platform balance | Alert super admin, halt batch | "Insufficient funds. Contact finance." | Manual resolution |
| F3: Bank account closed | Mark failed, notify driver | "Bank transfer failed. Driver must update bank details." | No (driver action needed) |

---

### WF-A06: User Suspension

**Actor:** Admin
**FR Reference:** FR-ADM-07

#### Preconditions
- Admin has super-admin or ops-admin role
- Target user exists and is active

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Search for user | Show user profile | `GET /api/v1/admin/users/{id}` | — | User profile |
| 2 | Tap "Suspend" | Show suspension form | — | — | Reason input |
| 3 | Enter reason: "Policy violation" | Confirm suspension | — | — | "Are you sure?" |
| 4 | Confirm | Immediately deactivate, notify user, log | `PUT /api/v1/admin/users/{id}/suspend` | `UPDATE users` (is_active=false, suspended_at=now), `INSERT admin_audit_logs` | "User suspended." |
| 5 | Later: Reactivate | Reactivate with reason | `PUT /api/v1/admin/users/{id}/reactivate` | `UPDATE users` (is_active=true, suspended_at=null) | "User reactivated." |

**State Transitions:** active → suspended → active (or deleted)
**DB Transitions:** `users` UPDATE, `admin_audit_logs` INSERT

---

## 4. Food Delivery Workflows

### WF-F01: Place Food Order

**Actor:** Rider (as customer)
**FR Reference:** FR-FOOD-06, FR-FOOD-07

#### Preconditions
- Rider is logged in
- Restaurants available in area
- Delivery address in service zone

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Open "Food" tab | List restaurants with search/filter | `GET /api/v1/restaurants` | — | Restaurant list |
| 2 | Select restaurant | Show menu categories + items | `GET /api/v1/restaurants/{id}/menu` | — | Menu UI |
| 3 | Add item to cart | Show cart with total | `POST /api/v1/cart/items` | — | Cart badge |
| 4 | Tap "Checkout" | Show delivery address, payment method, total | — | — | Checkout screen |
| 5 | Confirm order | Create order, charge payment, notify restaurant | `POST /api/v1/food-orders` | `INSERT food_orders` (status=pending), `INSERT food_order_items` | "Order placed! Awaiting confirmation." |
| 6 | Restaurant confirms | Status → CONFIRMED, driver assigned | Socket.IO: `order_status` | `UPDATE food_orders` (status=confirmed) | "Restaurant confirmed! Preparing..." |
| 7 | Restaurant prepares | Status → PREPARING | Socket.IO: `order_status` | `UPDATE food_orders` (status=preparing) | "Your food is being prepared." |
| 8 | Restaurant ready | Status → READY_FOR_PICKUP, driver assigned | Socket.IO: `order_status` | `UPDATE food_orders` (status=ready_for_pickup) | "Ready for pickup! Driver en route." |
| 9 | Driver picks up | Status → PICKED_UP, driver GPS tracking | Socket.IO: `order_status` | `UPDATE food_orders` (status=picked_up) | "Driver has your order. ETA: 15 min." |
| 10 | Driver delivers | Status → DELIVERED, rate food + delivery | Socket.IO: `order_status` | `UPDATE food_orders` (status=delivered) | "Delivered! Rate your order." |
| 11 | Rate order | 1-5 stars for food, 1-5 for delivery | `POST /api/v1/food-orders/{id}/rate` | `INSERT ratings` | "Thanks!" |

**State Transitions:** pending → confirmed → preparing → ready_for_pickup → picked_up → delivered
**DB Transitions:** `food_orders` INSERT → UPDATE × N, `food_order_items` INSERT, `ratings` INSERT

#### Failure Paths

| Failure | System Action | Error Message | Retry? |
|---------|---------------|---------------|--------|
| F1: Restaurant rejects order | Refund payment, notify customer | "Restaurant unable to fulfill order. Refund processed." | No (customer re-orders) |
| F2: No drivers available for delivery | Keep order at READY_FOR_PICKUP, retry dispatch | "Finding a delivery driver..." | Auto-retry every 5 min |
| F3: Payment fails | Reject order | "Payment failed. Please try again." | Yes |
| F4: Restaurant closes during prep | Refund, notify | "Restaurant closed. Order cancelled. Refund processed." | No |

---

### WF-F02: Food Delivery Driver Pickup

**Actor:** Driver (as delivery driver)
**FR Reference:** FR-FOOD-09

#### Preconditions
- Driver is online
- Food order is READY_FOR_PICKUP
- Driver is within delivery radius

#### Happy Path

| Step | User Action | System Action | API Call | DB Write | UI Output |
|------|-------------|---------------|----------|----------|-----------|
| 1 | Receive delivery request | Show restaurant, pickup location, delivery location, fee | Socket.IO: `delivery_request` | — | "New delivery: [Restaurant] → [Address]. Fee: R45" |
| 2 | Accept delivery | Assign driver, notify restaurant | `POST /api/v1/deliveries/{id}/accept` | `INSERT deliveries` (status=accepted) | "Navigate to restaurant" |
| 3 | Navigate to restaurant | Deep link to Google Maps | — | — | Navigation |
| 4 | Arrive at restaurant | Tap "Arrived at Restaurant" | `PUT /api/v1/deliveries/{id}/arrive-restaurant` | `UPDATE deliveries` (status=at_restaurant) | "Order ready for pickup?" |
| 5 | Pick up order | Confirm pickup, tap "Picked Up" | `PUT /api/v1/deliveries/{id}/picked-up` | `UPDATE deliveries` (status=picked_up) | "Navigate to customer" |
| 6 | Navigate to customer | Deep link to Google Maps | — | — | Navigation |
| 7 | Arrive at customer | Tap "Delivered" | `PUT /api/v1/deliveries/{id}/complete` | `UPDATE deliveries` (status=delivered) | "Delivery complete!" |

**State Transitions:** searching → accepted → at_restaurant → picked_up → delivered
**DB Transitions:** `deliveries` INSERT → UPDATE × N

---

## 5. System Workflows

### WF-S01: Surge Pricing Calculation

**Actor:** System (automated)
**FR Reference:** FR-RIDE-03

#### Preconditions
- Surge enabled by admin
- Real-time demand/supply data available

#### Happy Path

| Step | Trigger | System Action | DB Write | Output |
|------|---------|---------------|----------|--------|
| 1 | Every 5 minutes | Calculate demand/supply ratio per zone (H3 hex cells) | Read `rides` (last 5min), `users` (online drivers) | Ratio per zone |
| 2 | Ratio > 1.5 | Activate surge: multiplier = min(1.0 + (ratio - 1.5) × 0.5, 2.5) | `UPDATE surge_zones` (multiplier=?) | Surge indicator shown to riders |
| 3 | Ratio < 1.2 | Deactivate surge: multiplier = 1.0 | `UPDATE surge_zones` (multiplier=1.0) | Surge indicator removed |
| 4 | Ride request during surge | Apply current multiplier to fare estimate | Read `surge_zones` | "Surge pricing active (1.5x)" shown |

**State Transitions:** normal → surge_active → normal
**DB Transitions:** `surge_zones` UPDATE

---

### WF-S02: Scheduled Ride Dispatch

**Actor:** System (cron job)
**FR Reference:** FR-RIDE-17

#### Preconditions
- Scheduled rides exist for the next hour
- Drivers online in the area

#### Happy Path

| Step | Trigger | System Action | DB Write | Output |
|------|---------|---------------|----------|--------|
| 1 | T-15 min before scheduled time | Search for available drivers within 3km | Read `scheduled_rides`, `users` | Driver candidates |
| 2 | Driver found | Assign driver, notify rider | `UPDATE scheduled_rides` (status=confirmed), `INSERT rides` | Push to rider + driver |
| 3 | No driver at T-5 min | Expand radius to 5km, re-search | — | — |
| 4 | No driver at T-0 | Notify rider, suggest immediate booking | `UPDATE scheduled_rides` (status=failed) | "No drivers found. Book now?" |

---

### WF-S03: Escrow Release

**Actor:** System (cron job)
**FR Reference:** FR-PAY-07

#### Preconditions
- Ride completed > 24 hours ago
- Payment was digital (not cash)
- Funds in escrow

#### Happy Path

| Step | Trigger | System Action | DB Write | Output |
|------|---------|---------------|----------|--------|
| 1 | Every hour | Query rides completed >24h ago with unreleased escrow | Read `rides`, `payments` | Candidate rides |
| 2 | Release funds | Move from holding to driver escrow | `UPDATE payments` (escrow_status=released) | Funds released |
| 3 | Driver requests payout | Use released funds | — | — |

---

### WF-S04: Data Retention Enforcement

**Actor:** System (weekly cron job)
**FR Reference:** Phase 1 §9

#### Preconditions
- Retention schedule configured
- Database has records past retention period

#### Happy Path

| Step | Trigger | System Action | DB Write | Output |
|------|---------|---------------|----------|--------|
| 1 | Weekly (Sunday 02:00 SAST) | Query records past retention period per table | Read all tables | Candidate records |
| 2 | Soft-deleted > 30 days | Permanently delete | `DELETE users WHERE deleted_at < now() - 30d` | Records purged |
| 3 | Location data > 90 days | Anonymize coordinates | `UPDATE users SET current_lat=NULL, current_lng=NULL WHERE last_location_update < now() - 90d` | Location cleared |
| 4 | Financial records > 7 years | Anonymize PII, keep aggregates | `UPDATE payments SET rider_id=NULL WHERE created_at < now() - 7y` | Anonymized |
| 5 | Log audit retention actions | Log to compliance report | `INSERT system_settings` (key=retention_log) | Report generated |

---

### WF-S05: Push Notification Delivery

**Actor:** System
**FR Reference:** FR-NOT-01

#### Happy Path

| Step | Trigger | System Action | DB Write | Output |
|------|---------|---------------|----------|--------|
| 1 | Event occurs (ride status change, etc.) | Check user notification preferences | Read `notification_preferences` | Channel selection |
| 2 | Push enabled | Send via FCM | `INSERT in_app_notifications` | Push delivered |
| 3 | SMS enabled (critical only) | Send via Twilio/Clickatell | `INSERT in_app_notifications` | SMS delivered |
| 4 | Email enabled | Send via mail driver | `INSERT in_app_notifications` | Email queued |
| 5 | Delivery failed | Retry 3x, log failure | `UPDATE in_app_notifications` (status=failed) | Admin alerted |

---

## 6. State Machines

### 6.1 Ride State Machine

```
                              ┌─────────────────────┐
                              │      SEARCHING       │
                              └──────────┬──────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │ Driver found  │ 60s timeout   │
                         ▼               ▼               │
                  ┌──────────────┐  ┌──────────────┐     │
                  │   MATCHED    │  │  NO_DRIVER   │     │
                  └──────┬───────┘  └──────────────┘     │
                         │               │                │
           ┌─────────────┼───────┐       │                │
           │ Driver      │ Rider │       │                │
           │ arrives     │ cancels│      │                │
           ▼             ▼       ▼       │                │
    ┌────────────┐ ┌──────────┐ │        │                │
    │  ARRIVED   │ │CANCELLED │ │        │                │
    └─────┬──────┘ └──────────┘ │        │                │
          │                     │        │                │
    ┌─────┼─────────────┐       │        │                │
    │ Rider enters      │ No-show│       │                │
    │ vehicle           │ 5min  │        │                │
    ▼                   ▼       ▼        │                │
┌──────────────┐  ┌──────────────┐       │                │
│ IN_PROGRESS  │  │  CANCELLED   │       │                │
└──────┬───────┘  │  (with fee)  │       │                │
       │          └──────────────┘       │                │
       │ Driver completes                │                │
       ▼                                 │                │
┌──────────────┐                         │                │
│  COMPLETED   │                         │                │
└──────────────┘                         │                │
                                         │                │
           ┌─────────────────────────────┘                │
           │ Driver cancels                               │
           ▼                                              │
    ┌──────────────┐                                      │
    │  CANCELLED   │                                      │
    └──────────────┘                                      │
```

**Valid Transitions:**

| From | To | Trigger | Guard |
|------|----|---------|-------|
| SEARCHING | MATCHED | Driver accepts | Driver is online, no active ride |
| SEARCHING | NO_DRIVER | 60s timeout | No driver accepted |
| MATCHED | ARRIVED | Driver taps "Arrived" | GPS near pickup |
| MATCHED | CANCELLED | Rider/Driver cancels | Valid reason provided |
| ARRIVED | IN_PROGRESS | Driver taps "Start" | Rider in vehicle |
| ARRIVED | CANCELLED | Rider no-show (5 min) | 5-min timer expired |
| IN_PROGRESS | COMPLETED | Driver taps "Complete" | GPS near dropoff |
| IN_PROGRESS | CANCELLED | Emergency (SOS) | SOS triggered |

**Invalid Transitions (must be rejected):**
- COMPLETED → any (ride is terminal)
- CANCELLED → any (ride is terminal)
- SEARCHING → IN_PROGRESS (must go through MATCHED)
- MATCHED → COMPLETED (must go through ARRIVED → IN_PROGRESS)

---

### 6.2 Payment State Machine

```
                    ┌──────────┐
                    │ PENDING  │
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────┐
          │ Payment      │ Payment      │
          │ initiated    │ is cash      │
          ▼              ▼              │
   ┌──────────────┐ ┌──────────────┐   │
   │ PROCESSING   │ │   CASH       │   │
   └──────┬───────┘ └──────┬───────┘   │
          │                │            │
    ┌─────┼─────┐         │            │
    │ Success   │ Failure │            │
    ▼           ▼         ▼            │
┌────────┐ ┌────────┐ ┌────────┐      │
│COMPLETED│ │ FAILED │ │CONFIRMED│     │
└────────┘ └───┬────┘ └────────┘      │
               │                       │
               │ Retry (3x max)        │
               ▼                       │
        ┌──────────────┐               │
        │  REFUNDED    │               │
        └──────────────┘               │
```

**Valid Transitions:**

| From | To | Trigger | Guard |
|------|----|---------|-------|
| PENDING | PROCESSING | Payment initiated | Gateway available |
| PENDING | CASH | Rider selected cash | — |
| PROCESSING | COMPLETED | Gateway confirms | Valid transaction |
| PROCESSING | FAILED | Gateway rejects | Error from gateway |
| FAILED | PROCESSING | Retry | < 3 attempts |
| FAILED | REFUNDED | Admin refund | Admin action |
| CASH | CONFIRMED | Driver confirms receipt | Driver action |

---

### 6.3 Delivery State Machine (Food)

```
        ┌──────────┐
        │SEARCHING │
        └────┬─────┘
             │ Driver found
             ▼
      ┌──────────────┐
      │   ACCEPTED   │
      └──────┬───────┘
             │ Arrived at restaurant
             ▼
      ┌──────────────┐
      │AT_RESTAURANT │
      └──────┬───────┘
             │ Picked up order
             ▼
      ┌──────────────┐
      │  PICKED_UP   │
      └──────┬───────┘
             │ Arrived at customer
             ▼
      ┌──────────────┐
      │  DELIVERED   │
      └──────────────┘
```

---

### 6.4 Food Order State Machine

```
        ┌──────────┐
        │ PENDING  │
        └────┬─────┘
             │ Restaurant confirms
             ▼
      ┌──────────────┐
      │  CONFIRMED   │
      └──────┬───────┘
             │ Restaurant starts preparing
             ▼
      ┌──────────────┐
      │  PREPARING   │
      └──────┬───────┘
             │ Food ready
             ▼
      ┌──────────────────┐
      │READY_FOR_PICKUP  │
      └──────┬───────────┘
             │ Driver picks up
             ▼
      ┌──────────────┐
      │  PICKED_UP   │
      └──────┬───────┘
             │ Delivered
             ▼
      ┌──────────────┐
      │  DELIVERED   │
      └──────────────┘
```

---

### 6.5 SOS Alert State Machine

```
        ┌──────────┐
        │  ACTIVE  │
        └────┬─────┘
             │ Admin acknowledges
             ▼
      ┌──────────────┐
      │ ACKNOWLEDGED │
      └──────┬───────┘
             │ Incident resolved
             ▼
      ┌──────────────┐
      │   RESOLVED   │
      └──────────────┘
```

---

### 6.6 KYC Verification State Machine

```
        ┌──────────┐
        │ PENDING  │
        └────┬─────┘
             │ Admin reviews
       ┌─────┼─────┐
       │     │     │
       ▼     ▼     ▼
┌────────┐ ┌────────┐ ┌──────────┐
│APPROVED│ │REJECTED│ │UNDER_REVIEW│
└────────┘ └───┬────┘ └──────────┘
               │ Re-upload
               ▼
        ┌──────────────┐
        │   PENDING    │
        └──────────────┘
```

---

### 6.7 Dispute State Machine

```
        ┌──────────┐
        │  OPEN    │
        └────┬─────┘
             │ Admin assigns
             ▼
      ┌──────────────┐
      │   UNDER_     │
      │   REVIEW     │
      └──────┬───────┘
             │
       ┌─────┼─────┐
       │     │     │
       ▼     ▼     ▼
┌────────┐ ┌────────┐ ┌────────┐
│RESOLVED│ │ESCALATED│ │CLOSED  │
│(refund)│ │(legal) │ │(no     │
└────────┘ └────────┘ │ action)│
                       └────────┘
```

---

### 6.8 Driver Payout State Machine

```
        ┌──────────┐
        │ PENDING  │
        └────┬─────┘
             │ Admin processes
             ▼
      ┌──────────────┐
      │  PROCESSING  │
      └──────┬───────┘
             │
       ┌─────┼─────┐
       │     │     │
       ▼     ▼     ▼
┌────────┐ ┌────────┐ ┌────────┐
│COMPLETED│ │ FAILED │ │CANCELLED│
└────────┘ └───┬────┘ └────────┘
               │ Retry
               ▼
        ┌──────────────┐
        │  PROCESSING  │
        └──────────────┘
```

---

## 7. Sequence Diagrams — E2E Flows

### 7.1 Complete Ride Flow (Happy Path)

```
Rider                Server                Socket.IO             Driver               Payment Gateway
  │                     │                      │                    │                      │
  │─ POST /rides ──────►│                      │                    │                      │
  │                     │─ INSERT ride ────────│                    │                      │
  │                     │─ broadcast ─────────►│─ ride_request ───►│                      │
  │◄── "Searching" ─────│                      │                    │                      │
  │                     │                      │◄── accept ─────────│                      │
  │                     │◄── POST /rides/      │                    │                      │
  │                     │    {id}/accept ──────│                    │                      │
  │                     │─ UPDATE ride ────────│                    │                      │
  │                     │─ notify rider ──────►│─ matched ────────►│                      │
  │◄── "Driver found" ──│                      │                    │                      │
  │                     │                      │◄── driver_location │                      │
  │◄── driver ETA ──────│                      │                    │                      │
  │                     │                      │◄── arrived ────────│                      │
  │                     │─ UPDATE ride ────────│                    │                      │
  │◄── "Driver arrived" │                      │                    │                      │
  │                     │                      │◄── start ride ─────│                      │
  │                     │─ UPDATE ride ────────│                    │                      │
  │◄── "In progress" ───│                      │                    │                      │
  │                     │◄── GPS updates ──────│                    │                      │
  │◄── live location ───│                      │                    │                      │
  │                     │                      │◄── complete ───────│                      │
  │                     │─ UPDATE ride ────────│                    │                      │
  │                     │─ create payment ────────────────────────────────────────────────►│
  │                     │◄── payment confirmation ────────────────────────────────────────│
  │                     │─ UPDATE payment ─────│                    │                      │
  │◄── "Complete! R150" │                      │                    │                      │
  │─ POST /rate ───────►│                      │                    │                      │
  │                     │─ INSERT rating ──────│                    │                      │
  │                     │─ UPDATE driver ──────│                    │                      │
  │◄── "Thanks!" ───────│                      │                    │                      │
```

---

### 7.2 SOS Flow

```
Rider                Server                Socket.IO             Admin                SMS Provider
  │                     │                      │                    │                      │
  │─ POST /sos ────────►│                      │                    │                      │
  │                     │─ INSERT sos_alert ───│                    │                      │
  │                     │─ broadcast SOS ──────►│─ sos_alert ──────►│                      │
  │◄── "Help is coming" │                      │                    │                      │
  │                     │                      │◄── acknowledge ────│                      │
  │                     │─ UPDATE sos ─────────│                    │                      │
  │◄── "Admin alerted" ─│                      │                    │                      │
  │                     │◄── location updates (5s interval) ──────│                      │
  │                     │─ broadcast location ─►│─ sos_location ──►│                      │
  │                     │                      │                    │─ call rider ────────►│
  │                     │                      │                    │                      │
  │                     │                      │◄── resolve ────────│                      │
  │                     │─ UPDATE sos ─────────│                    │                      │
  │◄── "SOS resolved" ──│                      │                    │                      │
```

---

### 7.3 Food Order Flow

```
Customer             Server                Socket.IO          Restaurant           Driver
  │                     │                      │                    │                  │
  │─ POST /food-orders─►│                      │                    │                  │
  │                     │─ INSERT order ───────│                    │                  │
  │◄── "Order placed" ──│                      │                    │                  │
  │                     │─ notify restaurant ──►│─ new_order ──────►│                  │
  │                     │                      │◄── confirm ────────│                  │
  │                     │─ UPDATE order ───────│                    │                  │
  │◄── "Confirmed" ─────│                      │                    │                  │
  │                     │                      │◄── preparing ──────│                  │
  │                     │─ UPDATE order ───────│                    │                  │
  │◄── "Preparing" ─────│                      │                    │                  │
  │                     │                      │◄── ready ──────────│                  │
  │                     │─ UPDATE order ───────│                    │                  │
  │                     │─ find driver ───────────────────────────────────────────────►│
  │                     │◄── accept delivery ─────────────────────────────────────────│
  │                     │─ UPDATE order ───────│                    │                  │
  │◄── "Driver assigned"│                      │                    │                  │
  │                     │                      │◄── picked_up ────────────────────────│
  │                     │─ UPDATE order ───────│                    │                  │
  │◄── "Driver has order"│                     │                    │                  │
  │                     │◄── GPS updates ─────────────────────────────────────────────│
  │◄── live tracking ───│                      │                    │                  │
  │                     │                      │◄── delivered ────────────────────────│
  │                     │─ UPDATE order ───────│                    │                  │
  │◄── "Delivered!" ────│                      │                    │                  │
  │─ POST /rate ───────►│                      │                    │                  │
```

---

### 7.4 Payout Batch Flow

```
Admin               Server               Payment Gateway        Driver
  │                     │                      │                    │
  │─ POST /payouts/     │                      │                    │
  │  process ──────────►│                      │                    │
  │                     │─ batch transfers ──────────────────────►│
  │                     │◄── success (14/15) ────────────────────│
  │                     │─ UPDATE payouts ─────│                    │
  │                     │─ notify drivers ───────────────────────►│
  │◄── "14/15 complete" │                      │                    │
  │                     │◄── failure (1/15) ─────────────────────│
  │                     │─ UPDATE payout (failed)                 │
  │                     │─ notify failed driver ─────────────────►│
  │─ POST /payouts/     │                      │                    │
  │  retry/{id} ───────►│                      │                    │
  │                     │─ retry transfer ──────────────────────►│
  │                     │◄── success ────────────────────────────│
  │                     │─ UPDATE payout ──────│                   │
  │◄── "All complete" ──│                      │                    │
```

---

## 8. Failure Matrix & Recovery

### 8.1 Complete Failure Matrix

| ID | Failure Scenario | Detection | Severity | Recovery Action | SLA | Data Impact |
|----|-----------------|-----------|----------|-----------------|-----|-------------|
| FM-01 | Payment gateway down | Health check / webhook timeout | **CRITICAL** | Queue payments, retry when up, notify admin | < 5 min detection | No data loss; pending payments queued |
| FM-02 | SMS provider down | Delivery status webhook | HIGH | Retry 3x, fallback to alternate provider | < 5 min detection | OTP delays; no data loss |
| FM-03 | Firebase FCM down | Push delivery failure | HIGH | Queue pushes, retry when up, fallback to SMS for critical | < 10 min detection | Push delays; no data loss |
| FM-04 | PostgreSQL crash | Connection refused | **CRITICAL** | Failover to replica, alert admin | < 1 min detection | Potential 1-sec data loss (WAL gap) |
| FM-05 | Redis crash | Connection refused | HIGH | Failover to backup Redis, clear caches | < 2 min detection | Cache miss; performance degraded |
| FM-06 | Socket.IO server crash | WebSocket disconnect | HIGH | Auto-reconnect clients, restart server | < 30 sec recovery | Location tracking paused |
| FM-07 | Nominatim/OSRM down | API timeout | MEDIUM | Haversine fallback for distance, cache last results | < 10 min detection | Reduced accuracy; no data loss |
| FM-08 | GPS signal lost | No location update > 30s | MEDIUM | Use last known location, cell tower location | N/A | Reduced tracking accuracy |
| FM-09 | Network partition (driver) | Socket disconnect | MEDIUM | Queue actions, sync on reconnect | N/A | Delayed updates |
| FM-10 | Database disk full | PostgreSQL alert | **CRITICAL** | Emergency cleanup, expand disk, alert admin | < 5 min detection | Writes blocked |
| FM-11 | DDoS attack | Traffic spike detection | **CRITICAL** | Rate limiting, WAF, cloudflare mitigation | < 1 min detection | Service degraded |
| FM-12 | Race condition (double accept) | DB constraint violation | HIGH | Atomic DB lock, first-to-accept wins | N/A | One driver gets ride; other gets "taken" |
| FM-13 | Expired document (driver) | Cron job check | MEDIUM | Auto-deactivate driver, notify | Daily check | Driver cannot go online |
| FM-14 | KYC document tampering | Image hash mismatch | HIGH | Flag for manual review, suspend if confirmed | < 1 hour review | Investigation |
| FM-15 | Payment fraud (stolen card) | Gateway fraud detection | HIGH | Hold payment, notify admin, investigate | < 1 hour response | Payment held |

### 8.2 Recovery Procedures

#### FM-01: Payment Gateway Down
```
1. Detect: Health check fails OR webhook timeout > 30s
2. Immediate: Enable "payment_paused" flag in system_settings
3. Notify: Push to all admins + SMS to super admin
4. Riders: Show "Payment temporarily unavailable. Cash only." 
5. Queue: Store pending digital payments in Redis queue
6. Recovery: When gateway returns, process queue FIFO
7. Verify: Reconcile queued payments against gateway records
8. Post-mortem: Document cause, add monitoring
```

#### FM-04: PostgreSQL Crash
```
1. Detect: Connection pool exhaustion OR health check fails
2. Immediate: Failover to read replica (if available)
3. Notify: Push to all admins
4. Writes: Queue in Redis until primary recovers
5. Recovery: Restore primary from WAL backup
6. Verify: Check data integrity, reconcile queued writes
7. Post-mortem: Root cause analysis, add redundancy
```

#### FM-11: DDoS Attack
```
1. Detect: Request rate > 10x normal baseline
2. Immediate: Enable aggressive rate limiting (10 req/min per IP)
3. Cloudflare: Activate "I'm Under Attack" mode
4. Block: Blacklist attacking IPs at firewall
5. Notify: SMS to all admins
6. Monitor: Watch for legitimate traffic impact
7. Recovery: Gradually relax rate limits as attack subsides
8. Post-mortem: Attack vector analysis, harden defenses
```

---

## 9. Sign-Off

| Role | Name | Approved | Date | Notes |
|------|------|----------|------|-------|
| Lead Architect | _____________ | ☐ | ________ | |
| Security Engineer | _____________ | ☐ | ________ | |
| QA Lead | _____________ | ☐ | ________ | |
| DevOps Lead | _____________ | ☐ | ________ | |

**Approval Criteria:**
- [ ] All 8 rider workflows simulated with happy, alternate, failure, timeout, and retry paths
- [ ] All 6 driver workflows simulated
- [ ] All 6 admin workflows simulated
- [ ] All 2 food delivery workflows simulated
- [ ] All 5 system workflows simulated
- [ ] 8 state machines documented with valid/invalid transitions
- [ ] 4 sequence diagrams (E2E) documented
- [ ] 15 failure scenarios with recovery procedures
- [ ] No unresolved critical contradictions between workflows

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T18:00:00Z | Initial creation — 27 workflows, 8 state machines, 4 sequence diagrams, 15 failure scenarios |
