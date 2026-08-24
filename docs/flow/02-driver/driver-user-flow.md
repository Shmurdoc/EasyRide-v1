# Driver App — User Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02
**Screens:** 10
**App:** `mobile/apps/driver`

---

## 1. Overview

The Driver App is the supply-side application. Drivers go online, accept ride requests, navigate to pickups, complete trips, and track earnings. Target market: Phalaborwa, Limpopo, South Africa.

---

## 2. Actors

| Actor | Role | Access Level |
|-------|------|-------------|
| Driver (authenticated) | Ride acceptor, trip completer | Full access to rides, earnings, profile |
| Admin (via backend) | Driver approver | Can approve/reject driver applications |

---

## 3. Complete Screen Flow

### 3.1 Authentication Flow

```
┌──────────────────┐
│  App Launch       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Login Screen     │
│                  │
│  Email: ________ │
│  Password: _____ │
│                  │
│  [Sign In]       │
│  [Forgot Password?]│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  DashboardScreen │
│  (Main)          │
└──────────────────┘
```

**Login Details:**
- Email + password → `POST /auth/login`
- Token stored in SecureStore
- On success: navigate to DashboardScreen
- On failure: "Login Failed" alert

**Validation:**
| Field | Rule | Error |
|-------|------|-------|
| Email | Required, valid format | "Please fill in all fields" |
| Password | Required | "Please fill in all fields" |

---

### 3.2 Dashboard (Online/Offline Toggle)

```
┌──────────────────────────────────────────┐
│  DashboardScreen                          │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │         Google Map View              │ │
│  │    (Driver's current location)       │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Status: ● ONLINE / ○ OFFLINE        │ │
│  │                                      │ │
│  │  [Go Online] / [Go Offline]          │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Today's Stats:                      │ │
│  │  Trips: 12 | Earnings: R850         │ │
│  │  Rating: 4.8 | Hours: 6.5           │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ⚠ HARDCODED VEHICLE DATA:              │
│  Toyota Corolla, LPS 123 GP, White, 2023│
├──────────────────────────────────────────┤
│  [🏠 Dashboard] [📋 Requests] [🍔 Food] │
│  [💰 Earnings] [🛣 Trips] [👤 Profile]  │
└──────────────────────────────────────────┘
```

**Online Toggle Flow:**
```
Tap "Go Online"
    │
    ├──▶ Check location permission
    │    ├── Granted → Start foreground location tracking
    │    │           → POST /drivers/toggle-online { is_online: true }
    │    │           → Socket: driver:toggle-online
    │    │           → Status: "Online"
    │    │           → Start receiving ride:request events
    │    │
    │    └── Denied → Alert: "Location permission required"
    │               → Open app settings
    │
    └──▶ Background location permission (iOS)
         ├── Granted → Background tracking enabled
         └── Denied → Foreground only (limited)
```

**Location Tracking:**
- Foreground: Every 50m distance interval
- Background: AppState listener switches mode
- Server: Redis GEO index updated
- API: `POST /drivers/location` with `{ latitude, longitude }`

**Edge Cases:**
- Rapid toggle online/offline → verify no leaked location watchers
- Location permission revoked while online → graceful degradation
- App backgrounded while online → background location continues
- `isOnlineRef` (useRef) and `isOnline` (useState) sync issues

---

### 3.3 Ride Request Flow

```
┌──────────────────────────────────────────┐
│  Ride Request Overlay                     │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │  🚗 NEW RIDE REQUEST                 │ │
│  │                                      │ │
│  │  Passenger: Sarah M.                 │ │
│  │  Pickup: 123 Main St                │ │
│  │  Dropoff: 456 Oak Ave               │ │
│  │  Distance: 2.4 km                   │ │
│  │  Fare: R65.00                        │ │
│  │                                      │ │
│  │  ⏱ 15 seconds remaining             │ │
│  │  ████████████░░░░░░░░                │ │
│  │                                      │ │
│  │  [Decline]          [Accept]         │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Ride Request State Machine:**
```
WAITING → RECEIVED → ACCEPTING/DECLINING → ACCEPTED → TO_PICKUP → ARRIVED → IN_PROGRESS → COMPLETED
    │                                                         │
    └───── [15s timeout] ──▶ AUTO-DECLINE ──▶ WAITING ───────┘
```

**Flow Steps:**

| Step | Action | System Response | Timeout |
|------|--------|----------------|---------|
| 1 | Receive `ride:request` event | Overlay appears with 15s countdown | - |
| 2 | View ride details | Passenger info, route, fare displayed | - |
| 3a | Tap "Accept" | Emit `driver:accept-ride` → Navigate to ActiveRideScreen | - |
| 3b | Tap "Decline" | Return to online state | - |
| 3c | 15s expires | Auto-decline, return to online | 15s |

**API Calls:**
1. `POST /rides/{id}/driver-accept` — accept ride
2. `POST /drivers/location` — update location

**Edge Cases:**
- Multiple ride requests while in ride → only one shown, others queued
- Socket disconnect during request → handle gracefully
- Ride request data has missing fields → use defaults ("Passenger", "2.4 km")
- Accept ride when `currentRequest` is null → no-op

---

### 3.4 Active Ride Flow (ActiveRideScreen)

```
┌──────────────────────────────────────────┐
│  ActiveRideScreen                         │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │         Google Map View              │ │
│  │  ┌────────────────────────────────┐  │ │
│  │  │ 📍 Pickup marker               │  │ │
│  │  │ 📍 Dropoff marker              │  │ │
│  │  │ 🚗 Driver marker (current)     │  │ │
│  │  │ ═══ Route polyline             │  │ │
│  │  └────────────────────────────────┘  │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Phase: TO PICKUP / ARRIVED / IN RIDE    │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Passenger: Sarah M. ★4.8           │ │
│  │  Pickup: 123 Main St                │ │
│  │  Dropoff: 456 Oak Ave               │ │
│  │  Fare: R65.00                        │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Progress: ████████░░░░░░ 45%            │
│                                          │
│  [📞 Call]  [💬 Message]  [❌ Cancel]   │
│                                          │
│  Phase Buttons:                           │
│  [I've Arrived] → [Start Trip] → [Complete Trip] │
├──────────────────────────────────────────┤
│  Phase Transitions:                       │
│  to_pickup → arrived → in_progress →     │
│  completed                               │
└──────────────────────────────────────────┘
```

**Phase Button Logic:**

| Current Phase | Button | Action | Socket Event |
|---------------|--------|--------|-------------|
| `to_pickup` | "I've Arrived" | Update location, notify rider | `driver:arrived` |
| `arrived` | "Start Trip" | Begin trip | `ride:start` |
| `in_progress` | "Complete Trip" | End trip, show earnings | `ride:complete` |
| Any | "Cancel" | Confirm → cancel ride | `ride:cancel` |

**API Calls:**
1. `GET /rides/{id}` — load ride details
2. `POST /drivers/location` — update driver location
3. `POST /rides/{id}/driver-arrived` — mark arrived
4. `POST /rides/{id}/start` — start trip
5. `POST /rides/{id}/complete` — complete trip

**⚠ KNOWN BUG:** Progress bar auto-increments by 2% every 200ms (50s to 100%). This is **fake progress, not GPS-based**. The code has a TODO comment acknowledging this.

**Edge Cases:**
- Decode polyline fails → warning logged, no crash
- `ride.dropoff_latitude > 0` check → dropoff marker only shown when valid
- Cancel ride during arrived → confirmation dialog
- Socket `ride:cancelled` event → alert, navigate back
- Phone call during ride → app handles interruption

---

### 3.5 Earnings Flow (EarningsScreen)

```
┌──────────────────────────────────────────┐
│  EarningsScreen                           │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │  TODAY'S EARNINGS                    │ │
│  │  R 850.00                            │ │
│  │                                      │ │
│  │  Trips: 12    Hours: 6.5            │ │
│  │  Rating: 4.8  Acceptance: 85%       │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  WEEKLY EARNINGS                     │ │
│  │  R 4,250.00                          │ │
│  │  ████████████████░░░░░░              │ │
│  │  (Mon-Sun bar chart)                 │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  TOTAL EARNINGS                      │ │
│  │  R 45,250.00                         │ │
│  │  Trips: 520    Since: Jan 2024      │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Recent Trips:                            │
│  ┌──────────────────────────────────────┐ │
│  │  Trip #1234 - R65.00 - ★5.0         │ │
│  │  Trip #1233 - R45.00 - ★4.5         │ │
│  │  Trip #1232 - R80.00 - ★4.8         │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**API Calls:**
1. `GET /drivers/earnings` — earnings summary
2. `GET /drivers/stats` — driver statistics
3. `GET /drivers/trips` — trip history

---

### 3.6 Other Screens

**RideRequestsScreen:** List of incoming ride requests with accept/decline.

**TripHistoryScreen:** Past trips with details, earnings, ratings.

**ProfileScreen:** Driver info, vehicle details, KYC status, documents.

**FoodDeliveryScreen:** Available food delivery orders.

**FoodOrderDetailScreen:** Food order details, accept/update status.

**ChatScreen:** In-ride messaging with rider.

---

## 4. Navigation Structure

```
Stack
├── Login (not authenticated)
└── Main (authenticated) → BottomTabs
    ├── Dashboard (online/offline toggle, map)
    ├── Requests (ride requests)
    ├── Food (food delivery orders)
    ├── Earnings (earnings dashboard)
    ├── Trips (trip history)
    └── Profile
├── ActiveRide (stack screen)
├── Chat
└── FoodOrderDetail
```

---

## 5. State Management

| State | Storage | Scope |
|-------|---------|-------|
| Auth (user, token) | React Context | Global |
| isOnline | useState + useRef | Dashboard |
| currentRequest | useState | Ride request |
| ridePhase | useState | Active ride |
| locationWatcher | useRef | Background tracking |
| Socket connection | useSocket hook | Global |

---

## 6. Security Considerations

- Token stored in `expo-secure-store`
- `role:driver` middleware on all driver endpoints
- Driver must be `is_verified` AND `is_approved` to go online
- Location updates signed with Sanctum token
- Ride acceptance uses Lua atomic script to prevent double-accept
