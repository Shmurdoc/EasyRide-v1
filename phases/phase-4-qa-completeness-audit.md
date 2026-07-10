# Phase 4: QA Completeness Audit

**Version:** 1.0.0
**Created:** 2026-07-08T19:00:00Z
**Status:** Approved
**Approved:** 2026-07-08T20:00:00Z
**Superpowers Phase:** 4 of 8 — QA Completeness Audit (Mandatory)
**Prepared by:** opencode
**Depends on:** Phase 1 (v1.0.0), Phase 2 (v1.0.0), Phase 3 (v1.0.0), PHBIMH Integration Analysis
**Sources:** Phase 1 (Requirements), Phase 2 (Data Model), Phase 3 (Workflows), PHBIMH system (E:\PHBIMH), MASTER_PROJECT_PLAN.md

---

## Summary

This document audits everything produced in Phases 1-3 plus the PHBIMH integration analysis. It identifies missing fields, missing validations, missing workflows, missing business rules, missing compliance requirements, missing security requirements, missing edge cases, contradictions, ambiguities, and incorrect assumptions. **Any critical/high item BLOCKS code generation per superpowers rules.**

---

## Table of Contents

1. [Missing Fields & Validations](#1-missing-fields--validations)
2. [Missing Workflows & Edge Cases](#2-missing-workflows--edge-cases)
3. [Contradictions & Ambiguities](#3-contradictions--ambiguities)
4. [PHBIMH Integration Gaps](#4-phbimh-integration-gaps)
5. [Security & Compliance Gaps](#5-security--compliance-gaps)
6. [Data Model Gaps](#6-data-model-gaps)
7. [Blocking Issues Summary](#7-blocking-issues-summary)
8. [Non-Blocking Issues](#8-non-blocking-issues)
9. [Sign-Off](#9-sign-off)

---

## 1. Missing Fields & Validations

### 1.1 Critical Missing Fields

| ID | Table | Missing Field | Type | Why Needed | Severity | Remediation |
|----|-------|---------------|------|------------|----------|-------------|
| MF-01 | `rides` | `estimated_distance_km` | decimal(8,3) | Rider sees estimate before ride; actual distance only known after completion. Need both for fare comparison. | **HIGH** | Add column; populate from OSRM at booking time |
| MF-02 | `rides` | `estimated_fare` | decimal(16,2) | Rider confirms booking based on estimate. Actual fare calculated at completion. Need to store estimate for dispute resolution. | **HIGH** | Add column; populate from fare estimate endpoint |
| MF-03 | `rides` | `estimated_duration_minutes` | decimal(5,1) | ETA shown to rider. Different from actual duration. | **MEDIUM** | Add column; populate from OSRM |
| MF-04 | `rides` | `pickup_note` | string(500) | Rider instructions: "Blue gate, ring bell", "Meet at parking lot". Critical for Phalaborwa where addresses are imprecise. | **HIGH** | Add column; optional, shown to driver |
| MF-05 | `rides` | `dropoff_note` | string(500) | Same as pickup_note for destination. | **MEDIUM** | Add column; optional |
| MF-06 | `rides` | `rider_cancel_reason` | string(50) | Phase 3 WF-R03 requires reason selection. Phase 2 data model has no column for it. | **HIGH** | Add column; ENUM: driver_not_responding, long_wait, changed_mind, accidental_request, other |
| MF-07 | `rides` | `driver_cancel_reason` | string(50) | Phase 3 WF-D03 requires driver reason. Phase 2 has no column. | **HIGH** | Add column; ENUM: rider_no_show, rider_rude, vehicle_issue, too_far, other |
| MF-08 | `rides` | `cancellation_initiated_by` | string(10) | Audit: who cancelled? rider/driver/system. | **MEDIUM** | Add column; ENUM: rider, driver, system |
| MF-09 | `users` | `preferred_language` | string(10) | Phase 1 §11 requires multi-language support (English, Sepedi, Afrikaans). No field to store preference. | **MEDIUM** | Add column; default 'en', nullable |
| MF-10 | `users` | `date_of_birth` | date | Age verification (18+ for riders, 21+ for drivers). Not in users table (only in driver_profiles). | **MEDIUM** | Add column; nullable for riders, required for drivers |
| MF-11 | `driver_profiles` | `years_of_driving_experience` | integer | Insurance and risk assessment. Useful for driver rating algorithms. | **LOW** | Add column; nullable |
| MF-12 | `driver_profiles` | `languages_spoken` | jsonb | Phalaborwa is multilingual (English, Sepedi, Afrikaans, Tsonga). Driver-rider language matching. | **MEDIUM** | Add column; array of language codes |
| MF-13 | `payments` | `gateway_transaction_id` | string(255) | Reconciliation with PayFast/Ozow. Currently only `transaction_id` exists. Need gateway-specific ID for disputes. | **HIGH** | Add column; populated from webhook |
| MF-14 | `payments` | `gateway_response` | jsonb | Full gateway response for debugging. Essential for payment dispute resolution. | **HIGH** | Add column; store raw gateway response |
| MF-15 | `wallets` | `currency` | string(3) | Phase 1 §11 requires currency support. No explicit currency field. Assuming ZAR but need for future expansion. | **LOW** | Add column; default 'ZAR' |
| MF-16 | `wallet_transactions` | `balance_after` | decimal(16,2) | Audit trail: what was balance after this transaction? Critical for reconciliation. | **HIGH** | Add column; calculated on write |
| MF-17 | `promo_codes` | `per_user_limit` | integer | Currently `max_uses` is global. Need per-user limit to prevent abuse. | **MEDIUM** | Add column; default null (unlimited) |
| MF-18 | `promo_codes` | `min_fare` | decimal(16,2) | Phase 1 FR-ADM-10 mentions "min fare" for promo codes. Not in data model. | **MEDIUM** | Add column; nullable |
| MF-19 | `promo_codes` | `ride_types` | jsonb | Restrict promo to specific ride types (economy only, etc.). | **LOW** | Add column; nullable (all types) |
| MF-20 | `restaurants` | `minimum_order_amount` | decimal(16,2) | Food ordering needs minimum order threshold. | **MEDIUM** | Add column; nullable |
| MF-21 | `restaurants` | `estimated_prep_time` | integer | Customer sees "Ready in 20 min". Need per-restaurant estimate. | **MEDIUM** | Add column; minutes, nullable |
| MF-22 | `food_orders` | `delivery_address` | text | Phase 3 WF-F01 shows delivery address. Not explicitly in food_orders table. | **HIGH** | Add column; full address text |
| MF-23 | `food_orders` | `delivery_latitude` | decimal(10,7) | GPS for driver navigation to customer. | **HIGH** | Add column; required |
| MF-24 | `food_orders` | `delivery_longitude` | decimal(10,7) | GPS for driver navigation. | **HIGH** | Add column; required |
| MF-25 | `food_orders` | `special_instructions` | text | Customer notes: "No onions", "Ring doorbell". | **MEDIUM** | Add column; nullable |
| MF-26 | `food_orders` | `driver_id` | UUID | Link to assigned delivery driver. Not in current schema. | **HIGH** | Add column; FK → users.id, nullable |
| MF-27 | `deliveries` | `actual_distance_km` | decimal(8,3) | Track actual vs estimated delivery distance. | **MEDIUM** | Add column; populated on completion |
| MF-28 | `deliveries` | `delivery_photo_path` | string(255) | Proof of delivery photo. Essential for dispute resolution. | **MEDIUM** | Add column; nullable |
| MF-29 | `deliveries` | `delivery_note` | string(500) | Driver notes: "Left at gate", "Handed to customer". | **MEDIUM** | Add column; nullable |
| MF-30 | `sos_alerts` | `rider_current_location` | jsonb | Store rider's GPS at time of SOS (may differ from ride pickup). | **HIGH** | Add column; {lat, lng, accuracy} |
| MF-31 | `sos_alerts` | `admin_response_time_seconds` | integer | Track SLA: 30s target. Measure actual response time. | **MEDIUM** | Add column; calculated on acknowledge |
| MF-32 | `consent_records` | `consent_text` | text | Full text of consent version shown to user. POPIA requirement. | **HIGH** | Add column; snapshot of consent text at time of grant |

### 1.2 Missing Validations

| ID | Table | Field | Missing Validation | Severity | Remediation |
|----|-------|-------|--------------------|----------|-------------|
| MV-01 | `users` | `phone_number` | SA format validation regex: `^\+27[1-9]\d{8}$` | **HIGH** | Add validation rule |
| MV-02 | `users` | `email` | Standard email validation + disposable email blocklist | **MEDIUM** | Add validation rule |
| MV-03 | `rides` | `pickup_latitude` | Range: -90 to 90, precision: 7 decimal places | **HIGH** | Add CHECK constraint |
| MV-04 | `rides` | `pickup_longitude` | Range: -180 to 180, precision: 7 decimal places | **HIGH** | Add CHECK constraint |
| MV-05 | `rides` | `surge_multiplier` | Range: 1.00 to 5.00 (Phase 2 says 1.00-5.00 but Phase 1 says 1.0x-2.5x — CONTRADICTION) | **HIGH** | Resolve contradiction (see C-01) |
| MV-06 | `payments` | `amount` | Must be > 0 for successful payments | **HIGH** | Add CHECK constraint |
| MV-07 | `wallets` | `balance` | Must be >= 0 (no overdraft) | **HIGH** | Add CHECK constraint |
| MV-08 | `promo_codes` | `valid_from` | Must be < valid_until | **MEDIUM** | Add CHECK constraint |
| MV-09 | `promo_codes` | `discount_value` | If type=fixed: must be > 0. If type=percentage: must be 1-100 | **MEDIUM** | Add application-level validation |
| MV-10 | `kyc_verifications` | `expires_at` | Must be > created_at | **LOW** | Add CHECK constraint |
| MV-11 | `driver_profiles` | `license_expiry` | Must be in future for active drivers | **MEDIUM** | Add application-level check |
| MV-12 | `vehicles` | `license_plate` | SA format: NNNN-NNN-NL (e.g., "BA 123-456-L") | **MEDIUM** | Add regex validation |
| MV-13 | `rides` | `total_fare` | Must be >= base_fare (after discounts) | **MEDIUM** | Add CHECK constraint |
| MV-14 | `food_orders` | `subtotal` | Must be > 0 | **HIGH** | Add CHECK constraint |
| MV-15 | `food_orders` | `delivery_fee` | Must be >= 0 | **MEDIUM** | Add CHECK constraint |

---

## 2. Missing Workflows & Edge Cases

### 2.1 Missing Workflows

| ID | Workflow | Why Needed | Severity | Source |
|----|----------|------------|----------|--------|
| MW-01 | **Promo Code Application** | Phase 1 FR-ADM-10 defines promo codes but Phase 3 has no workflow for rider applying a promo code during booking. | **HIGH** | Phase 1 §3.6 |
| MW-02 | **Wallet Top-Up** | Phase 1 FR-PAY-04 defines wallet top-up but Phase 3 has no workflow for adding money to wallet. | **HIGH** | Phase 1 §3.4 |
| MW-03 | **Dispute Filing (Rider)** | Phase 1 US-R08 mentions ride history but no workflow for rider filing a dispute about a fare or ride. | **HIGH** | Phase 1 §2.1 |
| MW-04 | **Dispute Filing (Driver)** | Phase 1 US-D04 mentions earnings but no workflow for driver disputing a charge or rating. | **HIGH** | Phase 1 §2.2 |
| MW-05 | **Refund Processing** | Phase 1 FR-PAY-09 defines refunds but Phase 3 has no workflow for admin processing a refund. | **HIGH** | Phase 1 §3.4 |
| MW-06 | **Scheduled Ride Cancellation** | Phase 3 WF-R06 defines scheduling but no workflow for cancelling a scheduled ride. | **MEDIUM** | Phase 3 §1.6 |
| MW-07 | **Document Expiry Auto-Deactivation** | Phase 3 WF-D06 mentions auto-deactivation but no detailed workflow for the cron job. | **MEDIUM** | Phase 3 §2.6 |
| MW-08 | **Night Mode Enforcement** | Phase 1 FR-SFT-08 defines night mode (10PM-5AM: verified drivers only) but no workflow. | **MEDIUM** | Phase 1 §3.7 |
| MW-09 | **Pool Ride Matching** | Phase 2 defines pool_rides and pool_passengers tables but Phase 3 has no pool ride workflow. | **HIGH** | Phase 2 §3 |
| MW-10 | **Pool Ride Passenger Join/Leave** | No workflow for passenger joining or leaving a pool ride. | **MEDIUM** | Phase 2 §3 |
| MW-11 | **Cash Reconciliation** | Phase 2 defines cash_reconciliations table but Phase 3 has no workflow for reconciling cash payments. | **MEDIUM** | Phase 2 §3 |
| MW-12 | **Admin Notification** | Phase 2 defines admin_notifications table but no workflow for creating/managing admin notifications. | **LOW** | Phase 2 §3 |
| MW-13 | **In-App Chat** | Phase 1 FR-SFT-05 defines rider-driver chat but Phase 3 has no chat workflow. | **MEDIUM** | Phase 1 §3.7 |
| MW-14 | **Trusted Contact Management** | Phase 1 US-R12 defines trusted contacts but no workflow for adding/removing them. | **LOW** | Phase 1 §2.1 |
| MW-15 | **Emergency Contact SMS** | Phase 3 WF-R04 mentions SMS to emergency contacts but no detailed workflow for the SMS delivery. | **MEDIUM** | Phase 3 §1.4 |
| MW-16 | **PHBIMH Order Delegation** | No workflow for PHBIMH delegating a ride/delivery order to EasyRyde's API. | **CRITICAL** | PHBIMH Integration |
| MW-17 | **PHBIMH Driver Sharing** | No workflow for PHBIMH and EasyRyde sharing the same driver fleet. | **CRITICAL** | PHBIMH Integration |
| MW-18 | **PHBIMH Payment Reconciliation** | No workflow for reconciling payments between PHBIMH and EasyRyde. | **HIGH** | PHBIMH Integration |

### 2.2 Missing Edge Cases

| ID | Edge Case | Why Critical | Severity |
|----|-----------|--------------|----------|
| ME-01 | **Rider and driver at same location** | Haversine distance = 0. Navigation may break. Need special handling. | **MEDIUM** |
| ME-02 | **Driver goes offline mid-ride** | Driver toggles offline while IN_PROGRESS ride. Must not affect active ride. | **HIGH** |
| ME-03 | **Rider requests ride while in another ride** | Must reject: "You have an active ride." | **HIGH** |
| ME-04 | **Driver accepts ride while navigating to another pickup** | Must check: is driver already en route to another pickup? | **MEDIUM** |
| ME-05 | **Multiple riders at same pickup** | Two riders request ride from same coordinates. Must not confuse. | **MEDIUM** |
| ME-06 | **Promo code + wallet + card** | Multiple payment methods on one ride. Need stacking rules. | **MEDIUM** |
| ME-07 | **Promo code expired between selection and application** | Rider selects promo, takes 5 min to book, promo expires. Must handle gracefully. | **MEDIUM** |
| ME-08 | **Ride estimate differs >20% from actual** | Phase 1 FR-RIDE-10 mentions ±20% tolerance. What happens beyond that? | **HIGH** |
| ME-09 | **Driver rating drops below threshold** | What happens if driver rating falls below 3.0? Auto-suspend? Warning? | **MEDIUM** |
| ME-10 | **Cancellation rate exceeds 1%** | Phase 1 FR-RIDE-12 says >1% → reduced priority for 24h. Must implement. | **HIGH** |
| ME-11 | **SOS triggered after ride ends** | Rider triggers SOS after ride completion. Must handle (late SOS). | **MEDIUM** |
| ME-12 | **Ride completed but payment never confirmed** | Payment stuck in PROCESSING. Need timeout and escalation. | **HIGH** |
| ME-13 | **Driver completes ride but rider already cancelled** | Race condition: driver taps "complete" while rider taps "cancel". Who wins? | **HIGH** |
| ME-14 | **Food order placed but restaurant closes** | Restaurant closes during preparation. Must cancel and refund. | **MEDIUM** |
| ME-15 | **Delivery driver picks up wrong order** | Driver picks up order #123 instead of #124. Must handle swap or re-delivery. | **MEDIUM** |
| ME-16 | **Concurrent wallet deductions** | Two rides complete simultaneously, both try to deduct from wallet. Race condition. | **HIGH** |
| ME-17 | **Scheduled ride but driver goes offline before dispatch** | Driver accepted scheduled ride, goes offline before T-5min. Must re-dispatch. | **MEDIUM** |
| ME-18 | **GPS spoofing** | Driver fakes GPS to appear at pickup. Must validate GPS against expected location. | **HIGH** |
| ME-19 | **Ride sharing link shared publicly** | Trusted contact shares tracking link further. Link should be single-use or time-limited. | **MEDIUM** |
| ME-20 | **Account deletion while ride in progress** | Rider requests deletion during active ride. Must reject until ride completes. | **HIGH** |

---

## 3. Contradictions & Ambiguities

### 3.1 Critical Contradictions

| ID | Contradiction | Phase 1 Says | Phase 2 Says | Resolution Required | Severity |
|----|---------------|--------------|--------------|---------------------|----------|
| C-01 | **Surge multiplier range** | FR-RIDE-03: "1.0x-2.5x" | Phase 2 rides table: "1.00-5.00" | Must align. Recommendation: 1.00-5.00 (Phase 2) for flexibility; Phase 1 FR-RIDE-03 updated to "1.0x-5.0x" | **HIGH** |
| C-02 | **Ride search radius** | FR-RIDE-05: "3km, expand 1km/15s up to 8km" | Phase 2 rides table: `search_radius_km` decimal(2) | Phase 2 decimal(2) can only store up to 99.99km — sufficient. No contradiction but clarify: is max 8km or flexible? | **MEDIUM** |
| C-03 | **Cancellation fee** | FR-RIDE-11: "After ARRIVED: R15 fee" | Phase 2 rides table: `cancellation_fee` decimal(16,2) | R15 is hardcoded. Should be configurable in system_settings. | **MEDIUM** |
| C-04 | **Payment method enum** | Phase 1 mentions: cash, card, wallet, PayFast, Ozow | Phase 2 rides table: `payment_method` string(20) "card/cash/wallet" | PayFast and Ozow are gateways, not payment methods. Rider-facing methods: card, cash, wallet. Correct. But need to track which gateway for card payments. | **MEDIUM** |
| C-05 | **Ride types** | Phase 1 FR-RIDE-02: "Economy, Standard, Premium, XL" | Phase 2 rides table: `category` "standard/premium/minivan/pets/delivery" | Phase 1 has "Economy" and "XL" but Phase 2 doesn't. Phase 2 has "pets" and "delivery" not in Phase 1. Must align. | **HIGH** |
| C-06 | **Driver auto-offline triggers** | FR-DRV-01: "3 consecutive rejects or 30 min idle" | Phase 3 WF-D02: "3 consecutive rejects, 30 min idle, 14h continuous" | Phase 3 adds 14h continuous. Phase 1 doesn't mention it. Align Phase 1. | **MEDIUM** |
| C-07 | **OTP expiry** | FR-AUTH-01: "OTP expires 5 min" | Phase 3 WF-R01: "OTP validity 5 minutes" | Consistent. No contradiction. | — |
| C-08 | **Token expiry** | FR-AUTH-14: "7-day expiry (mobile)" | Phase 2 not specified | Phase 2 doesn't define token storage. Need personal_access_tokens table (Sanctum default). | **LOW** |

### 3.2 Ambiguities

| ID | Ambiguity | What's Unclear | Resolution Required | Severity |
|----|-----------|----------------|---------------------|----------|
| A-01 | **"Card" payment method** | Which cards? Visa/Mastercard only? Debit vs credit? SA-specific (SnapScan, Zapper)? | Specify: Visa, Mastercard, SnapScan via PayFast/Ozow gateway | **MEDIUM** |
| A-02 | **Wallet top-up methods** | How does rider add money to wallet? Card? EFT? Cash at driver? | Specify: Card via PayFast, EFT via Ozow. No cash top-up. | **MEDIUM** |
| A-03 | **Driver payout schedule** | Phase 1 says "every Monday". What if Monday is a public holiday? | Specify: Next business day after Monday | **LOW** |
| A-04 | **Rating impact** | Phase 1 says "affects driver rating" but doesn't specify algorithm. Weighted average? Recent-weighted? | Specify: Rolling 90-day weighted average (recent rides weighted higher) | **MEDIUM** |
| A-05 | **Night mode verification** | Phase 1 FR-SFT-08: "verified badge drivers (extra background check)". What extra check? | Specify: Enhanced background check + police clearance | **MEDIUM** |
| A-06 | **Scheduled ride dispatch timing** | Phase 1 FR-RIDE-17: "Dispatch 15 min before. Driver assigned 5 min before." What if no driver at 5 min? | Specify: Expand radius, notify rider, allow cancel if no driver at T-0 | **MEDIUM** |
| A-07 | **Pool ride pricing** | Phase 2 defines pool tables but no pricing logic. How is pool fare calculated? | Specify: Base fare × 0.75 per passenger, minimum R20 per passenger | **HIGH** |
| A-08 | **PHBIMH ride delegation** | How exactly does PHBIMH delegate to EasyRyde? API call? Shared database? Event-driven? | Specify: REST API with webhook callbacks | **CRITICAL** |
| A-09 | **PHBIMH driver sharing** | Do drivers register on both platforms? Or is there a unified driver account? | Specify: Unified driver account via shared auth or token exchange | **CRITICAL** |
| A-10 | **Food order delivery radius** | How far from restaurant will delivery driver travel? | Specify: Configurable per restaurant, default 10km | **MEDIUM** |
| A-11 | **Incident report resolution** | Phase 1 mentions "incident reports" but no resolution workflow. Who resolves? What's the SLA? | Specify: Admin resolves within 24h, escalation to super-admin at 48h | **MEDIUM** |
| A-12 | **Data retention for PHBIMH** | Does PHBIMH follow same retention schedule as EasyRyde? Or different? | Specify: Same retention schedule; PHBIMH data synced to EasyRyde retention system | **MEDIUM** |

---

## 4. PHBIMH Integration Gaps

### 4.1 Critical Integration Gaps

| ID | Gap | Impact | Severity | Remediation |
|----|-----|--------|----------|-------------|
| IG-01 | **UUID vs Auto-Increment Primary Keys** | EasyRyde uses UUID PKs. PHBIMH uses auto-increment INT PKs. Cannot share user/driver records directly. | **CRITICAL** | Option A: Migrate PHBIMH to UUIDs. Option B: Create mapping table. Recommendation: Option A (clean break) |
| IG-02 | **No Shared Authentication** | EasyRyde uses Sanctum tokens. PHBIMH uses Sanctum tokens but different user tables. A user registered on PHBIMH cannot login to EasyRyde. | **CRITICAL** | Implement: Token exchange API or shared auth service. Or: PHBIMH delegates auth to EasyRyde. |
| IG-03 | **No Driver Fleet Sharing** | PHBIMH has basic ride matching (cash-only). EasyRyde has full driver management. Drivers would need to register on both. | **CRITICAL** | Implement: Driver profile sync API. Or: EasyRyde becomes the driver management system for both. |
| IG-04 | **No Payment Integration** | PHBIMH is cash-only MVP. EasyRyde has PayFast/Ozow. How do PHBIMH users pay for EasyRyde rides? | **CRITICAL** | Implement: EasyRyde payment API exposed to PHBIMH. PHBIMH redirects to EasyRyde payment flow. |
| IG-05 | **No Order Delegation API** | PHBIMH has its own order system. EasyRyde has its own. No API exists for PHBIMH to create orders in EasyRyde. | **CRITICAL** | Implement: REST API endpoint `POST /api/v1/integration/phbimh/orders` with webhook callbacks. |

### 4.2 High Integration Gaps

| ID | Gap | Impact | Severity | Remediation |
|----|-----|--------|----------|-------------|
| IG-06 | **Different Database Schemas** | PHBIMH: `orders` table with `type` enum (delivery/pickup/ride/food). EasyRyde: separate `rides`, `food_orders`, `deliveries` tables. Data model mismatch. | **HIGH** | Implement: Schema mapping layer in integration API |
| IG-07 | **Different Ride Models** | PHBIMH Ride: `fare`, `distance_km`, `duration_min`. EasyRyde Ride: 45+ columns including surge, promo, payment status. | **HIGH** | Implement: PHBIMH sends minimal data; EasyRyde enriches with full lifecycle |
| IG-08 | **No Real-Time Sync** | PHBIMH has Socket.IO gateway. EasyRyde has Socket.IO server. No bridge between them. | **HIGH** | Implement: Redis pub/sub bridge or shared Socket.IO namespace |
| IG-09 | **Different Admin Panels** | PHBIMH uses Filament. EasyRyde uses React + TailwindCSS. Two separate admin dashboards. | **HIGH** | Decision needed: Merge into one? Or keep separate with shared data? |
| IG-10 | **No Webhook Standard** | No defined webhook format for PHBIMH → EasyRyde communication. | **HIGH** | Implement: Standardized webhook format with HMAC signing |

### 4.3 PHBIMH Features EasyRyde Lacks

| ID | Feature | PHBIMH Has | EasyRyde Needs | Severity |
|----|---------|------------|----------------|----------|
| PF-01 | Business Directory | 10 business types, categories, search | Not in scope (EasyRyde is ride-hailing) | **LOW** |
| PF-02 | Business Dashboard | Filament admin for businesses | Not in scope | **LOW** |
| PF-03 | Community Posts | Social feed with likes | Not in scope | **LOW** |
| PF-04 | Emergency Alerts | Town-wide alerts | Not in scope (EasyRyde has SOS) | **LOW** |
| PF-05 | Subscriptions | Business subscription tiers | Not in scope | **LOW** |
| PF-06 | Product Catalog | Products with images, stock, prep time | **YES** — EasyRyde food delivery needs this | **HIGH** |
| PF-07 | Business Reviews | Polymorphic reviews | **YES** — EasyRyde needs restaurant reviews | **MEDIUM** |
| PF-08 | Address Book | Saved addresses for users | **YES** — EasyRyde needs saved pickup/dropoff | **MEDIUM** |

---

## 5. Security & Compliance Gaps

### 5.1 Critical Security Gaps

| ID | Gap | Impact | Severity | Remediation |
|----|-----|--------|----------|-------------|
| SG-01 | **Firebase Service Account Key in Git** | CRITICAL: Service account key tracked in version control. Can be extracted from git history. | **CRITICAL** | Rotate key immediately, add to .gitignore, purge from git history with `git filter-branch` or BFG |
| SG-02 | **No Rate Limiting on API Endpoints** | Phase 1 FR-AUTH-15 defines rate limits but no implementation evidence. | **HIGH** | Implement: Laravel throttle middleware (10 req/min auth, 60/min general) |
| SG-03 | **No RBAC Implementation** | Phase 1 FR-AUTH-12 defines roles but Spatie permissions not configured. | **HIGH** | Implement: Spatie roles (super-admin, ops-admin, finance-admin, support-admin) with granular permissions |
| SG-04 | **No CSRF Protection** | Admin web dashboard vulnerable to CSRF attacks. | **HIGH** | Implement: Laravel CSRF middleware on all admin routes |
| SG-05 | **No Input Validation** | No evidence of Form Request validation classes for most endpoints. | **HIGH** | Implement: FormRequest classes for all write endpoints |
| SG-06 | **Debug Information Exposed** | APP_DEBUG=true in production exposes stack traces. | **HIGH** | Set APP_DEBUG=false in production, implement error logging |
| SG-07 | **Missing HSTS Headers** | No HTTP Strict Transport Security headers. | **MEDIUM** | Implement: HSTS header in Nginx config (max-age=31536000) |

### 5.2 Compliance Gaps

| ID | Gap | Impact | Severity | Remediation |
|----|-----|--------|----------|-------------|
| CG-01 | **No POPIA Consent Capture** | Phase 1 §5 defines POPIA requirements but consent_records table not populated during registration. | **HIGH** | Implement: Consent capture flow during registration (see MF-32) |
| CG-02 | **No Data Subject Request Workflow** | Phase 1 US-A11 mentions "data subject requests within 72 hours" but no workflow exists. | **HIGH** | Implement: Admin panel for data export/deletion requests with 72h SLA tracking |
| CG-03 | **No Breach Notification** | POPIA requires breach notification within 72h. No workflow exists. | **HIGH** | Implement: Breach notification playbook and automated alerting |
| CG-04 | **No PCI-DSS SAQ-A Compliance** | Phase 1 mentions PCI-DSS but no evidence of tokenization implementation. | **HIGH** | Verify: PayFast/Ozow handle card data; EasyRyde never stores card numbers |
| CG-05 | **No FICA Verification Workflow** | Phase 1 mentions FICA but no detailed verification workflow for drivers. | **MEDIUM** | Implement: FICA document collection and verification in KYC flow |
| CG-06 | **No SARS Tax Reporting** | Phase 1 mentions SA Tax but no tax reporting workflow for driver earnings. | **MEDIUM** | Implement: Monthly tax statement generation for drivers |
| CG-07 | **No POPIA Data Retention Enforcement** | Phase 2 defines retention periods but no automated enforcement. | **HIGH** | Implement: Scheduled artisan jobs for data purging (see Phase 3 WF-S04) |

---

## 6. Data Model Gaps

### 6.1 Missing Tables

| ID | Table | Purpose | Required By | Severity |
|----|-------|---------|-------------|----------|
| DT-01 | `scheduled_rides` | Store scheduled ride bookings (mentioned in Phase 1 FR-RIDE-17, Phase 3 WF-R06) | Phase 1, Phase 3 | **HIGH** |
| DT-02 | `bank_accounts` | Driver bank details for payouts (mentioned in Phase 3 WF-D05) | Phase 3 | **HIGH** |
| DT-03 | `user_documents` | Generic document storage for KYC (mentioned in Phase 1) | Phase 1 | **MEDIUM** |
| DT-04 | `notification_templates` | Reusable notification templates (mentioned in Planner) | Planner | **LOW** |
| DT-05 | `promo_code_redemptions` | Track who used which promo codes (exists in code but not in Phase 2) | Phase 2 | **HIGH** |
| DT-06 | `referral_redemptions` | Track referral completions (exists in code but not in Phase 2) | Phase 2 | **MEDIUM** |
| DT-07 | `ride_feedback` | Separate from ratings: detailed feedback categories (safety, cleanliness, navigation) | Phase 1 | **LOW** |

### 6.2 Missing Indexes

| ID | Table | Missing Index | Query Pattern | Severity |
|----|-------|---------------|---------------|----------|
| DI-01 | `rides` | `(status, created_at)` | Admin dashboard: recent rides by status | **HIGH** |
| DI-02 | `rides` | `(driver_id, status)` | Driver app: my active rides | **HIGH** |
| DI-03 | `rides` | `(rider_id, created_at)` | Rider app: my ride history | **MEDIUM** |
| DI-04 | `payments` | `(status, created_at)` | Admin: pending payments | **MEDIUM** |
| DI-05 | `wallet_transactions` | `(wallet_id, created_at)` | Wallet history | **MEDIUM** |
| DI-06 | `food_orders` | `(status, created_at)` | Restaurant dashboard: pending orders | **HIGH** |
| DI-07 | `food_orders` | `(driver_id, status)` | Delivery driver: my active deliveries | **MEDIUM** |
| DI-08 | `sos_alerts` | `(status, created_at)` | Admin: active SOS alerts | **HIGH** |
| DI-09 | `audit_logs` | `(auditable_type, auditable_id)` | Audit trail lookups | **MEDIUM** |
| DI-10 | `promo_codes` | `(code, is_active)` | Promo code validation | **HIGH** |

---

## 7. Blocking Issues Summary

**Per superpowers rules: If any critical/high item exists → BLOCK CODE GENERATION.**

### 7.1 Critical Blockers (MUST resolve before code)

| ID | Issue | Category | Impact |
|----|-------|----------|--------|
| IG-01 | UUID vs Auto-Increment PK incompatibility | Integration | Cannot share data between systems |
| IG-02 | No shared authentication | Integration | Users cannot move between platforms |
| IG-03 | No driver fleet sharing | Integration | Duplicate driver management |
| IG-04 | No payment integration | Integration | PHBIMH users cannot pay digitally |
| IG-05 | No order delegation API | Integration | PHBIMH cannot create EasyRyde orders |
| A-08 | PHBIMH delegation mechanism undefined | Ambiguity | Cannot design integration |
| A-09 | PHBIMH driver sharing model undefined | Ambiguity | Cannot design integration |
| SG-01 | Firebase service account key in git | Security | Platform compromised |
| C-05 | Ride type enum misalignment | Contradiction | Inconsistent user experience |

### 7.2 High Blockers (MUST resolve before code)

| ID | Issue | Category | Impact |
|----|-------|----------|--------|
| MF-01 to MF-32 | 32 missing fields across 15 tables | Data Model | Incomplete schema |
| MV-01 to MV-15 | 15 missing validations | Data Model | Invalid data possible |
| MW-01 to MW-18 | 18 missing workflows | Workflow | Unhandled scenarios |
| ME-01 to ME-20 | 20 missing edge cases | Edge Cases | Production failures |
| C-01, C-05 | Surge range, ride type contradictions | Contradiction | Conflicting specs |
| IG-06 to IG-10 | 5 integration architecture gaps | Integration | System cannot connect |
| SG-02 to SG-07 | 6 security gaps | Security | Vulnerable to attack |
| CG-01 to CG-07 | 7 compliance gaps | Compliance | Legal exposure |
| DT-01 to DT-07 | 7 missing tables | Data Model | Incomplete schema |
| DI-01 to DI-10 | 10 missing indexes | Performance | Slow queries |

---

## 8. Non-Blocking Issues

| ID | Issue | Category | Severity | Notes |
|----|-------|----------|----------|-------|
| MF-15 | Wallet currency field | Data Model | LOW | Default ZAR is sufficient for MVP |
| MF-11 | Driver experience years | Data Model | LOW | Nice-to-have for future |
| MF-19 | Promo ride type restriction | Data Model | LOW | Can add later |
| A-03 | Public holiday payout | Ambiguity | LOW | Next business day is clear |
| PF-01 to PF-05 | PHBIMH business features | Integration | LOW | Not in EasyRyde scope |
| DT-04 | Notification templates | Data Model | LOW | Can use hardcoded templates |
| DI-04 to DI-09 | Performance indexes | Performance | MEDIUM | Add before production, not blocking initial dev |

---

## 9. Sign-Off

| Role | Name | Approved | Date | Notes |
|------|------|----------|------|-------|
| Lead Architect | _____________ | ☐ | ________ | |
| Security Engineer | _____________ | ☐ | ________ | |
| QA Lead | _____________ | ☐ | ________ | |
| Integration Lead | _____________ | ☐ | ________ | |

**Approval Criteria:**
- [ ] All 9 critical blockers resolved or have approved remediation plans
- [ ] All 32 missing fields documented with column definitions
- [ ] All 15 missing validations documented with rules
- [ ] All 18 missing workflows have acceptance criteria
- [ ] All 20 edge cases have handling logic defined
- [ ] All contradictions resolved with explicit decisions
- [ ] PHBIMH integration architecture agreed upon
- [ ] Security remediation plan approved
- [ ] Compliance remediation plan approved

**CRITICAL: Code generation is BLOCKED until all critical and high issues are resolved.**

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T19:00:00Z | Initial creation — 9 critical blockers, 70+ high issues, 7 non-blocking issues |
