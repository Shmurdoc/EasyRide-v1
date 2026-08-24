# Driver App — Integration Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Third-party service integrations used by the Driver App.

---

## 2. Integration Map

| Service | Purpose | Protocol | Authentication |
|---------|---------|----------|----------------|
| Socket.IO | Real-time communication | WebSocket | Sanctum token |
| Expo Location | GPS tracking | Native API | User permission |
| Firebase (FCM) | Push notifications | HTTP v1 | Service Account |
| Google Maps (Display) | Map + navigation | SDK | API Key |
| OSRM | Route to pickup/dropoff | REST API | None (free) |

---

## 3. Integration Flows

### 3.1 Socket.IO Connection Lifecycle

```
Driver App Launch
    │
    ├──▶ Connect to Socket.IO server
    │    URL: wss://socket.easyryde.co.za
    │    Auth: { token: Sanctum token }
    │
    ├──▶ Server validates token
    │    ├── Valid → Connection established
    │    │         → Join rooms: driver:{userId}, ride:{rideId}
    │    │         → Start listening for events
    │    │
    │    └── Invalid → Connection rejected
    │               → Redirect to login
    │
    ├──▶ On disconnect:
    │    ├── Auto-reconnect with exponential backoff
    │    ├── Re-authenticate on reconnect
    │    └── Rejoin rooms
    │
    └──▶ On logout:
         ├── Disconnect socket
         └── Clear all listeners
```

### 3.2 Background Location Integration

```
Driver goes ONLINE
    │
    ├──▶ Request foreground location permission
    │    ├── Granted → Continue
    │    └── Denied → Show alert, can't go online
    │
    ├──▶ Request background location permission (iOS)
    │    ├── Granted → Background tracking enabled
    │    └── Denied → Foreground only
    │
    ├──▶ Start Expo Location.watchPositionAsync
    │    Config:
    │      accuracy: Accuracy.High
    │      distanceInterval: 50 (meters)
    │      timeInterval: null (distance-based)
    │
    ├──▶ On position update:
    │    ├── Emit driver:location-update via Socket.IO
    │    ├── POST /drivers/location via REST API
    │    └── Redis GEOADD (via Socket server)
    │
    └──▶ AppState listener:
         ├── background → Switch to background task
         └── foreground → Resume foreground tracking

Driver goes OFFLINE
    │
    └──▶ Stop all location tracking
```

### 3.3 Push Notification Integration

```
App Launch
    │
    ├──▶ Expo Notifications.getExpoPushTokenAsync()
    │
    ├──▶ POST /notifications/register-token
    │    { token, platform }
    │
    ├──▶ Backend stores in push_tokens table
    │
    └──▶ Listen for notifications:
         ├── "New ride request" → Show overlay
         ├── "Ride cancelled" → Update UI
         ├── "Payment received" → Update earnings
         └── "System alert" → Show alert
```

### 3.4 Map Navigation Integration

```
ActiveRideScreen loads
    │
    ├──▶ Fetch ride details: GET /rides/{id}
    │
    ├──▶ Decode route polyline
    │    (polyline library)
    │
    ├──▶ Display on react-native-maps:
    │    ├── Pickup marker (green)
    │    ├── Dropoff marker (red)
    │    ├── Driver marker (blue, animated)
    │    └── Route polyline (blue line)
    │
    └──▶ fitToCoordinates
         (map bounds to show entire route)
```

---

## 4. Webhooks (Server-Side, Not Direct to Driver App)

| Event | Source | Target | Effect on Driver |
|-------|--------|--------|-----------------|
| PayFast ITN | PayFast | Backend | Payment status update |
| Ozow webhook | Ozow | Backend | Payment status update |
| Stripe webhook | Stripe | Backend | Payment status update |
| Partner order | Partner system | Backend | New food order available |

---

## 5. Rate Limits

| Service | Limit | Window | Action |
|---------|-------|--------|--------|
| Socket.IO | 60 events | 1 minute | Event dropped |
| POST /drivers/location | Unthrottled | - | Every 50m |
| POST /rides/{id}/driver-accept | Per-ride | - | One acceptance |
| Global API | 60 requests | 1 minute | 429 Too Many Requests |

---

## 6. Fallback Strategies

| Failure Scenario | Primary | Fallback | Impact |
|------------------|---------|----------|--------|
| Socket.IO down | Real-time events | REST polling | Delayed ride requests |
| Location permission denied | GPS tracking | Can't go online | Can't receive rides |
| GPS unavailable | High accuracy | Low accuracy | Less precise tracking |
| API down | Ride acceptance | Can't complete actions | Can't work |
| FCM down | Push notifications | In-app only | Missed alerts |

---

## 7. Monitoring

| Service | Health Check | Frequency |
|---------|-------------|-----------|
| Socket.IO | Connection status | Real-time |
| Location | Permission status | On toggle |
| API | Response time | Per request |
| Background location | Task status | On AppState change |
