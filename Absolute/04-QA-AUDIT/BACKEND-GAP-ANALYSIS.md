# EasyRyde — Backend Gap Analysis (API ↔ Client)

> **Segment**: 04-QA-AUDIT · **Status**: VERIFIED 2026-08-14 (routes from `backend/routes/api.php`, clients from `mobile/packages/shared/src/api/`)  
> **Linked**: `../01-REQUIREMENTS/BACKLOG.md` (B-101), `../08-TESTING/API-TESTS.md`

---

## 1. API Surface Summary

| Group | Count (approx) | Consumed by |
|---|---|---|
| Public (health/config/auth/places/fare/webhooks) | 20 | all clients + gateways |
| Ride + driver lifecycle | ~30 | rider/driver apps + socket-server |
| Payments/wallet | ~15 | rider app, admin |
| Food | ~16 | rider/driver apps, admin |
| Admin (dashboard/manage/compliance/wallets/reports) | ~65 | admin web + Expo admin |
| Compliance (kyc/consent/incidents/data/pool/referrals/sos/chat/scheduled) | ~45 | partial clients |
| Inspector | 4 | Expo admin |

## 2. Direction A — Backend endpoints with NO mobile client consumer

| Endpoint(s) | Reason | Priority |
|---|---|---|
| `POST /wallet/confirm`, `/wallet/withdraw` (confirm path) | client calls deposit; confirm missing | P2 |
| `POST /payments/stripe/create-intent`, `/confirm` | client does not do intent flow (WebView/redirect only) | P2 |
| `POST /payments/{id}/refund|dispute` | admin-only correct; mobile admin lacks | P2 |
| `GET/POST /scheduled-rides/*` | no UI (B-103) | P1 |
| `/referrals/*` | no UI (B-105) | P1 |
| `/pool/*`, `/driver/pool/*` | no UI (B-104) | P1 |
| `/incidents/*` (user submit + my) | no UI | P2 |
| `/data/export|anonymize|erasure` | no UI (POPIA self-service) | P2 |
| `/chat/rides/{ride}/messages|unread|read` | socket-only client | P2 |
| `/admin/totp/*` | web admin uses header; Expo admin no TOTP flow | P1 |
| `/driver/food/orders/*` restaurant list, `restaurant/food/orders` | restaurant SPA missing (admin-panel only) | P2 |

## 3. Direction B — Client calls with no backend match (verified none outstanding)

Full client endpoint inventory (§5b backend audit) matches `api.php` after accounting for:
- `POST /rides/{id}/cancel/confirm|reject` (client `useActiveRide`) → backend exposes `cancellation_requested→confirm/reject` via `POST /rides/{id}/cancel` with params (equivalent, not 404).
- `GET /drivers/earnings|trips|stats|nearby-rides` → all exist (`DriverController`).
- Food client endpoints incl. `/driver/food/orders/available` → exists.
- Admin app endpoint `/admin/manage/kyc/stats`, bulk-approve → exists.

**Verdict: no dead client endpoints found at audit date.**

## 4. OpenAPI Drift (docs/api/openapi.yaml — 215 paths)

| Route | In API | In OpenAPI |
|---|---|---|
| `GET /admin/stats` | ✅ | ❌ |
| `GET /restaurants` (alias) | ✅ | ❌ |
| `GET /food-orders` (alias) | ✅ | ❌ |
| `GET /pool-rides` (alias) | ✅ | ❌ |
| latest `admin/manage/*` additions | ✅ | partial |

→ B-005/B-108: regenerate openapi from routes (or add 4 paths) and add a CI parity check.

## 5. Webhook Consumers (no client app involved)

PayFast/Ozow/Stripe/Twilio/PHBIMH — verified IP whitelist + signature handling; `WebhookEvent` persistence; k6 security scenarios cover forgery attempts (`load-tests/security/webhook-forgery.js`).

## 6. Conduct / Fleet / Parcel Gaps (audited 2026-08-14 — designs in 03-WORKFLOWS)

| # | Gap | Evidence | Fix |
|---|---|---|---|
| G-12 | **`cancellation_fee` never charged** — computed (R15-R35, no-show R25) but no wallet debit/payout offset anywhere | grep `cancellation_fee` → only Ride/Service/Admin PricingUpdateRequest | B-404/B-418 debt ledger |
| G-13 | **Fare-key mismatch** — seeder writes `fare_standard_base`; runtime reads `fare_standard_base_fare` | `DatabaseSeeder.php:158-177` vs `FareCalculationService.php:121-140` | B-402 align + regression |
| G-14 | **Settings cache not busted on admin write** (`AdminController::updateSettings`) | only PlatformFeeService forgets its own key | B-402 SettingService |
| G-15 | **Dispatch eligibility divergent** — `RideMatchingService::findNearbyDrivers` lacks `is_approved` vs `RideService` version; food availability lacks radius/filters | 27-46 vs 151-175; 213-221 | B-407 unified FleetModeService |
| G-16 | **`deliveries` has no state machine, no fees, no refunds, no earnings** | `DeliveryService::updateStatus` accepts anything; no cancel route | B-410…B-414 parcel engine |
| G-17 | **Cross-vertical conflict** — `FoodOrderService::acceptOrder` hijacks `current_ride_id` with no dual-vertical guard | 155-178 | B-408 guard + test |

## References

- Client inventory: mobile shared `api/index.ts` + `api/foodDelivery.ts` · Route truth: `backend/routes/api.php` (467 lines) · Gap backlog: `../01-REQUIREMENTS/BACKLOG.md`