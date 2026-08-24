# EasyRyde — Business Domain Architecture

> **Segment**: 10-BUSINESS · **Status**: REFRESHED 2026-08-14 (verified against fat seeders: `platform_fee_percent=15`, WELCOME10/FIRSTFREE promos, 24 system settings)  
> **Linked**: `../03-WORKFLOWS/PAYMENT-FLOWS.md` (money mechanics), `../02-DATA-MODEL/ENTITIES.md` (ledgers), `ADVERTISING.md`, `EXPANSION.md`

---

## 1. Revenue Model (verified state)

| Revenue stream | Mechanics in code | Status |
|---|---|---|
| Ride commission | `platform_fee_percent` = **15%** default (system_settings, cached by `PlatformFeeService`; fee on `payments.platform_fee`) | LIVE |
| Surge pricing | `SurgeZone` (radius × multiplier) + `PeakHour` (day/time × multiplier), capped `max_surge_multiplier` 2.5 via settings; applied in `FareCalculationService` | LIVE |
| Cancellation / no-show fees | `CancellationService` (fee consts; `rides.cancellation_fee`, no-show path) | LIVE |
| Delivery + service fees (food) | `deliveries.fare_amount`, `food_orders.delivery_fee/service_fee` | LIVE |
| Wallet float | deposits in `wallets,balance` (platform holds float); driver `pending_balance` + payouts | LIVE |
| Promo funding (vendor-paid) | `promo_codes` CRUD + redemption ledger | PN |
| Driver premium tier (lower commission) | `18` `system_settings` fare table per category exists; tier switch would tap settings | PLAN |
| In-app advertising | `advertisements` table planned | PLAN → ADVERTISING.md |
| Partner API licensing | `PartnerApiService` + PHBIMH webhooks (order delegation) | LIVE-B2B |
| Referrals | `referral_codes`, bonus R25 default | LIVE |

## 2. Business Ledger Entities (money-critical)

| Table | Role in business |
|---|---|
| `payments` | every earned ZAR: amount, platform_fee, driver_payout, escrow/dispute state |
| `wallet_transactions` | immutable double-entry-ish ledger (balance_before/after, ref morph) |
| `driver_payouts` | driver payouts (batch daily/weekly, manual queue) |
| `cash_reconciliations` | cash rides: driver-marked vs platform-expectation vs admin verdict |
| `refund_requests` | refund pipeline with admin approval |
| `promo_code_redemptions` + `promo_code_usages` | promo liability tracking |
| `referral_redemptions` | referral liability (bonus_paid flag) |
| `admin_audit_logs` | every admin money action (refund/payout/reconcile) |

## 3. Business Rule Constants (system_settings — seed baseline)

| Key | Value |
|---|---|
| platform_fee_percent | 15 |
| driver_search_radius | 5.0 km |
| max_surge_multiplier | 2.5 |
| fare tables (per category: standard/premium/minivan/pets/delivery) | base_fare, per_km, per_min |
| default_latitude/longitude | -23.9468 / 29.4726 |
| currency | ZAR · timezone Africa/Johannesburg |

## 4. Expansion Tables (planned, schema-ready)

`business_rides` (branded rides) · `advertisements` + `ad_placements` · `driver_subscriptions` · `restaurant_subscriptions` · `fleet_vehicles` · `tenant_analytics` — full field sketches in `EXPANSION.md` + v1 of this doc (kept in git history).

## 5. Rules for Business-Logic Changes

1. Any fee change = settings change, not code change (`system_settings` typed values + cache bust).
2. Money flows must produce a `wallet_transaction` row (auditable path).
3. Promo/referral liability tracked to the cent (`promo_code_redemptions`, `referral_redemptions`).
4. Business expansion must stay tenant-scoped (tenancy rule, `../02-DATA-MODEL/ENTITIES.md` §7).

## References

- Money flows: `../03-WORKFLOWS/PAYMENT-FLOWS.md` · Data: `../02-DATA-MODEL/ENTITIES.md` · Expansion: `EXPANSION.md` · Ads: `ADVERTISING.md`