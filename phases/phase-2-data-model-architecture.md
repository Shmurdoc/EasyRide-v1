# Phase 2: Data Model Architecture

**Version:** 1.0.0
**Created:** 2026-07-08T17:30:00Z
**Status:** Draft
**Superpowers Phase:** 2 of 8 — Data Model & Schema Architecture (Mandatory)
**Prepared by:** opencode
**Depends on:** Phase 1 — Requirements Expansion (v1.0.0, Draft)
**Sources:** Planner/03-system-design/data-model.md, backend/app/Models/*.php, backend/app/Enums/*.php, backend/database/migrations/*.php, Planner/02-requirements/compliance-spec.md, security-model.md, non-functional-spec.md

---

## Summary

This document defines the complete data model for EasyRyde: 35 tables across 7 domains, with per-field PII classification, encryption rules, validation rules, retention policies, state machines, spatial indexing strategy, and migration plan. This is the single source of truth for all database schema decisions.

---

## 1. Schema Conventions

| Convention | Rule | Rationale |
|-----------|------|-----------|
| Primary keys | UUID (`HasUuids` trait, `string` key type, `$incrementing = false`) | No ID enumeration attacks; distributed-safe |
| Table names | Plural, snake_case | Laravel Eloquent convention |
| Column names | snake_case | PostgreSQL convention |
| Timestamps | `created_at`, `updated_at` on every table | Laravel convention |
| Soft deletes | `deleted_at` where noted | POPIA: recoverable deletion |
| Monetary columns | `decimal(16, 2)` — stored in ZAR | Precision without floating point |
| Coordinate columns | `decimal(10, 7)` | ~1cm precision |
| Foreign keys | UUID matching parent table key type | Referential integrity |
| Tenant scoping | `tenant_id` on all major tables | Multi-tenant isolation (single-admin for now) |
| Enums | PHP 8.1 backed enums in `app/Enums/` | Type safety, migration-free |

---

## 2. Complete Table Inventory

### 2.1 Actual State vs Planner State

**Models exist (38 files in `backend/app/Models/`):**
User, Tenant, Ride, DriverProfile, Vehicle, Payment, Wallet, WalletTransaction, Rating, PromoCode, Delivery, InAppNotification, PushToken, ConsentRecord, KycVerification, IncidentReport, SosAlert, ReferralCode, ReferralRedemption, Dispute, AdminAuditLog, SystemSetting, WebhookEvent, DriverPayout, CashReconciliation, RefundRequest, RideChatMessage, RideStatusHistory, PoolRide, PoolPassenger, PeakHour, SurgeZone, NotificationPreference, AdminNotification, Restaurant, RestaurantCategory, MenuItem, FoodOrder, FoodOrderItem

**Tables not in Planner/03-system-design/data-model.md but exist in code:**
- `driver_profiles` (DriverProfile)
- `refund_requests` (RefundRequest)
- `ride_status_histories` (RideStatusHistory)
- `pool_rides` (PoolRide)
- `pool_passengers` (PoolPassenger)
- `peak_hours` (PeakHour)
- `surge_zones` (SurgeZone)
- `notification_preferences` (NotificationPreference)
- `admin_notifications` (AdminNotification)
- `personal_access_tokens` (Sanctum)
- `permissions` / `roles` (Spatie)
- `model_has_permissions` / `model_has_roles` / `role_has_permissions` (Spatie)

**Planned tables NOT yet in code:**
- `consent_records` (ConsentRecord model exists — verify migration)
- `scheduled_rides` (mentioned in Planner, no model)
- `notification_templates` (mentioned in Planner, no model)
- `user_documents` (mentioned in Planner, no model)
- `bank_accounts` (for driver payouts — no model)

---

## 3. Per-Table Specification

### Domain A: User Management

#### A1. `users`

| Column | Type | Constraints | PII? | Encryption | Validation | Retention | Notes |
|--------|------|-------------|------|------------|------------|-----------|-------|
| id | UUID | PK | No | — | — | Indefinite | |
| tenant_id | UUID | FK → tenants.id, nullable | No | — | Valid UUID | Indefinite | |
| name | string(255) | NOT NULL | **YES** | No (display name) | 2-255 chars, alpha + spaces | Indefinite | |
| email | string(255) | UNIQUE, NOT NULL | **YES** | **AES-256 (encrypted cast)** | Valid email format | Indefinite | Cannot be used in WHERE; use email_hash for lookups |
| email_hash | string(64) | UNIQUE, NOT NULL | No | SHA-256 of email | — | Indefinite | Lookup column for encrypted email |
| phone_number | string(20) | UNIQUE, nullable | **YES** | **AES-256 (encrypted cast)** | SA format: +27XXXXXXXXX | Indefinite | Cannot be used in WHERE; use phone_hash for lookups |
| phone_hash | string(64) | UNIQUE, nullable | No | SHA-256 of phone | — | Indefinite | Lookup column for encrypted phone |
| password | string(255) | NOT NULL | No | bcrypt hash | Min 8 chars | Indefinite | Hidden from serialization |
| role | string(20) | NOT NULL, default:'rider' | No | — | In: rider/driver/admin/super-admin | Indefinite | |
| is_active | boolean | default:true | No | — | — | Indefinite | |
| is_online | boolean | default:false | No | — | — | Indefinite | Driver only |
| is_approved | boolean | default:false | No | — | — | Indefinite | Driver admin approval |
| is_kyc_verified | boolean | default:false | No | — | — | Indefinite | |
| totp_enabled | boolean | default:false | No | — | — | Indefinite | 2FA status |
| totp_secret | string(255) | nullable | No | Encrypted (Hidden) | — | Indefinite | TOTP 2FA secret |
| email_verified_at | timestamp | nullable | No | — | — | Indefinite | |
| kyc_verified_at | timestamp | nullable | No | — | — | Indefinite | |
| current_latitude | decimal(10,7) | nullable | No | — | -90 to 90 | 90 days (location data) | Driver last known |
| current_longitude | decimal(10,7) | nullable | No | — | -180 to 180 | 90 days (location data) | |
| last_location_update | timestamp | nullable | No | — | — | 90 days | |
| current_ride_id | string(36) | nullable, FK → rides.id | No | — | Valid UUID | Indefinite | |
| failed_login_attempts | integer | default:0 | No | — | >= 0 | Reset on success | Brute force tracking |
| locked_until | timestamp | nullable | No | — | — | Indefinite | Account lockout |
| last_login_at | timestamp | nullable | No | — | — | Indefinite | Security audit |
| last_activity_at | timestamp | nullable | No | — | — | Indefinite | Presence tracking |
| anonymized_at | timestamp | nullable | No | — | — | Indefinite | POPIA erasure marker |
| deleted_at | timestamp | nullable | No | — | — | 30 days then purge | Soft delete |
| remember_token | string(100) | nullable | No | — | — | Indefinite | |
| created_at | timestamp | | No | — | — | Indefinite | |
| updated_at | timestamp | | No | — | — | Indefinite | |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Unique | email | B-tree | P0 |
| Unique | phone_number | B-tree | P0 |
| Unique | email_hash | B-tree | P0 |
| Unique | phone_hash | B-tree | P0 |
| Composite | (tenant_id, role, is_active) | B-tree | P0 |
| Composite | (role, is_online, is_approved) | B-tree | P0 |
| Single | last_login_at | B-tree | P2 |

---

#### A2. `tenants`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| name | string(255) | NOT NULL | No | 2-255 chars | Indefinite |
| slug | string(100) | UNIQUE, NOT NULL | No | lowercase alphanumeric + hyphens | Indefinite |
| domain | string(255) | nullable | No | Valid domain | Indefinite |
| region | string(100) | nullable | No | — | Indefinite |
| currency | string(3) | default:'ZAR' | No | ISO 4217 | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| settings | jsonb | nullable | No | Valid JSON | Indefinite |
| created_at | timestamp | | No | — | Indefinite |
| updated_at | timestamp | | No | — | Indefinite |

---

#### A3. `driver_profiles`

| Column | Type | Constraints | PII? | Encryption | Validation | Retention |
|--------|------|-------------|------|------------|------------|-----------|
| id | UUID | PK | No | — | — | Indefinite |
| user_id | UUID | FK → users.id, UNIQUE | No | — | Valid UUID | Indefinite |
| license_number | string(100) | nullable | **YES** | **AES-256 (encrypted)** | SA license format | 5 years after account closure |
| license_expiry | date | nullable | No | — | Future date | 5 years after account closure |
| id_number | string(100) | nullable | **YES** | **AES-256 (encrypted)** | SA ID: 13 digits | 5 years after account closure |
| date_of_birth | date | nullable | **YES** | **AES-256 (encrypted)** | Valid date, age >= 18 | 5 years after account closure |
| emergency_contact_name | string(255) | nullable | **YES** | **AES-256 (encrypted)** | 2-255 chars | Indefinite |
| emergency_contact_phone | string(20) | nullable | **YES** | **AES-256 (encrypted)** | SA format | Indefinite |
| is_verified | boolean | default:false | No | — | — | Indefinite |
| is_approved | boolean | default:false | No | — | — | Indefinite |
| approved_by | string(36) | nullable | No | — | Valid UUID | Indefinite |
| approved_at | timestamp | nullable | No | — | — | Indefinite |
| total_trips | integer | default:0 | No | — | >= 0 | Indefinite |
| total_earnings | decimal(16,2) | default:0 | No | — | >= 0 | Indefinite |
| rating_sum | integer | default:0 | No | — | >= 0 | Indefinite |
| rating_count | integer | default:0 | No | — | >= 0 | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Unique | user_id | B-tree | P0 |
| Composite | (is_verified, is_approved) | B-tree | P1 |

---

#### A4. `vehicles`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| user_id | UUID | FK → users.id, UNIQUE | No | Valid UUID | Indefinite |
| make | string(50) | NOT NULL | No | 2-50 chars | Indefinite |
| model | string(50) | NOT NULL | No | 2-50 chars | Indefinite |
| year | integer | NOT NULL | No | 1990-current year | Indefinite |
| color | string(30) | NOT NULL | No | 2-30 chars | Indefinite |
| license_plate | string(20) | NOT NULL | No | SA format: NNNN-NNN-NL | Indefinite |
| category | string(20) | default:'standard' | No | In: standard/premium/minivan | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| insurance_provider | string(100) | nullable | No | — | Indefinite |
| insurance_policy_number | string(50) | nullable | No | — | Indefinite |
| insurance_expiry | date | nullable | No | — | Indefinite |
| registration_document_path | string(255) | nullable | No | Valid file path | Indefinite |
| vehicle_photo_path | string(255) | nullable | No | Valid file path | Indefinite |
| last_inspection_at | timestamp | nullable | No | — | Indefinite |
| is_inspected | boolean | default:false | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Unique | user_id | B-tree | P0 |
| Composite | (category, is_active) | B-tree | P1 |

---

#### A5. `kyc_verifications`

| Column | Type | Constraints | PII? | Encryption | Validation | Retention |
|--------|------|-------------|------|------------|------------|-----------|
| id | UUID | PK | No | — | — | 5 years after verification |
| user_id | UUID | FK → users.id | No | — | Valid UUID | 5 years |
| verification_type | string(50) | NOT NULL | No | — | In: identity/address/face/background | 5 years |
| document_type | string(50) | NOT NULL | No | — | In: id_card/passport/license/utility_bill/bank_statement | 5 years |
| document_number | string(100) | nullable | **YES** | **AES-256** | — | 5 years |
| document_front_path | string(255) | nullable | No | — | Valid path | 5 years |
| document_back_path | string(255) | nullable | No | — | Valid path | 5 years |
| selfie_path | string(255) | nullable | No | — | Valid path | 5 years |
| status | string(20) | default:'pending' | No | — | In: pending/under_review/approved/rejected/expired | 5 years |
| rejection_reason | text | nullable | No | — | — | 5 years |
| verified_at | timestamp | nullable | No | — | — | 5 years |
| verified_by | string(36) | nullable | No | — | Valid UUID | 5 years |
| expires_at | timestamp | nullable | No | — | — | 5 years |
| metadata | jsonb | nullable | No | — | Valid JSON | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (user_id, status) | B-tree | P0 |
| Composite | (status, created_at) | B-tree | P1 |
| Composite | (verification_type, status) | B-tree | P1 |

---

#### A6. `consent_records`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| consent_type | string(50) | NOT NULL | No | In: terms_of_service/privacy_policy/location_tracking/marketing_notifications/data_sharing | 5 years |
| consent_version | string(20) | NOT NULL | No | Semver format | 5 years |
| granted_at | timestamp | NOT NULL | No | — | 5 years |
| revoked_at | timestamp | nullable | No | — | 5 years |
| ip_address | string(45) | nullable | No | IPv4/IPv6 | 5 years |
| user_agent | text | nullable | No | — | 5 years |
| metadata | jsonb | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (user_id, consent_type, granted_at) | B-tree | P0 |
| Composite | (consent_type, consent_version) | B-tree | P1 |

---

### Domain B: Ride Management

#### B1. `rides`

| Column | Type | Constraints | PII? | Validation | Retention | Notes |
|--------|------|-------------|------|------------|-----------|-------|
| id | UUID | PK | No | — | 5 years | |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | 5 years | |
| rider_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years | |
| driver_id | UUID | FK → users.id, nullable | No | Valid UUID | 5 years | Until accepted |
| pickup_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years | |
| pickup_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years | |
| dropoff_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years | |
| dropoff_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years | |
| pickup_address | text | NOT NULL | No | 5-500 chars | 5 years | |
| dropoff_address | text | NOT NULL | No | 5-500 chars | 5 years | |
| status | string(20) | NOT NULL, default:'searching' | No | See state machine §4.1 | 5 years | |
| category | string(20) | default:'standard' | No | In: standard/premium/minivan/pets/delivery | 5 years | |
| ride_type | string(20) | nullable | No | In: standard/scheduled/pool | 5 years | Pool/scheduled variants |
| distance_km | decimal(8,3) | nullable | No | >= 0 | 5 years | |
| duration_minutes | decimal(5,1) | nullable | No | >= 0 | 5 years | |
| base_fare | decimal(16,2) | nullable | No | >= 0 | 5 years | |
| per_km_fare | decimal(16,2) | nullable | No | >= 0 | 5 years | |
| surge_multiplier | decimal(4,2) | default:1.0 | No | 1.00-5.00 | 5 years | |
| total_fare | decimal(16,2) | nullable | No | >= 0 | 5 years | |
| cancellation_fee | decimal(16,2) | default:0 | No | >= 0 | 5 years | |
| promo_code_id | UUID | FK → promo_codes.id, nullable | No | Valid UUID | 5 years | |
| discount_amount | decimal(16,2) | default:0 | No | >= 0 | 5 years | |
| payment_method | string(20) | default:'card' | No | In: card/cash/wallet | 5 years | |
| payment_status | string(20) | default:'pending' | No | See state machine §4.2 | 5 years | |
| driver_eta | integer | nullable | No | >= 0 (seconds) | 5 years | |
| route_polyline | text | nullable | No | Encoded polyline | 5 years | |
| status_history | jsonb | nullable | No | Valid JSON array | 5 years | Array of {status, timestamp} |
| search_radius_km | decimal(2) | nullable | No | >= 0 | 5 years | |
| driver_notified_at | timestamp | nullable | No | — | 5 years | |
| arrived_at | timestamp | nullable | No | — | 5 years | |
| waiting_started_at | timestamp | nullable | No | — | 5 years | |
| no_show_at | timestamp | nullable | No | — | 5 years | |
| cancellation_requested_at | timestamp | nullable | No | — | 5 years | |
| cancellation_request_reason | text | nullable | No | — | 5 years | |
| estimated_arrival_seconds | integer | nullable | No | >= 0 | 5 years | |
| pickup_reached_at | timestamp | nullable | No | — | 5 years | |
| dropoff_reached_at | timestamp | nullable | No | — | 5 years | |
| started_at | timestamp | nullable | No | — | 5 years | |
| completed_at | timestamp | nullable | No | — | 5 years | |
| cancelled_at | timestamp | nullable | No | — | 5 years | |
| cancelled_by | string(36) | nullable | No | Valid UUID | 5 years | |
| cancelled_by_system | boolean | default:false | No | — | 5 years | |
| cancellation_reason | text | nullable | No | — | 5 years | |
| rider_en_route_to_pickup | boolean | default:false | No | — | 5 years | |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

**Spatial columns (PostGIS):**
| Column | Type | Notes |
|--------|------|-------|
| pickup_location | GEOGRAPHY(Point, 4326) | Computed from lat/lng |
| dropoff_location | GEOGRAPHY(Point, 4326) | Computed from lat/lng |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (status, created_at) | B-tree | P0 |
| Composite | (rider_id, status) | B-tree | P0 |
| Composite | (driver_id, status) | B-tree | P0 |
| GIST | pickup_location | Spatial | P0 |
| GIST | dropoff_location | Spatial | P1 |
| Composite | (tenant_id, status, created_at) | B-tree | P1 |

---

#### B2. `ride_status_histories`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| ride_id | UUID | FK → rides.id, NOT NULL | No | Valid UUID | 5 years |
| status | string(20) | NOT NULL | No | In: same as RideStatus enum | 5 years |
| metadata | jsonb | nullable | No | Valid JSON | 5 years |
| created_by | string(36) | nullable | No | Valid UUID | 5 years |
| created_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (ride_id, created_at) | B-tree | P0 |

---

#### B3. `scheduled_rides`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| rider_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| pickup_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| pickup_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| pickup_address | text | NOT NULL | No | 5-500 chars | 5 years |
| dropoff_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| dropoff_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| dropoff_address | text | NOT NULL | No | 5-500 chars | 5 years |
| scheduled_at | timestamp | NOT NULL | No | Future timestamp, 1-72h ahead | 5 years |
| status | string(20) | NOT NULL, default:'pending' | No | In: pending/dispatched/auto_dispatched/completed/cancelled | 5 years |
| category | string(20) | default:'standard' | No | In: standard/premium/minivan | 5 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

### Domain C: Payment & Wallet

#### C1. `payments`

| Column | Type | Constraints | PII? | Validation | Retention | Notes |
|--------|------|-------------|------|------------|-----------|-------|
| id | UUID | PK | No | — | 7 years | SARS requirement |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 7 years | |
| payer_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 7 years | |
| payee_id | UUID | FK → users.id, nullable | No | Valid UUID | 7 years | |
| method | string(20) | NOT NULL | No | In: card/cash/wallet | 7 years | |
| gateway | string(20) | nullable | No | In: payfast/ozow/cash | 7 years | |
| gateway_reference | string(255) | nullable | No | — | 7 years | External payment ID |
| idempotency_key | string(36) | UNIQUE, nullable | No | Valid UUID | 7 years | Deduplication |
| amount | decimal(16,2) | NOT NULL | No | > 0 | 7 years | ZAR |
| currency | string(3) | default:'ZAR' | No | ISO 4217 | 7 years | |
| platform_fee | decimal(16,2) | default:0 | No | >= 0 | 7 years | |
| driver_payout | decimal(16,2) | nullable | No | >= 0 | 7 years | |
| status | string(20) | NOT NULL, default:'pending' | No | See state machine §4.2 | 7 years | |
| paid_at | timestamp | nullable | No | — | 7 years | |
| gateway_response | jsonb | nullable | No | Valid JSON | 7 years | Raw gateway response |
| failure_reason | text | nullable | No | — | 7 years | |
| retry_count | integer | default:0 | No | >= 0 | 7 years | |
| refunded_at | timestamp | nullable | No | — | 7 years | |
| refund_reason | text | nullable | No | — | 7 years | |
| refund_amount | decimal(16,2) | nullable | No | >= 0 | 7 years | |
| refunded_by | string(36) | nullable | No | Valid UUID | 7 years | |
| held_until | timestamp | nullable | No | — | 7 years | Escrow hold deadline |
| escrow_released | boolean | default:false | No | — | 7 years | |
| escrow_released_at | timestamp | nullable | No | — | 7 years | |
| dispute_hold | boolean | default:false | No | — | 7 years | |
| dispute_hold_shortfall | decimal(16,2) | nullable | No | >= 0 | 7 years | |
| cash_received | decimal(16,2) | nullable | No | >= 0 | 7 years | Cash tracking |
| cash_discrepancy | decimal(16,2) | nullable | No | — | 7 years | |
| cash_settled_at | timestamp | nullable | No | — | 7 years | |
| cash_reconciled | boolean | default:false | No | — | 7 years | |
| created_at | timestamp | | No | — | — | 7 years |
| updated_at | timestamp | | No | — | — | 7 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Unique | idempotency_key | B-tree | P0 |
| Composite | (payer_id, status) | B-tree | P0 |
| Composite | (gateway, gateway_reference) | B-tree | P0 |
| Composite | (status, created_at) | B-tree | P1 |
| Single | ride_id | B-tree | P1 |

---

#### C2. `wallets`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| user_id | UUID | FK → users.id, UNIQUE | No | Valid UUID | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | Indefinite |
| balance | decimal(16,2) | default:0 | No | >= 0 (CHECK constraint) | Indefinite |
| pending_balance | decimal(16,2) | default:0 | No | >= 0 (CHECK constraint) | Indefinite |
| currency | string(3) | default:'ZAR' | No | ISO 4217 | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

**CHECK constraints:**
```sql
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_balance CHECK (balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_pending_balance CHECK (pending_balance >= 0);
```

---

#### C3. `wallet_transactions`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| wallet_id | UUID | FK → wallets.id, NOT NULL | No | Valid UUID | 5 years |
| type | string(20) | NOT NULL | No | In: deposit/withdrawal/payment/refund/referral_bonus/payout/fee | 5 years |
| status | string(20) | default:'completed' | No | In: pending/completed/failed | 5 years |
| amount | decimal(16,2) | NOT NULL | No | != 0 | 5 years |
| balance_before | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| balance_after | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| reference_type | string(50) | nullable | No | In: ride/payment/payout/refund | 5 years |
| reference_id | string(36) | nullable | No | Valid UUID | 5 years |
| gateway_reference | string(255) | nullable | No | — | 5 years |
| description | text | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (wallet_id, created_at) | B-tree | P0 |
| Composite | (reference_type, reference_id) | B-tree | P1 |
| Composite | (type, created_at) | B-tree | P1 |

---

#### C4. `driver_payouts`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 7 years |
| driver_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 7 years |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | 7 years |
| amount | decimal(16,2) | NOT NULL | No | > 0 | 7 years |
| platform_fee | decimal(16,2) | default:0 | No | >= 0 | 7 years |
| net_amount | decimal(16,2) | NOT NULL | No | >= 0 | 7 years |
| status | string(20) | default:'pending' | No | In: pending/processing/completed/failed | 7 years |
| payout_method | string(20) | default:'bank_transfer' | No | In: bank_transfer/wallet/cash | 7 years |
| bank_account_id | UUID | nullable | No | Valid UUID | 7 years |
| reference | string(255) | nullable | No | — | 7 years |
| notes | text | nullable | No | — | 7 years |
| period_start | timestamp | nullable | No | — | 7 years |
| period_end | timestamp | nullable | No | — | 7 years |
| paid_at | timestamp | nullable | No | — | 7 years |
| created_at | timestamp | | No | — | — | 7 years |
| updated_at | timestamp | | No | — | — | 7 years |

---

#### C5. `cash_reconciliations`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 7 years |
| driver_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 7 years |
| admin_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 7 years |
| payment_id | UUID | FK → payments.id, nullable | No | Valid UUID | 7 years |
| period_start | timestamp | NOT NULL | No | — | 7 years |
| period_end | timestamp | NOT NULL | No | > period_start | 7 years |
| expected_amount | decimal(16,2) | NOT NULL | No | >= 0 | 7 years |
| collected_amount | decimal(16,2) | NOT NULL | No | >= 0 | 7 years |
| discrepancy | decimal(16,2) | NOT NULL | No | — | 7 years |
| status | string(20) | default:'pending' | No | In: pending/resolved/disputed | 7 years |
| notes | text | nullable | No | — | 7 years |
| resolved_at | timestamp | nullable | No | — | 7 years |
| created_at | timestamp | | No | — | — | 7 years |
| updated_at | timestamp | | No | — | — | 7 years |

---

#### C6. `refunds`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 7 years |
| payment_id | UUID | FK → payments.id, NOT NULL | No | Valid UUID | 7 years |
| amount | decimal(16,2) | NOT NULL | No | > 0 | 7 years |
| reason | text | NOT NULL | No | 10-1000 chars | 7 years |
| status | string(20) | default:'pending' | No | In: pending/processing/completed/failed | 7 years |
| processed_by | string(36) | nullable | No | Valid UUID | 7 years |
| processed_at | timestamp | nullable | No | — | 7 years |
| gateway_reference | string(255) | nullable | No | — | 7 years |
| created_at | timestamp | | No | — | — | 7 years |
| updated_at | timestamp | | No | — | — | 7 years |

---

#### C7. `disputes`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 5 years |
| payment_id | UUID | FK → payments.id, nullable | No | Valid UUID | 5 years |
| raised_by | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| reason | string(50) | NOT NULL | No | In: fare_dispute/service_quality/safety/payment_issue/other | 5 years |
| description | text | nullable | No | 10-2000 chars | 5 years |
| status | string(20) | default:'open' | No | In: open/investigating/resolved/closed | 5 years |
| resolved_by | string(36) | nullable | No | Valid UUID | 5 years |
| resolved_at | timestamp | nullable | No | — | 5 years |
| resolution | text | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

### Domain D: Promo & Referral

#### D1. `promo_codes`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | Indefinite |
| code | string(50) | UNIQUE, NOT NULL | No | Uppercase alphanumeric | Indefinite |
| type | string(20) | NOT NULL | No | In: percentage/fixed/free_ride | Indefinite |
| value | decimal(16,2) | NOT NULL | No | > 0 | Indefinite |
| min_ride_amount | decimal(16,2) | nullable | No | >= 0 | Indefinite |
| max_discount | decimal(16,2) | nullable | No | >= 0 | Indefinite |
| max_uses | integer | nullable | No | > 0 or NULL (unlimited) | Indefinite |
| used_count | integer | default:0 | No | >= 0 | Indefinite |
| per_user_limit | integer | default:1 | No | >= 1 | Indefinite |
| applicable_to | string(50) | default:'all' | No | In: rides/food/delivery/all | Indefinite |
| first_ride_only | boolean | default:false | No | — | Indefinite |
| applicable_categories | jsonb | nullable | No | Valid JSON array | Indefinite |
| starts_at | timestamp | nullable | No | — | Indefinite |
| expires_at | timestamp | nullable | No | > starts_at | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### D2. `promo_code_redemptions`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| promo_code_id | UUID | FK → promo_codes.id, NOT NULL | No | Valid UUID | 5 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 5 years |
| discount_amount | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| redeemed_at | timestamp | NOT NULL | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |

**Unique constraint:** `(promo_code_id, user_id)` — one use per user per code

---

#### D3. `referral_codes`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| user_id | UUID | FK → users.id, UNIQUE | No | Valid UUID | Indefinite |
| code | string(50) | UNIQUE, NOT NULL | No | Uppercase alphanumeric | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| usage_count | integer | default:0 | No | >= 0 | Indefinite |
| max_uses | integer | nullable | No | > 0 or NULL | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### D4. `referral_redemptions`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| referral_code_id | UUID | FK → referral_codes.id, NOT NULL | No | Valid UUID | 5 years |
| referrer_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| referred_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| bonus_amount | decimal(16,2) | NOT NULL | No | > 0 | 5 years |
| bonus_paid | boolean | default:false | No | — | 5 years |
| completed_at | timestamp | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |

---

### Domain E: Delivery & Food

#### E1. `deliveries`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | 5 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 5 years |
| sender_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| driver_id | UUID | FK → users.id, nullable | No | Valid UUID | 5 years |
| type | string(20) | NOT NULL | No | In: parcel/food/grocery/other | 5 years |
| description | text | nullable | No | — | 5 years |
| item_description | text | nullable | No | — | 5 years |
| item_value | decimal(16,2) | nullable | No | >= 0 | 5 years |
| sender_name | string(255) | NOT NULL | **YES** | 2-255 chars | 5 years |
| sender_phone | string(20) | NOT NULL | **YES** | SA format | 5 years |
| recipient_name | string(255) | NOT NULL | **YES** | 2-255 chars | 5 years |
| recipient_phone | string(20) | NOT NULL | **YES** | SA format | 5 years |
| recipient_address | text | NOT NULL | No | 5-500 chars | 5 years |
| recipient_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| recipient_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| pickup_address | text | NOT NULL | No | 5-500 chars | 5 years |
| pickup_lat | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| pickup_lng | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| dropoff_address | text | NOT NULL | No | 5-500 chars | 5 years |
| dropoff_lat | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| dropoff_lng | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| pickup_notes | text | nullable | No | — | 5 years |
| delivery_notes | text | nullable | No | — | 5 years |
| package_size | string(20) | default:'medium' | No | In: small/medium/large | 5 years |
| package_weight_kg | decimal(5,2) | nullable | No | > 0 | 5 years |
| estimated_value | decimal(16,2) | nullable | No | >= 0 | 5 years |
| requires_signature | boolean | default:false | No | — | 5 years |
| is_fragile | boolean | default:false | No | — | 5 years |
| status | string(20) | NOT NULL | No | See state machine §4.3 | 5 years |
| payment_method | string(20) | default:'card' | No | In: card/cash/wallet | 5 years |
| payment_status | string(20) | default:'pending' | No | In: pending/completed/refunded/failed | 5 years |
| fare_amount | decimal(16,2) | nullable | No | >= 0 | 5 years |
| notes | text | nullable | No | — | 5 years |
| signature_image_path | string(255) | nullable | No | Valid path | 5 years |
| delivery_photo_path | string(255) | nullable | No | Valid path | 5 years |
| otp_code | string(6) | nullable | No | 6 digits | 5 years |
| otp_verified_at | timestamp | nullable | No | — | 5 years |
| picked_up_at | timestamp | nullable | No | — | 5 years |
| delivered_at | timestamp | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

#### E2. `restaurants`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | Indefinite |
| name | string(255) | NOT NULL | No | 2-255 chars | Indefinite |
| slug | string(100) | UNIQUE | No | lowercase alphanumeric + hyphens | Indefinite |
| description | text | nullable | No | — | Indefinite |
| image_url | string(255) | nullable | No | Valid URL | Indefinite |
| cover_image_url | string(255) | nullable | No | Valid URL | Indefinite |
| phone | string(20) | nullable | No | SA format | Indefinite |
| email | string(255) | nullable | No | Valid email | Indefinite |
| address | text | nullable | No | — | Indefinite |
| address_components | jsonb | nullable | No | Valid JSON | Indefinite |
| latitude | decimal(10,7) | nullable | No | -90 to 90 | Indefinite |
| longitude | decimal(10,7) | nullable | No | -180 to 180 | Indefinite |
| cuisine_type | string(50) | nullable | No | — | Indefinite |
| price_range | integer | nullable | No | 1-4 | Indefinite |
| delivery_fee | decimal(16,2) | default:0 | No | >= 0 | Indefinite |
| minimum_order | decimal(16,2) | default:0 | No | >= 0 | Indefinite |
| delivery_radius_km | decimal(5,2) | default:10 | No | > 0 | Indefinite |
| estimated_delivery_minutes | integer | default:30 | No | > 0 | Indefinite |
| commission_rate | decimal(5,2) | nullable | No | 0-100 | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| is_featured | boolean | default:false | No | — | Indefinite |
| opens_at | time | nullable | No | — | Indefinite |
| closes_at | time | nullable | No | — | Indefinite |
| rating | decimal(3,2) | default:0 | No | 0-5 | Indefinite |
| rating_count | integer | default:0 | No | >= 0 | Indefinite |
| total_orders | integer | default:0 | No | >= 0 | Indefinite |
| menu_last_updated_at | timestamp | nullable | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### E3. `restaurant_categories`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| restaurant_id | UUID | FK → restaurants.id, NOT NULL | No | Valid UUID | Indefinite |
| name | string(100) | NOT NULL | No | 2-100 chars | Indefinite |
| sort_order | integer | default:0 | No | >= 0 | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### E4. `menu_items`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| restaurant_id | UUID | FK → restaurants.id, NOT NULL | No | Valid UUID | Indefinite |
| category_id | UUID | FK → restaurant_categories.id, nullable | No | Valid UUID | Indefinite |
| name | string(255) | NOT NULL | No | 2-255 chars | Indefinite |
| description | text | nullable | No | — | Indefinite |
| price | decimal(16,2) | NOT NULL | No | > 0 | Indefinite |
| image_url | string(255) | nullable | No | Valid URL | Indefinite |
| is_available | boolean | default:true | No | — | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| is_vegetarian | boolean | default:false | No | — | Indefinite |
| is_vegan | boolean | default:false | No | — | Indefinite |
| is_gluten_free | boolean | default:false | No | — | Indefinite |
| is_signature | boolean | default:false | No | — | Indefinite |
| spice_level | integer | default:0 | No | 0-5 | Indefinite |
| preparation_time_minutes | integer | nullable | No | > 0 | Indefinite |
| calories | integer | nullable | No | > 0 | Indefinite |
| original_price | decimal(16,2) | nullable | No | >= 0 | Indefinite |
| allergen_info | text | nullable | No | — | Indefinite |
| variants | jsonb | nullable | No | Valid JSON array | Indefinite |
| sort_order | integer | default:0 | No | >= 0 | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### E5. `food_orders`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | 5 years |
| restaurant_id | UUID | FK → restaurants.id, NOT NULL | No | Valid UUID | 5 years |
| customer_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| driver_id | UUID | FK → users.id, nullable | No | Valid UUID | 5 years |
| delivery_id | UUID | FK → deliveries.id, nullable | No | Valid UUID | 5 years |
| status | string(20) | NOT NULL | No | See state machine §4.4 | 5 years |
| subtotal | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| delivery_fee | decimal(16,2) | default:0 | No | >= 0 | 5 years |
| service_fee | decimal(16,2) | default:0 | No | >= 0 | 5 years |
| tip_amount | decimal(16,2) | default:0 | No | >= 0 | 5 years |
| total_amount | decimal(16,2) | NOT NULL | No | > 0 | 5 years |
| delivery_address | text | NOT NULL | No | 5-500 chars | 5 years |
| delivery_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| delivery_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| delivery_notes | text | nullable | No | — | 5 years |
| restaurant_notes | text | nullable | No | — | 5 years |
| estimated_delivery_at | timestamp | nullable | No | — | 5 years |
| actual_delivery_at | timestamp | nullable | No | — | 5 years |
| confirmed_at | timestamp | nullable | No | — | 5 years |
| preparing_at | timestamp | nullable | No | — | 5 years |
| ready_at | timestamp | nullable | No | — | 5 years |
| accepted_by_driver_at | timestamp | nullable | No | — | 5 years |
| preparation_time_actual | integer | nullable | No | >= 0 | 5 years |
| cancelled_at | timestamp | nullable | No | — | 5 years |
| cancelled_by | string(36) | nullable | No | Valid UUID | 5 years |
| cancellation_reason | text | nullable | No | — | 5 years |
| payment_method | string(20) | default:'card' | No | In: card/cash/wallet | 5 years |
| payment_status | string(20) | default:'pending' | No | In: pending/completed/refunded/failed | 5 years |
| payment_id | UUID | FK → payments.id, nullable | No | Valid UUID | 5 years |
| rating | integer | nullable | No | 1-5 | 5 years |
| rating_comment | text | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

#### E6. `food_order_items`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| food_order_id | UUID | FK → food_orders.id, NOT NULL | No | Valid UUID | 5 years |
| menu_item_id | UUID | FK → menu_items.id, nullable | No | Valid UUID | 5 years |
| name | string(255) | NOT NULL | No | Snapshot at order time | 5 years |
| price | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| quantity | integer | NOT NULL, min:1 | No | >= 1 | 5 years |
| special_instructions | text | nullable | No | — | 5 years |
| line_total | decimal(16,2) | NOT NULL | No | >= 0 | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

### Domain F: Safety & Compliance

#### F1. `incident_reports`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| reporter_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 5 years |
| delivery_id | UUID | FK → deliveries.id, nullable | No | Valid UUID | 5 years |
| incident_type | string(50) | NOT NULL | No | In: safety/harassment/accident/vehicle_issue/payment_dispute/fraud/other (+ 7 more types) | 5 years |
| severity | string(20) | default:'medium' | No | In: low/medium/high/critical | 5 years |
| title | string(255) | NOT NULL | No | 5-255 chars | 5 years |
| description | text | NOT NULL | No | 10-5000 chars | 5 years |
| status | string(20) | default:'open' | No | In: open/investigating/resolved/closed/escalated | 5 years |
| assigned_to | string(36) | nullable | No | Valid UUID | 5 years |
| resolution | text | nullable | No | — | 5 years |
| resolved_at | timestamp | nullable | No | — | 5 years |
| evidence_paths | jsonb | nullable | No | Valid JSON array of paths | 5 years |
| metadata | jsonb | nullable | No | Valid JSON | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (status, severity) | B-tree | P0 |
| Composite | (incident_type, status) | B-tree | P1 |
| Composite | (assigned_to, status) | B-tree | P1 |
| Single | reporter_id | B-tree | P1 |
| Single | ride_id | B-tree | P1 |

---

#### F2. `sos_alerts`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 2 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 2 years |
| ride_id | UUID | FK → rides.id, nullable | No | Valid UUID | 2 years |
| latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 2 years |
| longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 2 years |
| location_description | text | nullable | No | — | 2 years |
| status | string(20) | default:'active' | No | In: active/acknowledged/resolved/cancelled | 2 years |
| severity | string(20) | default:'high' | No | In: low/medium/high/critical | 2 years |
| acknowledged_by | string(36) | nullable | No | Valid UUID | 2 years |
| acknowledged_at | timestamp | nullable | No | — | 2 years |
| resolved_at | timestamp | nullable | No | — | 2 years |
| notes | text | nullable | No | — | 2 years |
| created_at | timestamp | | No | — | — | 2 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (status, severity, created_at) | B-tree | P0 |
| Single | user_id | B-tree | P1 |

---

#### F3. `audit_logs` (AdminAuditLog)

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | 5 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| action | string(50) | NOT NULL | No | In: create/update/delete/approve/reject/suspend/reactivate | 5 years |
| resource_type | string(50) | NOT NULL | No | In: user/ride/payment/driver/kyc/setting/promo/incident | 5 years |
| resource_id | string(36) | NOT NULL | No | Valid UUID | 5 years |
| old_values | jsonb | nullable | No | Valid JSON | 5 years |
| new_values | jsonb | nullable | No | Valid JSON | 5 years |
| ip_address | string(45) | nullable | No | IPv4/IPv6 | 5 years |
| user_agent | text | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (resource_type, resource_id) | B-tree | P0 |
| Composite | (user_id, created_at) | B-tree | P0 |
| Composite | (action, created_at) | B-tree | P1 |
| Single | created_at | B-tree | P1 |

---

### Domain G: Notifications & Communication

#### G1. `in_app_notifications`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 90 days |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 90 days |
| title | string(255) | NOT NULL | No | 1-255 chars | 90 days |
| body | text | nullable | No | — | 90 days |
| type | string(50) | nullable | No | In: ride_update/payment/sos/promo/system | 90 days |
| data | jsonb | nullable | No | Valid JSON | 90 days |
| is_read | boolean | default:false | No | — | 90 days |
| read_at | timestamp | nullable | No | — | 90 days |
| deduplication_key | string(255) | nullable | No | — | 90 days |
| created_at | timestamp | | No | — | — | 90 days |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (user_id, is_read, created_at) | B-tree | P0 |
| Composite | (type, created_at) | B-tree | P1 |

---

#### G2. `push_tokens`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | Indefinite |
| token | text | NOT NULL | No | Non-empty | Indefinite |
| platform | string(10) | NOT NULL | No | In: ios/android/web | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| last_used_at | timestamp | nullable | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (user_id, is_active) | B-tree | P0 |
| Single | token | B-tree | P1 |

---

#### G3. `ride_chat_messages`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 1 year |
| ride_id | UUID | FK → rides.id, NOT NULL | No | Valid UUID | 1 year |
| sender_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 1 year |
| receiver_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 1 year |
| message | text | NOT NULL | No | 1-2000 chars | 1 year |
| is_read | boolean | default:false | No | — | 1 year |
| read_at | timestamp | nullable | No | — | 1 year |
| created_at | timestamp | | No | — | — | 1 year |
| updated_at | timestamp | | No | — | — | 1 year |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (ride_id, created_at) | B-tree | P0 |
| Single | sender_id | B-tree | P1 |
| Composite | (receiver_id, is_read) | B-tree | P1 |

---

#### G4. `notification_preferences`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | Indefinite |
| notification_type | string(50) | NOT NULL | No | In: ride_update/payment/sos/promo/system | Indefinite |
| push_enabled | boolean | default:true | No | — | Indefinite |
| email_enabled | boolean | default:true | No | — | Indefinite |
| sms_enabled | boolean | default:false | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### G5. `admin_notifications`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 90 days |
| type | string(50) | NOT NULL | No | In: sos/payment_failed/dispute/system_alert | 90 days |
| title | string(255) | NOT NULL | No | 1-255 chars | 90 days |
| body | text | nullable | No | — | 90 days |
| data | jsonb | nullable | No | Valid JSON | 90 days |
| is_read | boolean | default:false | No | — | 90 days |
| read_at | timestamp | nullable | No | — | 90 days |
| created_at | timestamp | | No | — | — | 90 days |

---

### Domain H: Pricing & Surge

#### H1. `surge_zones`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | Indefinite |
| name | string(100) | NOT NULL | No | 2-100 chars | Indefinite |
| center_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | Indefinite |
| center_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | Indefinite |
| radius_km | decimal(5,2) | NOT NULL | No | > 0 | Indefinite |
| multiplier | decimal(4,2) | NOT NULL | No | 1.00-5.00 | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

#### H2. `peak_hours`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID | Indefinite |
| day_of_week | integer | NOT NULL | No | 0-6 (0=Sunday) | Indefinite |
| start_time | time | NOT NULL | No | — | Indefinite |
| end_time | time | NOT NULL | No | > start_time | Indefinite |
| multiplier | decimal(4,2) | NOT NULL | No | 1.00-5.00 | Indefinite |
| is_active | boolean | default:true | No | — | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

---

### Domain I: Pool Rides

#### I1. `pool_rides`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| ride_id | UUID | FK → rides.id, NOT NULL | No | Valid UUID | 5 years |
| max_passengers | integer | default:4 | No | 2-4 | 5 years |
| current_passengers | integer | default:0 | No | 0-max_passengers | 5 years |
| status | string(20) | default:'open' | No | In: open/full/in_progress/completed/cancelled | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

#### I2. `pool_passengers`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| pool_ride_id | UUID | FK → pool_rides.id, NOT NULL | No | Valid UUID | 5 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| pickup_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| pickup_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| dropoff_latitude | decimal(10,7) | NOT NULL | No | -90 to 90 | 5 years |
| dropoff_longitude | decimal(10,7) | NOT NULL | No | -180 to 180 | 5 years |
| status | string(20) | default:'waiting' | No | In: waiting/picked_up/dropped_off/cancelled | 5 years |
| fare_share | decimal(16,2) | nullable | No | >= 0 | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

### Domain J: System & Infrastructure

#### J1. `system_settings`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | Indefinite |
| tenant_id | UUID | FK → tenants.id, nullable | No | Valid UUID (null = global) | Indefinite |
| key | string(100) | NOT NULL | No | — | Indefinite |
| value | text | NOT NULL | No | — | Indefinite |
| description | text | nullable | No | — | Indefinite |
| type | string(20) | default:'string' | No | In: string/boolean/number/json | Indefinite |
| created_at | timestamp | | No | — | — | Indefinite |
| updated_at | timestamp | | No | — | — | Indefinite |

**Unique constraint:** `(tenant_id, key)`

---

#### J2. `webhook_events`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 90 days |
| source | string(50) | NOT NULL | No | In: payfast/ozow/stripe/partner | 90 days |
| event_type | string(100) | NOT NULL | No | — | 90 days |
| payload | jsonb | NOT NULL | No | Valid JSON | 90 days |
| headers | jsonb | nullable | No | Valid JSON | 90 days |
| status | string(20) | default:'pending' | No | In: pending/processing/completed/failed | 90 days |
| attempt_count | integer | default:0 | No | >= 0 | 90 days |
| max_attempts | integer | default:5 | No | > 0 | 90 days |
| last_error | text | nullable | No | — | 90 days |
| last_attempt_at | timestamp | nullable | No | — | 90 days |
| processed_at | timestamp | nullable | No | — | 90 days |
| created_at | timestamp | | No | — | — | 90 days |
| updated_at | timestamp | | No | — | — | 90 days |

**Indexes:**
| Index | Columns | Type | Priority |
|-------|---------|------|----------|
| Primary | id | PK | P0 |
| Composite | (status) | B-tree | P0 |
| Composite | (source, status) | B-tree | P1 |

---

#### J3. `user_documents`

| Column | Type | Constraints | PII? | Validation | Retention |
|--------|------|-------------|------|------------|-----------|
| id | UUID | PK | No | — | 5 years |
| user_id | UUID | FK → users.id, NOT NULL | No | Valid UUID | 5 years |
| document_type | string(50) | NOT NULL | No | In: license/insurance/registration/utility_bill/bank_statement/other | 5 years |
| file_path | string(255) | NOT NULL | No | Valid path | 5 years |
| file_size | integer | nullable | No | > 0 | 5 years |
| mime_type | string(100) | nullable | No | In: image/jpeg,image/png,application/pdf | 5 years |
| status | string(20) | default:'pending' | No | In: pending/verified/rejected | 5 years |
| verified_by | UUID | nullable | No | Valid UUID | 5 years |
| verified_at | timestamp | nullable | No | — | 5 years |
| expires_at | timestamp | nullable | No | — | 5 years |
| created_at | timestamp | | No | — | — | 5 years |
| updated_at | timestamp | | No | — | — | 5 years |

---

## 4. State Machines

### 4.1 Ride Status Machine

```
searching → driver_assigned → accepted → driver_en_route → arrived → waiting_for_rider → in_progress → near_drop_off → completed
    ↓              ↓              ↓             ↓              ↓            ↓                ↓
cancelled      cancelled      cancelled      cancelled      cancelled    cancelled         cancelled
                                ↓                                              ↓
                            no_show                                          no_show

searching → cancelled
driver_assigned → no_show
waiting_for_rider → no_show

Any active state → cancellation_requested → cancelled
```

**Valid transitions (from Ride.php):**
| From | Allowed To |
|------|-----------|
| searching | driver_assigned, cancelled |
| driver_assigned | accepted, cancelled, no_show |
| accepted | driver_en_route, cancelled |
| driver_en_route | arrived, cancelled |
| arrived | waiting_for_rider, in_progress, cancelled |
| waiting_for_rider | in_progress, cancelled, no_show |
| in_progress | near_drop_off, completed, cancelled |
| near_drop_off | completed, cancelled |
| cancellation_requested | cancelled |
| completed | (terminal) |
| cancelled | (terminal) |
| no_show | (terminal) |

---

### 4.2 Payment Status Machine

```
pending → processing → completed → released
    ↓          ↓           ↓          ↓
failed     failed      refunded   release_failed
                        disputed
                        cancelled
```

**Valid transitions:**
| From | Allowed To |
|------|-----------|
| pending | processing, failed, cancelled |
| processing | completed, failed |
| completed | escrow_held, refunded, disputed, released |
| escrow_held | released, release_failed, disputed |
| disputed | completed, refunded |
| (terminal) | completed, released, failed, refunded, cancelled, release_failed |

---

### 4.3 Delivery Status Machine

```
pending → picked_up → in_transit → delivered
    ↓         ↓           ↓
failed    cancelled    failed
                     cancelled
```

---

### 4.4 Food Order Status Machine

```
pending → confirmed → preparing → ready → assigned → picked_up → in_transit → delivered
    ↓         ↓           ↓          ↓        ↓          ↓           ↓
cancelled  cancelled   cancelled            cancelled  cancelled   cancelled
```

---

### 4.5 Incident Report Status Machine

```
open → investigating → resolved → closed
                ↓
            escalated → investigating (re-opened)
```

---

### 4.6 SOS Alert Status Machine

```
active → acknowledged → resolved
    ↓
cancelled
```

---

### 4.7 KYC Verification Status Machine

```
pending → under_review → approved
                    ↓
                rejected
                    ↓
                expired
```

---

### 4.8 Dispute Status Machine

```
open → investigating → resolved → closed
```

---

## 5. PII Classification Summary

### 5.1 PII Fields Requiring AES-256 Encryption

| Table | Field | Encryption | Lookup Method |
|-------|-------|------------|---------------|
| users | email | AES-256 (encrypted cast) | email_hash (SHA-256) |
| users | phone_number | AES-256 (encrypted cast) | phone_hash (SHA-256) |
| driver_profiles | id_number | AES-256 (encrypted cast) | — |
| driver_profiles | license_number | AES-256 (encrypted cast) | — |
| driver_profiles | date_of_birth | AES-256 (encrypted cast) | — |
| driver_profiles | emergency_contact_name | AES-256 (encrypted cast) | — |
| driver_profiles | emergency_contact_phone | AES-256 (encrypted cast) | — |
| kyc_verifications | document_number | AES-256 (encrypted cast) | — |

### 5.2 PII Fields Display-Only (No Encryption)

| Table | Field | Reason |
|-------|-------|--------|
| users | name | Display name, not sensitive identity |
| deliveries | sender_name | Required for delivery coordination |
| deliveries | sender_phone | Required for delivery coordination |
| deliveries | recipient_name | Required for delivery coordination |
| deliveries | recipient_phone | Required for delivery coordination |

### 5.3 Hash Columns for Encrypted Field Lookup

| Hash Column | Source | Algorithm | Table |
|------------|--------|-----------|-------|
| email_hash | users.email | SHA-256 | users |
| phone_hash | users.phone_number | SHA-256 | users |

---

## 6. Spatial Data Strategy

### 6.1 PostGIS Configuration

| Feature | Implementation |
|---------|---------------|
| Extension | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| Geography type | `GEOGRAPHY(Point, 4326)` for all lat/lng points |
| Spatial index | GIST index on all geography columns |
| Distance calculation | `ST_Distance()` for meters, Haversine fallback |
| Bounding box | `ST_MakeEnvelope()` for area queries |

### 6.2 Spatial Columns

| Table | Column | Type | Index |
|-------|--------|------|-------|
| rides | pickup_location | GEOGRAPHY(Point, 4326) | GIST |
| rides | dropoff_location | GEOGRAPHY(Point, 4326) | GIST |
| restaurants | location | GEOGRAPHY(Point, 4326) | GIST |
| surge_zones | center + radius | Computed circle | B-tree on center |

### 6.3 Nearby Query Pattern

```sql
-- Find drivers within 5km of pickup
SELECT u.id, u.current_latitude, u.current_longitude,
       ST_Distance(
         ST_MakePoint(u.current_longitude, u.current_latitude)::geography,
         ST_MakePoint(:pickup_lng, :pickup_lat)::geography
       ) AS distance_meters
FROM users u
WHERE u.role = 'driver'
  AND u.is_online = true
  AND u.is_approved = true
  AND u.is_active = true
  AND u.current_latitude IS NOT NULL
  AND ST_DWithin(
    ST_MakePoint(u.current_longitude, u.current_latitude)::geography,
    ST_MakePoint(:pickup_lng, :pickup_lat)::geography,
    :radius_meters
  )
ORDER BY distance_meters
LIMIT 10;
```

### 6.4 H3 Hexagonal Grid (Redis)

For real-time geo-indexing of driver locations:

| Parameter | Value | Notes |
|-----------|-------|-------|
| H3 Resolution | 7 | ~5.2km² cells — appropriate for Phalaborwa |
| Storage | Redis Sorted Sets | Key: `h3:driver:{cell}`, Score: timestamp |
| Update frequency | 10s (active ride), 15min (idle) | Battery-optimized |
| Query pattern | `ZRANGEBYSCORE` on cell + neighbors | Sub-ms lookup |

---

## 7. Data Retention Enforcement

### 7.1 Retention Schedule

| Data Category | Retention | Rationale | Enforcement Method |
|---------------|-----------|-----------|-------------------|
| User profiles (active) | Indefinite | Business need | — |
| User profiles (deleted) | 30 days soft delete → anonymise | POPIA | Scheduled job: `php artisan data:anonymise-deleted` |
| Ride records | 5 years | Tax + dispute | Scheduled job: `php artisan data:anonymise-rides` |
| Payment records | 7 years | SARS requirement | Scheduled job: `php artisan data:retire-payments` |
| Audit logs | 5 years | POPIA + business | Archive to cold storage after 5 years |
| Chat messages | 1 year | Dispute resolution | Scheduled job: `php artisan data:purge-chats` |
| GPS location data | 90 days | Operational need | Scheduled job: `php artisan data:anonymise-locations` |
| Driver documents | 5 years after closure | FICA | Scheduled job: `php artisan data:purge-documents` |
| Session tokens | Expiry + 30 days | Security | Sanctum pruning: `php artisan sanctum:prune-expired` |
| SOS alerts | 2 years | Safety compliance | Scheduled job: `php artisan data:purge-sos` |
| Webhook events | 90 days | Operational | Scheduled job: `php artisan data:purge-webhooks` |
| Notifications | 90 days | UX | Scheduled job: `php artisan data:purge-notifications` |
| Consent records | 5 years | POPIA | Never purge (legal requirement) |
| Marketing preferences | Until consent withdrawn or 5 years inactive | POPIA | Scheduled job: `php artisan data:purge-marketing` |

### 7.2 Anonymisation Strategy

For POPIA-compliant data erasure:

| Field | Anonymisation Method |
|-------|---------------------|
| name | Replaced with `User-{uuid-short}` |
| email | Replaced with `deleted-{uuid-short}@anonymised.local` |
| phone_number | Set to NULL |
| current_latitude/longitude | Set to NULL |
| Ride pickup/dropoff addresses | Replaced with `[REDACTED]` |
| Ride pickup/dropoff coordinates | Set to NULL |
| Payment gateway_reference | Retained (no PII) |
| Chat messages | Deleted entirely |

### 7.3 Scheduled Jobs

```php
// app/Console/Kernel.php — scheduled tasks
$schedule->command('data:anonymise-deleted')->dailyAt('02:00');
$schedule->command('data:purge-chats')->dailyAt('03:00');
$schedule->command('data:anonymise-locations')->dailyAt('04:00');
$schedule->command('data:purge-webhooks')->dailyAt('05:00');
$schedule->command('data:purge-notifications')->dailyAt('05:30');
$schedule->command('sanctum:prune-expired')->daily();
```

---

## 8. Validation Rules (Form Requests)

### 8.1 Critical Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| users.email | `required\|email\|max:255` | Valid email required |
| users.phone_number | `required\|regex:/^\+27[0-9]{9}$/` | SA phone format: +27XXXXXXXXX |
| users.password | `required\|string\|min:8\|confirmed` | Min 8 characters |
| rides.pickup_latitude | `required\|numeric\|between:-90,90` | Invalid latitude |
| rides.pickup_longitude | `required\|numeric\|between:-180,180` | Invalid longitude |
| rides.total_fare | `nullable\|numeric\|min:0` | Fare must be non-negative |
| payments.amount | `required\|numeric\|gt:0` | Amount must be positive |
| driver_profiles.id_number | `required\|regex:/^[0-9]{13}$/` | SA ID: 13 digits |
| kyc_verifications.document_number | `required\|string\|between:5,100` | Invalid document number |
| promo_codes.code | `required\|string\|uppercase\|alpha_num\|max:50` | Alphanumeric code only |
| food_orders.total_amount | `required\|numeric\|gt:0` | Amount must be positive |
| sos_alerts.latitude | `required\|numeric\|between:-90,90` | Invalid latitude |

---

## 9. Migration Strategy

### 9.1 Phase 0 Migrations (Immediate — Production Readiness)

| Migration | Tables | Type | Downtime |
|-----------|--------|------|----------|
| Add PII hash columns | users | Add columns | None |
| Add missing indexes (P0) | rides, users, payments | Add indexes | None |
| Add lockout fields | users | Add columns | None |
| Add idempotency_key | payments | Add column | None |
| Add CHECK constraints | wallets | Add constraints | None |
| Remove PII encryption (revert) | users | Alter columns | None |

### 9.2 Phase 1 Migrations (New Tables)

| Migration | Tables | Notes |
|-----------|--------|-------|
| scheduled_rides | New table | For advance booking |
| notification_templates | New table | Centralized notification content |
| user_documents | New table | Document storage metadata |
| bank_accounts | New table | Driver payout bank details |
| pool_rides + pool_passengers | Verify existing | Check migration exists |

### 9.3 Phase 2 Migrations (Spatial + Performance)

| Migration | Tables | Notes |
|-----------|--------|-------|
| PostGIS extension | System | `CREATE EXTENSION postgis` |
| Add spatial columns | rides, restaurants | GEOGRAPHY columns |
| Add GIST indexes | rides, restaurants | Spatial indexes |
| Add computed columns | rides | pickup_location, dropoff_location |

### 9.4 Phase 3 Migrations (Data Integrity)

| Migration | Tables | Notes |
|-----------|--------|-------|
| Add foreign key constraints | All tables | Enforce referential integrity |
| Add cascade rules | All FK columns | ON DELETE SET NULL / CASCADE |
| Add unique constraints | promo_code_redemptions | (promo_code_id, user_id) |

---

## 10. Entity Relationship Diagram (Text)

```
tenants ──┬── users ──┬── driver_profiles
          │           ├── vehicles
          │           ├── wallets ──── wallet_transactions
          │           ├── rides (as rider)
          │           ├── rides (as driver)
          │           ├── payments
          │           ├── in_app_notifications
          │           ├── push_tokens
          │           ├── consent_records
          │           ├── kyc_verifications
          │           ├── incident_reports
          │           ├── sos_alerts
          │           ├── referral_codes ──── referral_redemptions
          │           ├── user_documents
          │           └── notification_preferences
          │
          ├── rides ──┬── payments
          │           ├── ratings
          │           ├── deliveries
          │           ├── ride_status_histories
          │           ├── ride_chat_messages
          │           ├── sos_alerts
          │           ├── disputes
          │           ├── scheduled_rides
          │           └── pool_rides ──── pool_passengers
          │
          ├── promo_codes ──── promo_code_redemptions
          │
          ├── restaurants ──┬── restaurant_categories
          │                 ├── menu_items
          │                 └── food_orders ──── food_order_items
          │
          ├── system_settings
          ├── audit_logs
          ├── webhook_events
          ├── surge_zones
          ├── peak_hours
          ├── driver_payouts
          └── cash_reconciliations
```

---

## 11. Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Tech Lead | | | ☐ |
| DBA | | | ☐ |
| Security Officer | | | ☐ |
| Product Owner | | | ☐ |

---

*End of Phase 2*
