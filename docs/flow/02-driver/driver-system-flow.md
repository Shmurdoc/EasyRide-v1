# Driver App — System Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Technical architecture of the Driver App — socket events, background location, API calls, and state management.

---

## 2. System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| App.tsx | React Navigation 6 | Root navigator |
| AuthProvider | React Context | Login/logout/token management |
| useSocket | Socket.IO Client | Real-time ride requests, location |
| useNotifications | Expo Notifications | Push token registration |
| useNetworkStatus | NetInfo | Online/offline detection |
| Expo Location | Background task | Continuous GPS tracking |
| API Client | Axios | REST API calls |

---

## 3. API Endpoints Used

### 3.1 Authentication
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/auth/login` | LoginScreen submit | `{ user, token }` |
| POST | `/auth/logout` | ProfileScreen logout | `{ message }` |
| GET | `/auth/me` | App launch (token refresh) | `{ user }` |

### 3.2 Driver Operations
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/drivers/toggle-online` | Dashboard toggle | `{ is_online }` |
| POST | `/drivers/location` | Location update (every 50m) | `{ success }` |
| PUT | `/drivers/profile` | ProfileScreen edit | `{ driver }` |
| POST | `/drivers/vehicle` | Vehicle registration | `{ vehicle }` |
| GET | `/drivers/earnings` | EarningsScreen mount | `{ earnings }` |
| GET | `/drivers/trips` | TripHistoryScreen mount | `{ data: Trip[] }` |
| GET | `/drivers/stats` | Dashboard mount | `{ stats }` |
| GET | `/drivers/nearby-rides` | RideRequestsScreen | `{ data: Ride[] }` |

### 3.3 Rides
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/rides/{id}/driver-accept` | Accept ride | `{ ride }` |
| POST | `/rides/{id}/driver-arrived` | "I've Arrived" | `{ ride }` |
| POST | `/rides/{id}/start` | "Start Trip" | `{ ride }` |
| POST | `/rides/{id}/complete` | "Complete Trip" | `{ ride }` |
| POST | `/rides/{id}/cancel` | Cancel ride | `{ ride }` |
| POST | `/rides/{id}/rate` | Rate passenger | `{ rating }` |

### 3.4 Food Delivery
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/driver/food/orders/available` | FoodDeliveryScreen mount | `{ data: Order[] }` |
| POST | `/driver/food/orders/{id}/accept` | Accept food order | `{ order }` |
| POST | `/driver/food/orders/{id}/status` | Update order status | `{ order }` |

### 3.5 Chat
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/chat/rides/{id}/messages` | ChatScreen mount | `{ data: Message[] }` |
| POST | `/chat/rides/{id}/messages` | Send message | `{ message }` |
| POST | `/chat/rides/{id}/read` | Mark as read | `{ success }` |

### 3.6 Notifications
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/notifications/register-token` | App launch | `{ success }` |

---

## 4. Socket.IO Events

### 4.1 Events Emitted by Driver
| Event | Payload | Trigger |
|-------|---------|---------|
| `driver:toggle-online` | `{ is_online }` | Dashboard toggle |
| `driver:location-update` | `{ latitude, longitude }` | Location update |
| `driver:accept-ride` | `{ rideId, riderId }` | Accept ride request |
| `driver:arrived` | `{ rideId, riderId }` | "I've Arrived" |
| `ride:start` | `{ rideId, otherUserId }` | "Start Trip" |
| `ride:complete` | `{ rideId, otherUserId }` | "Complete Trip" |
| `ride:cancel` | `{ rideId, reason }` | Cancel ride |
| `chat:send` | `{ rideId, message }` | Send chat message |

### 4.2 Events Received by Driver
| Event | Payload | Effect |
|-------|---------|--------|
| `ride:request` | `{ rideId, riderId, category, price, distance, pickup, destination }` | Show overlay |
| `ride:accepted` | `{ rideId }` | Ride confirmed |
| `ride:cancelled` | `{ rideId }` | Ride cancelled |
| `chat:message` | `{ message, sender }` | Display in chat |

---

## 5. Background Location System

```
┌─────────────────────────────────────────┐
│  Driver App - Location Tracking          │
├─────────────────────────────────────────┤
│                                          │
│  State: ONLINE                           │
│    │                                     │
│    ├──▶ Foreground Location Tracking     │
│    │    (Expo Location.watchPositionAsync)│
│    │    Distance filter: 50m             │
│    │    Accuracy: High                   │
│    │                                     │
│    ├──▶ On Location Update:              │
│    │    ├── Emit driver:location-update  │
│    │    │   (Socket.IO)                  │
│    │    ├── POST /drivers/location       │
│    │    │   (REST API)                   │
│    │    └── Redis GEOADD driver:location │
│    │        (via Socket server)          │
│    │                                     │
│    └──▶ AppState Change:                 │
│         ├── background → Start background│
│         │   location task                │
│         └── foreground → Stop background │
│             task, resume foreground      │
│                                          │
│  State: OFFLINE                          │
│    └──▶ Stop all location tracking       │
│                                          │
│  Cleanup:                                │
│    └──▶ On logout/unmount:               │
│         ├── Stop location watcher        │
│         └── POST /drivers/toggle-online  │
│             { is_online: false }         │
└─────────────────────────────────────────┘
```

**Location Update Frequency:**
- Foreground: Every 50m distance interval
- Background: Varies by OS (iOS more restrictive)
- Server-side cleanup: Every 5 minutes (stale locations removed)

**⚠ Issues:**
- `isOnlineRef` (useRef) and `isOnline` (useState) must stay in sync — race condition risk
- `locationWatcher` and `watcherRef` — potential duplicate watchers on rapid toggle
- Background location on iOS may be killed by OS
- No foreground service implementation visible (Android)

---

## 6. Component Architecture

```
App.tsx
├── ErrorBoundary
├── ThemeProvider
├── AuthProvider
│   ├── LoginScreen (not authenticated)
│   └── MainScreen (authenticated) → BottomTabs
│       ├── DashboardScreen
│       │   ├── MapView (react-native-maps)
│       │   ├── OnlineToggle
│       │   ├── StatsCard
│       │   └── RideRequestOverlay
│       ├── RideRequestsScreen
│       │   └── RequestList
│       ├── FoodDeliveryScreen
│       │   └── OrderList
│       ├── EarningsScreen
│       │   ├── EarningsChart
│       │   └── TripList
│       ├── TripHistoryScreen
│       │   └── TripList
│       └── ProfileScreen
│           ├── DriverInfo
│           ├── VehicleInfo
│           └── KYCStatus
├── ActiveRideScreen
│   ├── MapView (route display)
│   ├── PhaseButtons
│   ├── PassengerInfo
│   └── ProgressBar
├── ChatScreen
│   └── MessageList
└── FoodOrderDetailScreen
```

---

## 7. Ride State Machine (Driver Side)

```
                    ┌─────────────┐
                    │  WAITING    │
                    │  (Online,   │
                    │  no ride)   │
                    └──────┬──────┘
                           │
                    ride:request received
                           │
                    ┌──────▼──────┐
                    │  RECEIVED   │
                    │  (15s timer)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ ACCEPTED │ │ DECLINED │ │ TIMEOUT  │
        │          │ │          │ │          │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │TO_PICKUP │ │  BACK TO │ │  BACK TO │
        │          │ │  WAITING │ │  WAITING │
        └────┬─────┘ └──────────┘ └──────────┘
             │
        "I've Arrived"
             │
        ┌────▼─────┐
        │ ARRIVED  │
        └────┬─────┘
             │
        "Start Trip"
             │
        ┌────▼─────┐
        │IN_PROGRESS│
        └────┬─────┘
             │
        "Complete Trip"
             │
        ┌────▼─────┐
        │COMPLETED │
        └────┬─────┘
             │
        ┌────▼─────┐
        │ RATING   │
        │ (1-5 ⭐) │
        └────┬─────┘
             │
        ┌────▼─────┐
        │  BACK TO │
        │  WAITING │
        └──────────┘
```

---

## 8. Data Flow: Ride Lifecycle

```
Socket.IO Event: ride:request
    │
    ▼
┌─────────────┐
│ Parse ride  │
│ details     │
│ (rideId,    │
│  riderId,   │
│  category,  │
│  price,     │
│  distance,  │
│  pickup,    │
│  destination│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Show ride   │
│ request     │
│ overlay     │
│ (15s timer) │
└──────┬──────┘
       │
       ├── [Accept] ──▶ POST /rides/{id}/driver-accept
       │                     │
       │                     ▼
       │                ┌─────────────┐
       │                │ Navigate to │
       │                │ ActiveRide  │
       │                └─────────────┘
       │
       ├── [Decline] ──▶ Return to online
       │
       └── [Timeout] ──▶ Auto-decline
```
