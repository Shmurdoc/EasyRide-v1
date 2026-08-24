# EasyRyde — Data Model (Entity Reference)

> **Segment**: 02-DATA-MODEL · **Status**: VERIFIED 2026-08-14 — 73 tables, matches `backend/database/migrations`  
> **Linked**: `RELATIONSHIPS.md` (graph), `MIGRATIONS.md` (schema history), `ENCRYPTION.md` (PII rules)

All models use **UUID primary keys** (`HasUuids`), `$keyType='string'`. PII fields use `text` type + `encrypted` casts (see ENCRYPTION).

---

## 1. Core Transaction Tables

### `users` (+soft deletes)
`id, tenant_id→tenants, name, email (unique), email_hash (unique, sha256), phone_number, phone_hash, password (hashed), role, is_active, is_online, is_approved, is_kyc_verified, kyc_verified_at, email_verified_at, current_latitude, current_longitude, last_location_update, current_ride_id, totp_secret (hidden), totp_enabled, failed_attempts, locked_until, preferred_language, date_of_birth, anonymized_at, deleted_at`
- Hidden: `password`, `remember_token`, `totp_secret` · Traits: HasApiTokens, HasRoles (spatie), HasTotp, EncryptsPii, Notifiable, SoftDeletes

### `rides` (38+ cols — the backbone)
`tenant_id, rider_id→users, driver_id→users(NULL), pickup/dropoff lat+lng+address, status (RideStatus enum), category (RideCategory), distance_km, duration_minutes, base_fare, per_km_fare, surge_multiplier, total_fare, estimated_fare_at_booking, promo_code_id, discount_amount, payment_method, payment_status, driver_eta, search_radius_km (default 5.0), route_polyline, status_history (json), fare_calculation_log (json), server_calculated_distance_km, server_calculated_duration_minutes, estimated_distance/fare/duration, rider_en_route_to_pickup, driver_notified_at, arrived_at, waiting_started_at, no_show_at, cancellation_requested_at, cancellation_request_reason, cancellation_fee, cancelled_by_system, cancelled_by, cancellation_reason, pickup/dropoff_notes, rider/driver_cancel_reason, started/completed/cancelled_at`
- Machine: `transitionTo()` + `VALID_TRANSITIONS` map; `isActive()`, `isTerminal()`

### `payments`
`ride_id, payer_id→users, payee_id, method (PaymentMethod), gateway, gateway_reference, amount, platform_fee, driver_payout, status (PaymentStatus), currency ZAR, gateway_response (json), paid_at, refunded_at, refund_reason, refund_amount, refunded_by, escrow_released, escrow_released_at, dispute_hold, dispute_hold_shortfall, held_until, idempotency_key (unique), cash_received, cash_discrepancy, cash_settled_at, cash_reconciled`

### `wallet_transactions`
`wallet_id→wallets, type (WalletTransactionType), amount, balance_before, balance_after, reference_type/reference_id (morph), description, gateway_reference`
- Job prunes daily (`model:prune`)

### `ratings` — `ride_id, rater_id, ratee_id, score (int), comment` — unique[ride_id, rater_id]

## 2. Identity & Compliance

| Table | Key fields | Notes |
|---|---|---|
| `tenants` | name, slug, domain, region, currency ZAR, is_active, settings(json) | multi-tenancy spine |
| `driver_profiles` | user_id (unique), ★license_number, license_expiry, ★id_number, ★date_of_birth, ★emergency_contact_name, ★emergency_contact_phone, is_verified, is_approved, approved_by, approved_at, total_trips, total_earnings, rating_sum, rating_count, last_location_update, last_known_lat/lng, years_of_driving_experience, languages_spoken | encrypted PII → text |
| `vehicles` | user_id, make, model, year, color, ★license_plate, category, is_active | |
| `kyc_verifications` | user_id, verification_type, document_type, document_number, document_front_path, document_back_path, selfie_path, status (pending/under_review/approved/rejected/expired), rejection_reason, verified_by, verified_at, expires_at, metadata | |
| `consent_records` | user_id, consent_type, consent_version, granted_at, revoked_at, ip_address, user_agent, metadata, consent_text | |
| `incident_reports` | reporter_id, ride_id, delivery_id, incident_type, severity, title, description, status (open/investigating/resolved/closed/escalated), assigned_to, resolution, resolved_at, evidence_paths(json), metadata | |
| `sos_alerts` | user_id, ride_id, lat/lng, location_description, status, severity, acknowledged_by, acknowledged_at, resolved_at, notes, location_accuracy, admin_response_time_seconds | |
| `trusted_contacts` | owner_id, name, phone_number, relationship, is_active | max 5/owner |
| `admin_audit_logs` | tenant_id(null), user_id, action, resource_type, resource_id, old_values(json), new_values(json), ip_address, user_agent | |
| `webhook_events` | gateway, event_type, payload(json), status, error_message, processed_at | |
| `bank_accounts` | user_id, bank_name, ★account_number, account_type, branch_code, account_holder_name, is_verified, is_primary | no model yet |
| `user_documents` | user_id, document_type, file_path, file_name, mime_type, file_size, status, rejection_reason, verified_by, verified_at | no model yet |

## 3. Money Ops

| Table | Key fields |
|---|---|
| `wallets` | user_id (unique), tenant_id, balance, pending_balance, currency, balance_snapshot, snapshot_at |
| `disputes` | ride_id, payment_id, raised_by, reason, description, status, resolved_by, resolved_at, resolution |
| `refund_requests` | payment_id, rider_id, amount, reason, status, admin_id, admin_notes, processed_at |
| `driver_payouts` | tenant_id, driver_id, amount, method, status, reference, notes, processed_at, period_start, period_end |
| `cash_reconciliations` | ride_id, driver_id, rider_id, payment_id, fare_amount, platform_fee, driver_earns, driver_marked_at, admin_reconciled_at, status, notes |
| `promo_codes` | tenant_id, code(unique), type, value, min_ride_amount, max_discount, max_uses, used_count, max_uses_per_user, ride_types(json), starts_at, expires_at, is_active |
| `promo_code_usages` | promo_code_id, user_id, used_at — unique[promo_code_id,user_id] |
| `promo_code_redemptions` | promo_code_id, user_id, ride_id, discount_amount, status (no model) |
| `referral_codes` | user_id, code(unique), is_active, usage_count, max_uses |
| `referral_redemptions` | referral_code_id, referrer_id, referred_id, bonus_amount (default 25), bonus_paid, completed_at |

## 4. Rides Sub-systems

| Table | Key fields | Purpose |
|---|---|---|
| `ride_status_histories` | ride_id, from_status, to_status, actor_id, reason | transition audit |
| `ride_location_logs` | ride_id, driver_id, lat/lng, accuracy_meters, speed_kmh, heading, battery_level, is_spoofed, spoof_reason, recorded_at | spoof/anomaly detection |
| `ride_chat_messages` | ride_id, sender_id, message, is_system, is_read, read_at | ride chat |
| `ride_feedback` | ride_id, user_id, feedback_type, description, requires_follow_up, status, reviewed_by, admin_notes, reviewed_at (no model) | |
| `delivery_proofs` | delivery_id, driver_id, proof_type, file_path, signature_path, notes, lat/lng, captured_at (no model) | |
| `pool_rides` | ride_id, driver_id, status (matching…), max_passengers(4), current_passengers, total_fare, route_polyline(json), rider_id | |
| `pool_passengers` | pool_ride_id, ride_id, user_id, fare_share, pickup_order, dropoff_order, status | |
| `scheduled_rides` | rider_id(null), driver_id, category, pickup/dropoff lat/lng/addr, scheduled_at, status, recurrence, estimated_fare, ride_id | |
| `deliveries` | tenant_id, ride_id, type, ★sender/recipient PII, pickup/dropoff lat/lng/addr, package_size, weight, estimated_value, requires_signature, is_fragile, status, payment_method/status, fare_amount, rider_id, driver_id, actual_distance_km, delivery_photo_path, delivery_note, picked_up_at, delivered_at | |

## 5. Food

| Table | Key fields |
|---|---|
| `restaurants` | tenant_id, name, slug(unique), description, image_url, phone, email, address, lat/lng, cuisine_type, price_range, delivery_fee, minimum_order, estimated_delivery_minutes, estimated_prep_time, is_active, is_featured, opens_at, closes_at, rating, rating_count, total_orders |
| `restaurant_categories` | restaurant_id, name, sort_order, is_active |
| `menu_items` | restaurant_id, category_id, name, description, price, image_url, is_available, is_active, is_vegetarian, is_vegan, is_gluten_free, spice_level, preparation_time_minutes, calories, sort_order |
| `food_orders` | tenant_id, restaurant_id, customer_id, driver_id, delivery_id, status, subtotal, delivery_fee, service_fee, tip_amount, total_amount, ★delivery_address, delivery lat/lng, delivery_notes, estimated/actual_delivery_at, cancelled_at/by/reason, payment_method/status, payment_id, rating, rating_comment |
| `food_order_items` | food_order_id, menu_item_id, name, price, quantity, special_instructions, line_total |

## 6. Notifications & Ops

| Table | Key fields |
|---|---|
| `push_tokens` | user_id, token(unique), platform, is_active, last_used_at |
| `in_app_notifications` | user_id, title, body, type, data(json), is_read, read_at, dedup_hash |
| `notification_preferences` | user_id(unique) + 9 booleans (push/email/sms/in_app × ride_updates/payment_updates/promotions/marketing/security_alerts) |
| `admin_notifications` | title, body, type, audience, user_id, sent_count, failed_count, status, sent_at, tenant_id |
| `system_settings` | tenant_id, key, value(text), description, type — unique[tenant_id,key] |
| `peak_hours` | tenant_id, name, day_of_week, start_time, end_time, multiplier, is_active |
| `surge_zones` | tenant_id, name, center_lat/lng, radius_meters(1000), multiplier, is_active |

## 6A. Conduct, Fleet & Parcel Ledger (design 2026-08-14 — see B-401…B-418)

| Table / Column | Notes |
|---|---|
| `driver_violations` (new) | tenant_id, driver_id, rider_id, ride_id, delivery_id, violation_type (cancel_after_pickup / cancel_near_dropoff / collusion_flag / parcel_* / other), fine_amount, status (pending→paid/waived/disputed), distance_to_dropoff_km, reason, evidence json, decided_by, decided_at — full map `ANTI-FRAUD-CANCEL-GUARD.md` §3 |
| `driver_profiles.fleet_type` (new col) | varchar(20) default `private` \| `easyryde` (employee) — admin-set, audit-logged |
| `deliveries` additions | status → `accepted`/`at_pickup`/`at_dropoff`; cancelled_by/at/reason, accepted_at, pod_photo_url, pod_photo_received_at, weight_tier; VALID_TRANSITIONS on model |
| `system_settings.options` (new col) | json — allowed values for new `enum` type (rides_pool_mode, food_pool_mode) |
| New settings | `fraud_fine_cancel_after_pickup=50`, `fraud_fine_cancel_near_dropoff=50`, `fraud_near_dropoff_radius_km=1.0`, `fraud_collusion_window_days=7`, `fraud_collusion_pair_cancels=3`, `fraud_unpaid_fines_block_rides=false`, `rides_pool_mode=both`, `food_pool_mode=both`, `parcel_weight_surcharge_per_kg=2`, `parcel_no_show_minutes=10`, `parcel_weight_check=false` |
| `wallet_transactions` | new `reference_type` values: `driver_fine`, `parcel_delivery_earnings` (no enum constraint on column — additive, verified safe) |

## 7. Tenant-Scoped Summary

Every operational table carries `tenant_id` except: pure-user-scoped (ratings, wallet_transactions, disputes, kycs mostly user-scoped), platform tables (users, audits), and food tables (tenant-scoped). **Rule**: new operational tables MUST include `tenant_id` and be indexed with it — the multi-tenant future depends on it (`10-BUSINESS/EXPANSION.md`).

## References

- Graph: `RELATIONSHIPS.md` · Schema history: `MIGRATIONS.md` · PII: `ENCRYPTION.md`
- Seeder fixtures: `../08-TESTING/API-TESTS.md` (seeders §11 of backend inventory)