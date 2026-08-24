# EasyRyde — Entity Relationships Map

> **Segment**: 02-DATA-MODEL · **Status**: VERIFIED 2026-08-14  
> **Linked**: `ENTITIES.md` (fields), `../05-SECURITY/POPIA-GDPR.md` (PII entities)

---

## 1. High-Level ER View

```
tenants 1─∞ users 1─1 driver_profiles       users 1─∞ rides (as rider) ──∞ ride_status_histories
                 ├─1 vehicles               users 1─∞ rides (as driver)──∞ ride_location_logs
                 ├─1 wallets 1─∞ wallet_transactions
                 ├─∞ push_tokens / in_app_notifications / notification_preferences
                 ├─∞ kyc_verifications / consent_records / trusted_contacts
                 ├─∞ referral_codes 1─∞ referral_redemptions
                 ├─∞ incidents (reporter/assigned_to) / sos_alerts
                 ├─1 bank_accounts / user_documents
                 └─∞ ratings (rater/ratee)

rides 1─0..1 payments 1─0..1 disputes      rides 1─0..1 deliveries 1─0..∞ delivery_proofs
       │           payments 1─0..∞ refund_requests
       ├─0..1 pool_rides 1─∞ pool_passengers (∞ rides)
       ├─0..1 scheduled_rides (→ creates ride)
       ├─∞ ride_chat_messages
       └─∞ promo_code_redemptions / ride_feedback (via promos)

restaurants 1─∞ restaurant_categories 1─∞ menu_items
restaurants 1─∞ food_orders 1─∞ food_order_items (∞ menu_items) ─1 payments / deliveries / users

tenants 1─∞ system_settings / promo_codes / peak_hours / surge_zones / driver_payouts
```

## 2. Relationship Table (model → belongsTo / hasMany)

| Model | Belongs to | Has many / has one |
|---|---|---|
| User | tenant | driverProfile(1), vehicle(1), ridesAsRider, ridesAsDriver, wallet(1), payments, consentRecords, kycVerifications, pushTokens, ratings(given/received), referralCodes, sosAlerts, trustedContacts, incidents |
| Tenant | — | users, rides, systemSettings, promoCodes, peakHours, surgeZones, driverPayouts |
| Ride | tenant, rider(User), driver(User) | payment(0..1), payments, rating(0..1), delivery(0..1), statusHistory, locationLogs, chatMessages, poolPassenger |
| DriverProfile | user | — |
| Vehicle | user | — |
| Wallet | user, tenant | transactions |
| WalletTransaction | wallet | reference (morph) |
| Payment | ride, payer(User), payee(User) | dispute(0..1) |
| PromoCode | tenant | usages, redemptions |
| Delivery | tenant, ride, sender(User), driver(User) | proofs |
| FoodOrder | tenant, restaurant, customer(User), driver(User), delivery, payment | items |
| FoodOrderItem | foodOrder, menuItem | — |
| MenuItem / RestaurantCategory | restaurant | — |
| Restaurant | tenant | menuItems, categories, foodOrders |
| PoolRide | ride, driver(User) | passengers |
| PoolPassenger | poolRide, ride, user | — |
| ScheduledRide | rider(User), driver(User), ride | — |
| ReferralCode / ReferralRedemption | user(s) | redemptions |
| KYC / Consent / SOS / Incident | user(s), ride, delivery | — |
| DriverPayout / CashReconciliation | driver, ride, rider | — |
| RideStatusHistory / RideLocationLog / RideChatMessage | ride, actor/driver/sender | — |

## 3. Polymorphic & Junction

| Type | Detail |
|---|---|
| Morph | `wallet_transactions.reference_type/reference_id` → Payment, Ride, Wallet::class etc. |
| Junction | `promo_code_usages` (promo×user), `referral_redemptions` (code×referrer×referred), `pool_passengers` (pool×ride×user) |
| Spatie | `roles`, `permissions`, `role_has_permissions`, `model_has_roles`, `model_has_permissions` (UUID morph keys) |

## 4. Integrity Rules (enforced/known)

| Rule | Enforcement |
|---|---|
| One active ride per rider/driver | `users.current_ride_id` + `rides` `isActive()` guard |
| Unique rating per ride/rater | DB unique + `RatingController` |
| Wallet balance never negative | `WalletService::deduct`/`hasSufficientFunds` + unit tests |
| Payment idempotency | unique `idempotency_key` + `ProcessPaymentJob` skip |
| Pool capacity | `PoolRide::hasCapacity()` (max 4) |
| Payout double-spend | `SettlementService::canProcessPayout` + `pending_balance` |
| Referral one-time | unique/validated in `ReferralService::applyReferral` |
| Trusted contacts ≤ 5 | `TrustedContactService::addContact` |
| No orphan rides w/o tenant | `tenant_id` FK cascade (except nullable admin audit logs) |

## 5. Cascade/Delete Policy Summary

- **Cascade**: user → profiles/vehicles/wallet/tokens/notifications/consents; tenant → settings/promos/peak/surge; ride → payments(checks)/ratings/history/location-logs/chat.
- **Set null**: ride.driver_id, payment.payee/refunded_by, delivery.ride_id/driver_id, scheduled_rides.ride_id.
- **Soft delete**: users (data retained for POPIA accounting; erasure via `DataRetentionService`).

## References

- Fields: `ENTITIES.md` · Migration DDL: `MIGRATIONS.md` · Graph: `../Absolute` graphify reports (`GRAPH_REPORT.md`, 2003 nodes/5241 edges)