# EasyRyde — Driver Flows (Onboarding, Dispatch, Trip, Earnings)

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drills**: `../../docs/flow/02-driver/driver-user-flow.md`, `driver-system-flow.md`, `driver-data-flow.md`, `driver-integration-flow.md`, `driver-error-flow.md`

---

## 1. Driver Navigation Map (apps/driver)

```
AuthStack: Login | ForgotPassword
MainStack: Tabs
  ├─ Dashboard → DashboardScreen (online toggle, live map, pending ride banner)
  ├─ Requests  → RideRequestsScreen (15s offer countdown)
  ├─ Food      → FoodDeliveryScreen (available orders / my orders)
  ├─ Earnings  → EarningsScreen (today/week totals)
  ├─ Trips     → TripHistoryScreen
  └─ Profile   → ProfileScreen (vehicle modal, documents) → DocumentsScreen (KYC)
  Stack: ActiveRideScreen · ChatScreen · SupportScreen · FoodOrderDetailScreen
```

## 2. Driver Lifecycle (server-gated)

```
register profile+vehicle (POST /drivers/vehicle, PUT /drivers/profile)
   → KYC submit (POST /kyc/) → admin approve (is_approved=true, KYC approved)
   → toggle online (POST /drivers/toggle-online) → geo into Redis + status broadcast
   → receive ride:request on driver:{id} (15s window) → emit('driver:accept-ride')
   → POST /rides/{id}/driver-accept → driver_en_route
   → POST /rides/{id}/driver-arrived → POST /rides/{id}/start → ride in_progress
   → location stream: POST /drivers/location (30/min) + updateLocation on ride
   → POST /rides/{id}/complete → payout accrual (pending_balance)
   → no-show: POST /rides/{id}/no-show → fee
```

## 3. Dispatch & Matching (how offers reach drivers)

1. `POST /rides` → `RideService::createRide` (concurrent lock) → `requested`→`searching`
2. `MatchDriversJob` → `RideMatchingService::findNearbyDrivers` (radius `search_radius_km`, default 5.0; expands via `expandSearchRadius`)
3. `NewRideRequest` broadcast → `ride:{rideId}` + `driver:{driverId}` rooms (relayed via Redis pub/sub `laravel_database_*` → socket-server)
4. `DriverAcceptTimeoutJob` re-dispatches if unaccepted; `DriverArrivalMonitorJob` handles en-route timeouts; `RideTimeoutJob` cancels still-searching rides
5. `ride:claim:{id}` (SET NX EX 30) prevents double-accept

## 4. Background Location Pipeline

```
expo-task-manager (background-location-task)
  → POST /drivers/location (rate-limit 30/min)
  → UpdateDriverLocationJob / SyncDriverLocationsJob (every 5 min) sync Redis→users table
  → socket `driver:location-update` → ride:{id} room → rider map marker
  → ride_location_logs rows (speed, battery, is_spoofed) for anomaly review
```

## 5. Earnings & Payouts

| Stage | Mechanism |
|---|---|
| Per trip | `PaymentService` credits `pending_balance` (driver_payout = fare − platform fee − gateway fee) |
| Payout batch | `ProcessPayoutsBatchJob` daily 03:00/weekly → `PayoutService` → wallet debit + `DriverPayout` row |
| Manual | admin payout queue (`/admin/wallets/payout-queue`) approve → `ProcessPayoutJob` |
| Weekly summary email | `SendDriverEarningsSummariesJob` Mon 08:00 |
| Low balance alert | `SendLowBalanceAlertsJob` hourly to online drivers |

## 6. Driver-App Rules

- Offers are **socket-only** with local notification; 15s countdown then auto-expire (server re-dispatch).
- Driver can cancel while en-route; cancellation fee logic mirrors rider rules; `driver_cancel_reason` recorded.
- Multiple tabs can't accept the same ride — `ride:claim` lock server-side.
- Offline/socket-loss: driver sees `ReconnectionBanner`; active ride continues via REST poll fallback.

## References

- Dispatch robots: `../01-REQUIREMENTS/BACKLOG.md` (B-002 KYC) · Money: `PAYMENT-FLOWS.md`, `../02-DATA-MODEL/ENTITIES.md` §3
- Failure modes: `FAILURE-MODES.md` (F-DF-*) · RBAC gating: `../05-SECURITY/RBAC-MATRIX.md`