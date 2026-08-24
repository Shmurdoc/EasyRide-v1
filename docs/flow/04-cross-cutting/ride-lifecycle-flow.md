# Ride Lifecycle Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

The ride lifecycle is the core business flow. From rider request to completion, every state transition, API call, socket event, and validation rule.

---

## 2. Ride State Machine

```
                    ┌─────────────┐
                    │  PENDING    │
                    │ (searching) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ ACCEPTED │ │CANCELLED │ │ EXPIRED  │
        │          │ │(by rider)│ │(no driver│
        └────┬─────┘ └──────────┘  found)   │
             │                       └──────────┘
        Driver arrives
             │
        ┌────▼─────┐
        │ ARRIVED  │
        │(at pickup)│
        └────┬─────┘
             │
        Trip starts
             │
        ┌────▼─────┐
        │IN_PROGRESS│
        │ (on trip) │
        └────┬─────┘
             │
     ┌───────┼───────┐
     ▼       ▼       ▼
┌─────────┐ ┌──────────┐
│COMPLETED│ │CANCELLED │
│         │ │(by either)│
└─────────┘ └──────────┘
```

### Valid State Transitions

| From | To | Trigger | Actor |
|------|----|---------|-------|
| `pending` | `accepted` | `driver:accept-ride` | Driver |
| `pending` | `cancelled` | `ride:cancel` | Rider |
| `pending` | `expired` | `rides:expire-stale` (60s) | System |
| `accepted` | `arrived` | `driver:arrived` | Driver |
| `accepted` | `cancelled` | `ride:cancel` | Either |
| `arrived` | `in_progress` | `ride:start` | Driver |
| `arrived` | `cancelled` | `ride:cancel` | Either |
| `in_progress` | `completed` | `ride:complete` | Driver |
| `in_progress` | `cancelled` | `ride:cancel` | Either |

---

## 3. End-to-End Flow

### 3.1 Ride Request (Rider → System)

```
Rider taps "Request Ride"
    │
    ├──▶ Validate inputs:
    │    ├── Pickup coordinates valid
    │    ├── Dropoff coordinates valid
    │    ├── Pickup != dropoff
    │    ├── Vehicle category selected
    │    └── Payment method selected
    │
    ├──▶ Calculate fare:
    │    ├── Base fare by category
    │    ├── Distance fare (OSRM → Haversine fallback)
    │    ├── Time fare
    │    ├── Surge multiplier (demand/supply + peak hours + zones)
    │    ├── Promo code discount (if applied)
    │    └── Minimum fare enforcement
    │
    ├──▶ POST /rides/
    │    {
    │      pickup_latitude, pickup_longitude,
    │      dropoff_latitude, dropoff_longitude,
    │      pickup_address, dropoff_address,
    │      category, payment_method,
    │      base_fare, distance_fare, time_fare,
    │      surge_multiplier, total_fare
    │    }
    │
    ├──▶ Backend creates Ride record:
    │    ├── status: "pending"
    │    ├── rider_id: authenticated user
    │    └── Save to database
    │
    ├──▶ Emit via Socket.IO:
    │    rider:book-ride → broadcast to nearby drivers
    │
    └──▶ Navigate to RideTrackingScreen
```

### 3.2 Driver Matching

```
Socket server receives rider:book-ride
    │
    ├──▶ Find nearby drivers:
    │    ├── Redis GEOSEARCH driver:location
    │    │   BYRADIUS {radius}m ASC
    │    ├── Filter: is_online = true
    │    ├── Filter: is_approved = true
    │    ├── Filter: matches ride category
    │    └── Limit: 50 drivers max
    │
    ├──▶ For each nearby driver:
    │    ├── Calculate ETA (distance / 30 km/h)
    │    └── Emit ride:request to driver
    │
    ├──▶ Driver has 15 seconds to accept
    │
    └──▶ If no driver accepts in 15s:
         ├── Ride status → "expired"
         ├── Notify rider: "No drivers available"
         └── Optionally retry with larger radius
```

### 3.3 Driver Acceptance

```
Driver taps "Accept"
    │
    ├──▶ Emit driver:accept-ride via Socket.IO
    │
    ├──▶ Socket server (Lua atomic script):
    │    ├── Check ride.status == "pending"
    │    ├── If yes: Set ride.status = "accepted"
    │    │           Set ride.driver_id = driver.id
    │    ├── If no: Return error (already claimed)
    │    └── This prevents double-acceptance
    │
    ├──▶ POST /rides/{id}/driver-accept (REST API backup)
    │
    ├──▶ Backend:
    │    ├── Validate ride is in "pending" state
    │    ├── Validate driver is approved
    │    ├── Update ride: driver_id, status
    │    ├── Record status_history
    │    └── Send notifications
    │
    ├──▶ Emit ride:accepted to rider
    │
    └──▶ Navigate driver to ActiveRideScreen
```

### 3.4 Driver Arrived

```
Driver taps "I've Arrived"
    │
    ├──▶ Update driver location
    │
    ├──▶ POST /rides/{id}/driver-arrived
    │
    ├──▶ Backend:
    │    ├── Validate ride is in "accepted" state
    │    ├── Validate driver is assigned
    │    ├── Update ride: status = "arrived"
    │    └── Record status_history
    │
    ├──▶ Emit ride:arrived to rider
    │
    └──▶ Driver UI: "Start Trip" button appears
```

### 3.5 Trip Start

```
Driver taps "Start Trip"
    │
    ├──▶ POST /rides/{id}/start
    │
    ├──▶ Backend:
    │    ├── Validate ride is in "arrived" state
    │    ├── Update ride: status = "in_progress"
    │    ├── Set ride.started_at = now
    │    └── Record status_history
    │
    ├──▶ Emit ride:started to rider
    │
    └──▶ Both apps show "In Progress" state
```

### 3.6 Trip Completion

```
Driver taps "Complete Trip"
    │
    ├──▶ POST /rides/{id}/complete
    │
    ├──▶ Backend:
    │    ├── Validate ride is in "in_progress" state
    │    ├── Calculate final fare:
    │    │   ├── Use OSRM for actual route
    │    │   ├── Calculate distance + time
    │    │   ├── Apply surge multiplier
    │    │   └── Apply promo discount
    │    ├── ⚠ BUG: calculateFinalFare() returns hardcoded 50.0
    │    ├── Update ride: status = "completed"
    │    ├── Set ride.completed_at = now
    │    ├── Set ride.total_fare = calculated amount
    │    └── Record status_history
    │
    ├──▶ Emit ride:completed to rider
    │
    ├──▶ Process payment:
    │    ├── If wallet/cash → immediate processing
    │    ├── If Stripe → PaymentIntent confirmed
    │    └── If PayFast/Ozow → redirect flow
    │
    ├──▶ Driver sees earnings summary
    │
    └──▶ Rider sees rating screen
```

### 3.7 Rating

```
Rider submits rating (1-5 stars + optional comment)
    │
    ├──▶ POST /rides/{id}/rate
    │    { score: 4, comment: "Great ride!" }
    │
    ├──▶ Backend:
    │    ├── Validate ride is completed
    │    ├── Validate not already rated
    │    ├── Create Rating record
    │    ├── Update driver's average rating:
    │    │   driver_profile.rating_sum += score
    │    │   driver_profile.rating_count += 1
    │    │   driver_profile.average_rating = sum / count
    │    └── Unique constraint: one rating per ride per user
    │
    └──▶ Rider navigates to HomeScreen
```

---

## 4. API Endpoints

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|------------|---------|
| `/rides/` | POST | Sanctum | ride-create (10/min) | Create ride |
| `/rides/` | GET | Sanctum | - | List rides |
| `/rides/current` | GET | Sanctum | - | Current ride |
| `/rides/{id}` | GET | Sanctum | - | Ride details |
| `/rides/{id}/cancel` | POST | Sanctum | ride-cancel (5/min) | Cancel ride |
| `/rides/{id}/rate` | POST | Sanctum | - | Rate ride |
| `/rides/{id}/apply-promo` | POST | Sanctum | - | Apply promo |
| `/rides/{id}/no-show` | POST | role:driver | - | Mark no-show |
| `/rides/{id}/driver-accept` | POST | role:driver | - | Accept ride |
| `/rides/{id}/driver-arrived` | POST | role:driver | - | Mark arrived |
| `/rides/{id}/start` | POST | role:driver | - | Start trip |
| `/rides/{id}/complete` | POST | role:driver | - | Complete trip |
| `/rides/{id}/receipt` | GET | Sanctum | - | Download receipt |

---

## 5. Socket.IO Events

| Event | Direction | Payload | Room |
|-------|-----------|---------|------|
| `rider:book-ride` | Rider → Server | rideId, pickup, dropoff, category | driver (nearby) |
| `driver:accept-ride` | Driver → Server | rideId, riderId | ride:{rideId} |
| `driver:arrived` | Driver → Server | rideId, riderId | ride:{rideId} |
| `ride:start` | Driver → Server | rideId, otherUserId | ride:{rideId} |
| `ride:complete` | Driver → Server | rideId, otherUserId | ride:{rideId} |
| `ride:cancel` | Either → Server | rideId, reason | ride:{rideId} |
| `ride:request` | Server → Driver | rideId, riderId, price, distance | driver:{driverId} |
| `ride:accepted` | Server → Rider | rideId, driver | rider:{riderId} |
| `ride:arrived` | Server → Rider | rideId | rider:{riderId} |
| `ride:started` | Server → Rider | rideId | rider:{riderId} |
| `ride:completed` | Server → Rider | rideId | rider:{riderId} |
| `ride:cancelled` | Server → Both | rideId, reason | ride:{rideId} |
| `ride:location` | Server → Rider | lat, lng | ride:{rideId} |

---

## 6. Cancellation Rules

| Scenario | Fee | Actor |
|----------|-----|-------|
| Cancel before driver acceptance | Free | Rider |
| Cancel within 2 minutes of acceptance | Free | Either |
| Cancel after 2 minutes of acceptance | Cancellation fee | Either |
| Driver cancels | No fee to rider | Driver |
| No-show (rider doesn't show up) | No-show fee | Driver marks |

---

## 7. Scheduled Rides

```
Rider schedules future ride
    │
    ├──▶ POST /scheduled-rides/
    │    { scheduled_at, pickup, dropoff, category }
    │
    ├──▶ Backend creates ScheduledRide record
    │
    ├──▶ scheduled-rides:publish job runs every minute
    │    ├── Check for scheduled rides due
    │    └── Auto-publish as regular ride request
    │
    └──▶ Normal ride flow from there
```

---

## 8. Pool Rides

```
Rider joins pool
    │
    ├──▶ POST /pool/join
    │    { pickup, dropoff }
    │
    ├──▶ PoolMatchingService:
    │    ├── Find rides with similar route
    │    ├── Check capacity (max_passengers)
    │    ├── Calculate fare share
    │    └── Match riders
    │
    ├──▶ PoolRide record created
    │
    └──▶ Driver picks up multiple passengers
         ├── PATCH /driver/pool/{id}/passenger/{pid}/pickup
         └── PATCH /driver/pool/{id}/passenger/{pid}/dropoff
```
