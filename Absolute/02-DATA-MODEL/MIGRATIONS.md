# EasyRyde — Migration History & Schema Evolution

> **Segment**: 02-DATA-MODEL · **Status**: VERIFIED 2026-08-14 — 73 migration files → 73 tables  
> **Linked**: `ENTITIES.md` (final state), `RELATIONSHIPS.md` (FKs), `../07-INFRASTRUCTURE/DOCKER-ARCH.md` (migrate in deploy)

---

## 1. Evolution Waves (big picture)

| Wave | Migrations | Theme |
|---|---|---|
| Framework (1–3) | users, cache, jobs | Laravel baseline |
| Tenancy + auth (4–7) | spatie permissions, Sanctum tokens, tenants, users extension | multi-tenant spine |
| Core domain (8–22) | driver profiles, vehicles, rides, ratings, wallets, payments, settings, promos, audit logs, deliveries, disputes, payment infra | rides+payments v1 |
| Notifications + advanced (23–33) | push/in-app, delivery_proofs, scheduled rides, referrals, SOS, chat, consent/KYC/incidents, restaurants/menu, food orders, cash reconciliation, refund requests, driver payouts | food, safety, money ops |
| Production hardening (34–39) | is_approved, max_discount, indexes, webhook_events, TOTP, PII key-change flips | security/scale |
| Scale + compliance (40–53) | tenant on payouts, payment on reconciliation, PII search hashes, lockout, status history, idempotency, dedup notifications, location tracking, snapshots, perf indexes, ride_type, audit indexes, peak hours, surge zones | POPIA + performance |
| Advanced rides (54–59) | pool rides/passengers, ride status histories, per-user promo limits | pool/compliance |
| Lifecycle + ops (60–69) | ride lifecycle cols, gateway refs, admin notifications, notification prefs, missing tables (bank_accounts, user_documents, promo_code_redemptions, ride_feedback), phase-b fields (estimated rides, languages), trusted contacts, phase-d indexes | ops readiness |
| Final (70–73) | widen encrypted cols → text, ride location logs + server-calc fare fields, scheduled rides rider nullable, delivery geo cols | PCI/POPIA correctness |

## 2. Ordered Migration List (verify order with `ls backend/database/migrations`)

```text
0001_01_01_000000_create_users_table                → users, password_reset_tokens, sessions
0001_01_01_000001_create_cache_table                → cache, cache_locks
0001_01_01_000002_create_jobs_table                 → jobs, job_batches, failed_jobs
2026_05_26_232350_create_permission_tables          → spatie roles/permissions (uuid morph)
2026_05_26_232350_create_personal_access_tokens     → personal_access_tokens
2026_05_27_000001_create_tenants_table              → tenants
2026_05_27_000002_extend_users_table                → users += tenant_id, phone, role, geo, soft deletes
2026_05_27_000003_create_driver_profiles_table      → driver_profiles
2026_05_27_000004_create_vehicles_table             → vehicles
2026_05_27_000005_create_rides_table                → rides v1
2026_05_27_000006_create_ratings_table              → ratings
2026_05_27_000007_create_wallets_table              → wallets
2026_05_27_000008_create_wallet_transactions_table  → wallet_transactions
2026_05_27_000009_create_payments_table             → payments v1
2026_05_27_000010_create_system_settings_table      → system_settings
2026_05_27_000011_create_promo_codes_table          → promo_codes
2026_05_27_000012_create_admin_audit_logs_table     → admin_audit_logs
2026_05_27_000013_create_deliveries_table           → deliveries v1
2026_06_01_000001_add_missing_fields_to_deliveries  → sender_id, driver_id, item_info, fare
2026_06_01_000002_add_missing_fields_to_payments_and_rides → payee_id, driver_payout; promo/discount on rides
2026_06_01_000003_add_tenant_id_to_wallets_fix_cancelled_by → wallet tenant_id; widen cancelled_by
2026_06_01_000004_create_payment_infrastructure_tables → disputes + payment escrow/refund cols
2026_06_01_000005_create_notification_tables        → push_tokens, in_app_notifications
2026_06_01_000006_create_advanced_feature_tables    → proofs, scheduled, referrals, sos, chat
2026_06_01_000007_create_compliance_tables          → consents, kyc, incidents + user kyc cols
2026_06_01_100001_create_restaurants_menu_tables    → restaurants, categories, menu_items
2026_06_01_100002_create_food_orders_tables         → food_orders, food_order_items
2026_06_09_000001_add_route_polyline_to_rides       → polyline, cancellation_reason
2026_06_09_000002_encrypt_pii_columns               → data migration: encrypt users email/phone
2026_06_17_000001_add_held_until_to_payments        → escrow hold window
2026_06_17_000002_create_cash_reconciliations_table → cash_reconciliations
2026_06_17_000003_create_refund_requests_table      → refund_requests
2026_06_17_000004_create_driver_payouts_table       → driver_payouts
2026_06_17_100001_add_is_approved_to_users          → is_approved
2026_06_17_100002_add_max_discount_to_promo_codes   → max_discount
2026_06_18_000001_add_production_indexes            → rides/users/payments idx
2026_06_18_000002_create_webhook_events_table       → webhook_events
2026_06_18_000003_add_totp_to_users                 → totp_secret, totp_enabled
2026_06_21_000001_remove_pii_encryption_from_users  → decrypt users email/phone (reversed decision)
2026_06_25_000001_add_tenant_id_to_driver_payouts   → tenant on payouts
2026_06_26_000001_add_payment_id_to_cash_reconciliations → payment link
2026_06_28_000000_add_pii_search_hashes             → email_hash (unique), phone_hash
2026_07_01_000001_add_lockout_fields_to_users       → failed_attempts, locked_until
2026_07_01_000020_add_status_history_to_rides       → status_history json
2026_07_01_000021_add_idempotency_key_to_payments   → idempotency_key (unique)
2026_07_01_000022_add_unique_constraint_to_ratings  → unique[ride_id, rater_id]
2026_07_01_000023_add_deduplication_to_notifications → dedup_hash
2026_07_01_000024_enhance_driver_location_tracking  → profile geo tracking
2026_07_01_000025_add_balance_snapshot_to_wallets   → balance_snapshot, snapshot_at
2026_07_01_000026_add_performance_indexes           → hottest query idx
2026_07_01_000027_add_ride_type_to_rides            → ride_type
2026_07_01_000028_add_indexes_to_audit_log_table    → audit idx
2026_07_01_100001_create_peak_hours_table           → peak_hours
2026_07_01_100002_create_surge_zones_table          → surge_zones
2026_07_01_100003_make_tenant_id_nullable_on_admin_audit_logs → tenant nullable
2026_07_01_200001_create_pool_rides_table           → pool_rides
2026_07_01_200002_create_pool_passengers_table      → pool_passengers
2026_07_01_300001_create_ride_status_histories_table → ride_status_histories
2026_07_01_300003_add_per_user_limits_to_promo_codes → promo_code_usages + max_uses_per_user
2026_07_04_000001_add_ride_lifecycle_columns_to_rides → 14 lifecycle cols (fee, no-show, ETA…)
2026_07_04_000002_add_gateway_reference_to_wallet_transactions → gateway_reference
2026_07_04_000003_create_admin_notifications_table → admin_notifications
2026_07_04_000004_create_notification_preferences_table → 9 prefs
2026_07_08_000001_create_missing_tables_and_indexes → bank_accounts, user_documents, promo_code_redemptions, ride_feedback + idx
2026_07_08_000002_add_missing_fields_phase_b       → estimates, notes, languages, prep time, sos metrics, consent_text
2026_07_08_000003_create_trusted_contacts_table     → trusted_contacts
2026_07_08_000004_add_missing_indexes_phase_d       → rider/delivery idx, pool rider
2026_07_08_000005_add_delivery_note_to_deliveries   → delivery_note
2026_07_17_000001_add_remaining_composite_indexes   → driver/ride/payment/notification composite idx
2026_07_18_023230_widen_encrypted_columns           → encrypted cols → text (200+ chars)
2026_07_19_000001_create_ride_location_logs_table   → location logs + server-calc fare fields
2026_07_19_000002_make_scheduled_rides_rider_id_nullable → scheduled rides rider nullable
2026_07_19_000003_add_geo_columns_to_deliveries_table → delivery pickup/dropoff lat/lng
```

## 3. Rules for New Migrations

1. **Every new operational table gets `tenant_id`** (multi-tenant future — see ENTITIES §7).
2. **Encrypted columns are `text`** — never VARCHAR (encrypted strings are 200+ chars; migration #70 fixed the historical violation).
3. **Idempotent migrations**: recent ones use `schema` guards (e.g. #44/#46 re-add indexes) — copy that pattern when re-touching shared tables.
4. **Data migrations** (PII encrypt/decrypt) are reversible and keyed via `APP_PREVIOUS_KEYS` for rotation — never drop secrets before down-path.
5. Index heat map (already applied): `rides[status],[rider_id,status],[driver_id,status],[rider_id,created_at],[driver_id,created_at]`, `payments[payer_id,status]`, `wallet_transactions[wallet_id,created_at]`, `in_app_notifications[user_id,is_read,created_at]`.
6. Tests run against `easyryde_test` (PostgreSQL) — new migrations must be PG-compatible (no MySQL-only syntax).

## References

- Final schema fields: `ENTITIES.md` · Keys/cascades: `RELATIONSHIPS.md` · PII rules: `ENCRYPTION.md`