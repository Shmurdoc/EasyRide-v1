# EasyRyde — Rider Flows (Ride Booking, Tracking, Payment, Food)

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drills**: `../../docs/flow/01-rider/rider-user-flow.md`, `rider-system-flow.md`, `rider-data-flow.md`, `rider-integration-flow.md`, `rider-error-flow.md`

---

## 1. Rider Navigation Map (apps/rider)

```
AuthStack (no token): Login → ForgotPassword | Register
MainStack (token):    Tabs
                       ├─ Home      → HomeScreen (map, pickup/dropoff, quick actions)
                       ├─ Food      → RestaurantListScreen
                       ├─ Activity  → RideHistoryScreen → RideDetailScreen
                       └─ Profile   → ProfileScreen (wallet, promo, support, settings)
                     Stack screens: BookRideScreen → RideTrackingScreen → PaymentScreen → RatingScreen
                     ConsentScreen (gate) · ChatScreen · WalletScreen · PromoCodeScreen
                     NotificationScreen · RestaurantMenuScreen → FoodCheckoutScreen → FoodOrderTrackingScreen
```

## 2. Ride Booking Flow (happy path)

```
1 HomeScreen: set pickup/dropoff (places.search / saved PHALABORWA_LOCATIONS)
2 BookRideScreen: fare-estimate → choose vehicle (standard/premium/minivan/pets) → confirm
3 POST /rides → 201 ride{status:requested} → RideTrackingScreen (join room ride:{id})
4 socket `ride:request` → driver accepts → ride:accepted (driver_assigned → accepted)
5 driver:arrived on socket → UI shows arrival
6 ride:started → in_progress (live map: driver marker + polyline via OSRM)
7 ride:completed → PaymentScreen (choose cash/wallet/payfast/ozow; tip) → rides.rate → receipt
```

**State machine (server truth)**:
`requested → searching → driver_assigned → accepted → driver_en_route → arrived → waiting_for_rider → in_progress → near_drop_off → completed` · lateral: `→ cancellation_requested → cancelled` · `→ no_show`
(Transitions enforced via `Ride::transitionTo()` + `VALID_TRANSITIONS`.)

## 3. Functionality Routes (endpoint map)

| Screen | API calls | Socket |
|---|---|---|
| Home | `GET /rides/current`, `GET /rides`, `GET /config` | join rooms as needed |
| BookRide | `GET /places/search`, `GET /rides/fare-estimate`, `POST /rides` | — |
| RideTracking | `GET /rides/{id}`, `POST /rides/{id}/cancel`, `POST /rides/{id}/rate` | `ride:*` events; `emit('ride:track')` |
| Payment | `POST /payments/rides/{id}/pay` → uses `redirect_url`/`client_secret` | `payment:complete` |
| Wallet | `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/deposit` | — |
| Promo | `POST /promo-codes/validate`, `POST /rides/{id}/apply-promo` | — |
| Chat | — | `joinRoom('ride:{id}')`, `chat:send` |
| Notification | `GET /notifications`, `POST /notifications/{id}/read`, `unread-count`, `read-all` | `ride:request` silent nav |
| Food | `GET /food/restaurants{/id}{/menu}`, `POST /food/restaurants/{id}/order`, `GET /food/orders`, `POST /food/orders/{id}/cancel|rate` | `food-order:status` |
| SOS | `POST /sos/`, `POST /sos/{id}/cancel` | alert escalation |

## 4. Offline / Degraded Behavior

- GETs cached 5 min (`AsyncStorage @easyryde_cache:`); mutations queued (`offlineQueue.ts`) and flushed on reconnect; `OfflineBanner`/`ReconnectionBanner` UIs; 30s poll fallback on active ride when socket stalls.

## 5. Rider Cancel & No-Show Rules

| Path | Fee | Notes |
|---|---|---|
| Rider cancel post-assignment | per `CancellationService::calculateFee` | `cancellation_requested` w/ reason; driver may confirm/reject |
| System timeout `searching` >30min | none | `CleanupStaleRidesJob`, `RideTimeoutJob` |
| No-show (driver marked, 5+ min wait) | `CancellationService::calculateNoShowFee` | `rider_en_route_to_pickup` guards |

## 6. Consensus Reminders

- Server computes fare/distance/duration itself (`server_calculated_*`, `fare_calculation_log`) — client inputs never set price.
- Payment success is confirmed by gateway webhook, not by the app.

## References

- Failure register: `FAILURE-MODES.md` (codes F-RB-*) · Auth: `AUTH-FLOWS.md` · Payments: `PAYMENT-FLOWS.md`
- API: `../../docs/api/openapi.yaml` `/rides/*`