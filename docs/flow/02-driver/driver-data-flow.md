# Driver App — Data Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

How data moves through the Driver App — location data, ride data, earnings, and real-time events.

---

## 2. Data Sources

| Source | Type | Frequency | Volume |
|--------|------|-----------|--------|
| GPS sensor | Expo Location | Every 50m | ~50 bytes/update |
| Socket.IO | WebSocket | Per event | 100-500 bytes |
| REST API | HTTP JSON | Per action | 1-10 KB |
| AsyncStorage | Local | On read | 1-50 KB |
| SecureStore | Encrypted | On auth | <1 KB |

---

## 3. Data Flow Diagrams

### 3.1 Location Update Data Flow
```
┌──────────────┐
│  GPS Sensor  │──── Position fix (lat, lng, accuracy)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Expo        │──── watchPositionAsync callback
│  Location    │     (distanceFilter: 50m)
└──────┬───────┘
       │
       ├──▶ Socket.IO: driver:location-update
       │    { latitude, longitude }
       │         │
       │         ▼
       │    ┌─────────────┐
       │    │ Socket      │
       │    │ Server      │
       │    │             │
       │    │ Redis GEOADD│
       │    │ driver:     │
       │    │ location    │
       │    └──────┬──────┘
       │           │
       │           ▼
       │    ┌─────────────┐
       │    │ Nearby      │
       │    │ riders get  │
       │    │ location    │
       │    └─────────────┘
       │
       └──▶ REST API: POST /drivers/location
            { latitude, longitude }
                 │
                 ▼
            ┌─────────────┐
            │ PostgreSQL  │
            │ users table │
            │ current_    │
            │ latitude,   │
            │ longitude   │
            └─────────────┘
```

### 3.2 Ride Request Data Flow
```
┌──────────────┐
│  Socket.IO   │──── ride:request event received
│  Event       │     { rideId, riderId, category, price,
└──────┬───────┘       distance, pickup, destination }
       │
       ▼
┌──────────────┐
│  Parse &     │──── Extract ride details
│  Validate    │     Validate rideId exists
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Show        │──── Display overlay with 15s countdown
│  Overlay     │     Show passenger info, route, fare
└──────┬───────┘
       │
       ├── [Accept] ──▶ Emit driver:accept-ride
       │                     │
       │                     ▼
       │                ┌─────────────┐
       │                │ Socket      │
       │                │ Server      │
       │                │ Lua script  │
       │                │ atomic claim│
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐
       │                │ POST /rides │
       │                │ /{id}/driver│
       │                │ -accept     │
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐
       │                │ Navigate to │
       │                │ ActiveRide  │
       │                └─────────────┘
       │
       ├── [Decline] ──▶ Return to online state
       │
       └── [Timeout] ──▶ Auto-decline, return to online
```

### 3.3 Earnings Data Flow
```
┌──────────────┐
│  Dashboard   │──── On mount
│  Load        │
└──────┬───────┘
       │
       ├──▶ GET /drivers/earnings
       │    Response: {
       │      today: { trips, earnings, hours },
       │      week: { earnings, breakdown },
       │      total: { trips, earnings, since }
       │    }
       │
       ├──▶ GET /drivers/stats
       │    Response: {
       │      acceptance_rate,
       │      cancellation_rate,
       │      average_rating,
       │      total_trips
       │    }
       │
       └──▶ GET /drivers/trips
            Response: {
              data: [{
                id, rider_name, pickup, dropoff,
                fare, rating, completed_at
              }]
            }
```

---

## 4. Data Transformations

| Input | Transform | Output | Location |
|-------|-----------|--------|----------|
| Raw GPS (lat, lng) | Format to API payload | `{ latitude, longitude }` | App |
| Socket ride request | Parse JSON, extract fields | Typed ride request object | App |
| Earnings response | Format currency (ZAR) | "R 850.00" | App |
| Trip history | Sort by date, paginate | Display list | App |
| Polyline string | Decode to coordinates | Map route overlay | App |

---

## 5. Data Storage

### 5.1 Client-Side Storage

| Store | Purpose | Data | Encryption |
|-------|---------|------|-----------|
| SecureStore | Auth token | `er_xxxxx` | Yes |
| AsyncStorage | Driver profile cache | Name, vehicle info | No |
| AsyncStorage | Earnings cache | Today/week stats | No |
| React Context | Active session | User, token, auth state | No |

### 5.2 Server-Side Storage

| Table | Purpose | Key Fields | Updated By |
|-------|---------|------------|-----------|
| `users` | Driver account | id, name, email, is_online | Driver app |
| `driver_profiles` | KYC, stats | license_number, rating, total_trips | Admin + app |
| `vehicles` | Vehicle info | make, model, plate, category | Driver app |
| `rides` | Ride records | driver_id, status, fare | Both apps |
| `wallets` | Earnings | balance, pending_balance | System |
| `wallet_transactions` | Transaction log | type, amount, reference | System |
| `push_tokens` | Push notifications | token, platform, is_active | Driver app |

---

## 6. Data Validation

### 6.1 Client-Side Validation
| Field | Rule | Error |
|-------|------|-------|
| Email | Required, valid format | "Please fill in all fields" |
| Password | Required | "Please fill in all fields" |
| Profile edits | Varies by field | Server-side errors |

### 6.2 Server-Side Validation
| Endpoint | Request Class | Key Rules |
|----------|--------------|-----------|
| POST /drivers/toggle-online | `ToggleOnlineRequest` | is_online (boolean) |
| POST /drivers/location | `UpdateLocationRequest` | latitude, longitude (required) |
| PUT /drivers/profile | `UpdateDriverProfileRequest` | name, phone |
| POST /drivers/vehicle | `VehicleRegisterRequest` | make, model, year, plate, category |
| POST /rides/{id}/rate | `RatingCreateRequest` | score (1-5) |

---

## 7. Data Sync Patterns

| Pattern | Implementation | When |
|---------|---------------|------|
| Real-time push | Socket.IO | Ride requests, cancellation |
| Real-time emit | Socket.IO | Location updates, ride actions |
| Pull (on-demand) | REST API | Earnings, trips, profile |
| Write-through | REST API + Socket.IO | Location (both simultaneously) |
| Cache-first | AsyncStorage | Profile, config (not implemented) |
