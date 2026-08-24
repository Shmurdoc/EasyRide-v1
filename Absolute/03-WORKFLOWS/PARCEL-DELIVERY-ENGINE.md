# EasyRyde — Local Delivery Engine (Food ⇄ Parcel)

> **Segment**: 03-WORKFLOWS · **Status**: DESIGN — 2026-08-14 (verified against HEAD)  
> **Linked**: `FOOD-FLOWS.md`, `PAYMENT-FLOWS.md`, `ANTI-FRAUD-CANCEL-GUARD.md` (parity), `FLEET-POOL-MODES.md` (pool mode), `../02-DATA-MODEL/ENTITIES.md` (deliveries), `../01-REQUIREMENTS/BACKLOG.md` (B-410…B-414), `../04-QA-AUDIT/BACKEND-GAP-ANALYSIS.md` (G-16/G-17)

---

## 1. Positioning

One engine, two verticals — the food stack is the template (it already has orders, driver pull-accept, earnings credit, refund pipeline):

| | Food | Parcel (this design) |
|---|---|---|
| Order entity | `food_orders` | `deliveries` (**table already exists, `type='parcel'` default**, package columns) |
| Booking | restaurant checkout | sender books: pickup addr/point, dropoff addr, name/phone, weight, fragility, signature |
| Pricing | `restaurant.delivery_fee` | `fare_delivery_*` settings + weight tier surcharge |
| Pool | `food_pool_mode` | same `food_pool_mode` (shared vertical setting) |
| Fraud | (motorized) | R-P1/P2 parity rules (fraud engine) |

## 2. Verified state of `deliveries` (gaps G-16/G-17)

- Columns exist: `tenant_id, ride_id nullable, type='parcel', sender/recipient, pickup/dropoff lat/lng + addresses, package_size, package_weight_kg, estimated_value, requires_signature, is_fragile, payment_method, payment_status, fare_amount, status, picked_up_at, delivered_at, delivery_note` (+ encrypted PII cols 44-50).
- **No VALID_TRANSITIONS** (status `pending|picked_up|in_transit|delivered|failed|cancelled`, `DeliveryService::updateStatus` accepts anything), **no cancel endpoint, no fee, no refund, no driver earnings**, admin-only assign, driver status updates only.

## 3. Design

### 3.1 State machine (on `Delivery` model, mirror `Ride::VALID_TRANSITIONS`)

```
pending ──→ accepted ──→ at_pickup ──→ picked_up ──→ in_transit ──→ at_dropoff ──→ delivered
   │           │            │             │                              │
   └─ cancelled (pending|accepted|at_pickup only; refund if paid)      failed (in_transit|at_dropoff)
```
- `cancelled_by/cancelled_at/cancellation_reason`, `accepted_at`, `pod_photo_url`, `pod_photo_received_at`, `weight_tier` columns (B-410).
- `DeliveryStatus` enum sync (OpenAPI already documents `assigned` — align enum to `pending,accepted,at_pickup,picked_up,in_transit,at_dropoff,delivered,failed,cancelled`, regenerate spec B-414).

### 3.2 Pricing (B-410)

`FareCalculationService` (cached-less reads, keys `fare_delivery_*`) + new setting `parcel_weight_surcharge_per_kg` (number, default 2) and `parcel_min_fare` reuse of `fare_delivery_minimum`:
`fare = base + (km × fare_delivery_per_km_rate) + max(0, (weight_kg − 1) × surcharge)` — computed at booking, stored in `fare_amount`.

### 3.3 API surface (B-411) — all tenant-scoped, `auth:sanctum`

| Route | Role | Notes |
|---|---|---|
| `POST /api/v1/parcels` | rider | book; validates weight ≤ 30 kg, fragile/signature flags, payment_method (cash|wallet|gateways via `PaymentRouter`); `fare_amount` server-computed |
| `GET /api/v1/parcels` · `GET /api/v1/parcels/{delivery}` | rider | own only |
| `POST /api/v1/parcels/{delivery}/cancel` | rider | only `pending|accepted|at_pickup`; paid → `processRefund` pattern (`FoodOrderService.php:318-357`); frees driver |
| `GET /api/v1/driver/parcels` | driver | available = `driver_id NULL ∧ status∈(pending,accepted)` + `food_pool_mode` + no unpaid-fine block + 15 km radius (food convention 298-301) |
| `POST /api/v1/driver/parcels/{delivery}/accept` | driver | sets driver_id, `accepted_at`, status=accepted; dual-vertical guard vs `current_ride_id` (FLEET-POOL §3.3) |
| `PATCH /api/v1/driver/parcels/{delivery}/status` | driver | `at_pickup→picked_up→in_transit→at_dropoff→delivered`; **`delivered` requires `pod_photo_url`** (photo upload via existing `storage` route) |
| `GET /admin/parcels` · `POST /admin/parcels/{id}/assign` · `POST /admin/parcels/{id}/dispute` | admin | mirror food admin conventions |
| `POST /api/v1/parcels/{delivery}/status` (rider track) | rider | read-only status + driver live loc (socket room pattern reuse — "parcel-{id}") |

### 3.4 Money

- Delivery fee+earnings: on `delivered` → `WalletService::credit(driver, fare_amount, reference_type='parcel_delivery_earnings')` (mirror `creditDriverEarnings` 370-391).
- Capture: paid via wallet → `deduct` at booking; `payment_status='captured'` on complete (stripe/payfast/ozow intent patterns from food/payment flows). Cash: `cash_reconciliations` reuse.
- Cancellation refund only for captured payments (food pattern). No-show: driver may `failed` after grace `parcel_no_show_minutes` (setting, default 10) with sender refund.
- Escrow for driver share optional (per-vertical reuse of `EscrowService` — decision gate B-410).

### 3.5 Fraud parity (R-P1/P2, engine doc §2)

- P1: driver cancel after `picked_up_at` → `parcel_cancel_after_pickup` violation + fine.
- P2: driver cancel near dropoff (≤ `fraud_near_dropoff_radius_km`, haversine parcel lat/lng vs delivery dropoff) → `parcel_cancel_near_dropoff`.
- POD enforcement = anti-theft: no photo, no `delivered`, no payout (F-PR-02).

### 3.6 POL/ops

- Sockets: parcel tracking reuses `socket-server` room events (`parcel:{id}:status`, driver location streaming already generic).
- Notifications: sender on `picked_up` + `delivered`; driver on assignment (existing notifier).
- OpenAPI regenerate (B-414) — H-002 rule: parity check in CI.

## 4. Failure modes (register F-PR-*)

| ID | Mode | Control |
|---|---|---|
| F-PR-01 | Phantom booking spam | booking throttle (ride-cancel pattern 5/min) + wallet proof for >R200 cargo |
| F-PR-02 | POD missing → fake "delivered" | hard gate + admin override w/ audit |
| F-PR-03 | Driver claims `failed` to pocket goods | failed requires admin confirm or sender-conflict 24 h window |
| F-PR-04 | Weight fraud (underdeclare) | booking weight vs driver-scale photo optional B-416 |

## 5. Tests (B-414)

`ParcelDeliveryTest`: state-machine legality matrix (allowed/forbidden transitions) · book-pricing (3 weight tiers × km) · accept dual-vertical guard · deliver-requires-POD · driver earnings credit on delivered · rider cancel+refund (paid/unpaid) · pool-mode filter on `getAvailableParcels` · fraud R-P1/P2 · admin assign/dispute. Arrange pattern: `FoodDeliveryTest` (Tenant/Restaurant factories + Sanctum), new `Parcel` factories.

## References

- Patterns: `FOOD-FLOWS.md`, `PAYMENT-FLOWS.md`, `../02-DATA-MODEL/ENTITIES.md` (deliveries) · Gaps G-16/G-17: `../04-QA-AUDIT/BACKEND-GAP-ANALYSIS.md` · Backlog B-410…B-417 · Umbrella: `/home/madoc-hp/Documents/PHBIMH/Absolute/SEG-14-LOCAL-DELIVERY-ENGINE.md`