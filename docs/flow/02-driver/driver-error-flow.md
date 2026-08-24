# Driver App — Error Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Error handling and recovery strategy for the Driver App.

---

## 2. Error Categories

| Category | Severity | Examples | User Impact |
|----------|----------|----------|-------------|
| Network | HIGH | No internet, timeout | Can't work |
| Auth | HIGH | Token expired | Can't access |
| Socket | HIGH | Disconnect mid-ride | Real-time broken |
| Location | HIGH | Permission denied, GPS lost | Can't go online |
| API | MEDIUM | Server error, validation | Feature broken |
| Payment | MEDIUM | Earnings display error | Informational only |
| Background | MEDIUM | OS kills background task | Location stops |

---

## 3. Error Handling Matrix

| Error | Source | User Message | Recovery |
|-------|--------|--------------|----------|
| Network timeout | Axios | "Network error" | Retry |
| No internet | NetInfo | "You're offline" banner | Auto-reconnect |
| Invalid credentials | API 401 | "Login Failed" | Re-enter |
| Token expired | API 401 | Redirect to login | Re-login |
| Socket disconnect | Socket.IO | "Connection lost. Reconnecting..." | Auto-reconnect |
| Socket auth fail | Socket.IO | Redirect to login | Re-login |
| Location denied | Expo Location | "Location permission required" | Open settings |
| Location unavailable | Expo Location | "GPS unavailable" | Retry |
| Background location killed | iOS/Android | Silent — location stops | Re-request on foreground |
| Ride acceptance failed | API 422 | "Could not accept ride" | Refresh requests |
| Ride state error | API 422 | "Invalid action" | Refresh screen |
| API server error | API 500 | "Something went wrong" | Retry later |

---

## 4. Socket.IO Error Handling

### 4.1 Disconnect During Ride Request
```
Socket disconnect detected
    │
    ├──▶ Ride request may be missed
    │
    ├──▶ Auto-reconnect with backoff
    │
    ├──▶ On reconnect:
    │    ├── Re-authenticate
    │    ├── Fetch nearby rides: GET /drivers/nearby-rides
    │    └── Resume listening
    │
    └──▶ Show "Connection restored" banner
```

### 4.2 Disconnect During Active Ride
```
Socket disconnect during ride
    │
    ├──▶ Location updates stop (Socket path)
    │
    ├──▶ REST API location updates continue
    │    (POST /drivers/location still works)
    │
    ├──▶ Ride actions still work via REST API
    │
    └──▶ On reconnect:
         ├── Resume Socket.IO events
         └── Sync any missed events
```

---

## 5. Location Error Handling

| Error | Scenario | Resolution |
|-------|----------|------------|
| Permission denied | User denies location | Can't go online, show alert |
| Permission revoked | Settings change | Detect, go offline gracefully |
| GPS signal lost | Indoor/tunnel | Continue with last known |
| Background killed (iOS) | OS memory pressure | Detect on foreground, restart |
| Background killed (Android) | OS optimization | Foreground service (not implemented) |
| Location timeout | Can't get fix in 10s | Use last known location |

---

## 6. Background Location Error Handling

```
AppState change to 'background'
    │
    ├──▶ Check background permission
    │    ├── Granted → Start background task
    │    │           → Continue location updates
    │    │
    │    └── Denied → Stop location updates
    │               → Driver may go "stale" on server
    │
    ├──▶ iOS: App may be suspended
    │    └── On resume: Check if location task survived
    │
    └──▶ Android: Foreground service needed
         └── NOT IMPLEMENTED — risk of OS kill
```

---

## 7. Recovery Flows

### 7.1 Network Recovery
```
Network restored
    │
    ├──▶ Reconnect Socket.IO
    ├──▶ Resume location updates
    ├──▶ Refresh current screen
    └──▶ Hide offline banner
```

### 7.2 Location Recovery
```
Location permission re-granted
    │
    ├──▶ Restart location watcher
    ├──▶ POST /drivers/toggle-online { is_online: true }
    └──▶ Resume receiving ride requests
```

---

## 8. Known Error Handling Gaps

1. **No foreground service** — Android may kill background location
2. **Silent location failure** — `catch(() => {})` in location update handler
3. **No ride request queue** — Missed Socket events during disconnect are lost
4. **No retry on ride acceptance** — If API call fails, ride is lost
5. **Progress bar is fake** — Not based on actual GPS progress
6. **No error tracking** — No Sentry integration for driver app crashes
