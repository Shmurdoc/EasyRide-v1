# Rider App — Error Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Error handling and recovery strategy for the Rider App.

---

## 2. Error Categories

| Category | Severity | Examples | User Impact |
|----------|----------|----------|-------------|
| Network | HIGH | No internet, timeout, DNS failure | App unusable |
| Auth | HIGH | Token expired, invalid credentials | Can't access app |
| API | MEDIUM | Server error, validation error | Feature broken |
| Socket | HIGH | Disconnection, auth failure | Real-time broken |
| Location | MEDIUM | Permission denied, GPS unavailable | Can't set pickup |
| Payment | HIGH | Gateway failure, insufficient funds | Can't complete ride |
| Map | LOW | Map load failure, marker issues | Visual degradation |

---

## 3. Error Handling Matrix

| Error | HTTP Status | Source | User Message | Recovery |
|-------|-------------|--------|--------------|----------|
| Network timeout | - | Axios | "Network error. Check your connection." | Retry button |
| No internet | - | NetInfo | "You're offline" banner | Auto-reconnect |
| Invalid credentials | 401 | API | "Login Failed" with server message | Re-enter credentials |
| Token expired | 401 | API | Redirect to login | Re-login required |
| Account locked | 429 | API | "Account locked. Try again in 15 minutes." | Wait |
| Validation error | 422 | API | Field-level errors | Fix input |
| Server error | 500 | API | "Something went wrong" | Retry later |
| Rate limited | 429 | API | "Too many requests" | Wait + retry |
| Ride not found | 404 | API | "Ride not found" | Navigate home |
| Ride state error | 422 | API | "Invalid ride action" | Refresh screen |
| Payment failed | 402/500 | API/Gateway | "Payment Failed" | Retry or change method |
| Insufficient funds | 422 | API | "Insufficient wallet balance" | Use different method |
| Socket disconnect | - | Socket.IO | "Connection lost. Reconnecting..." | Auto-reconnect |
| Socket auth fail | - | Socket.IO | Redirect to login | Re-login required |
| Location denied | - | Expo Location | "Location permission required" | Open settings |
| Location unavailable | - | Expo Location | "Location unavailable" | Use default location |
| Map load failure | - | react-native-maps | Map doesn't render | Retry |

---

## 4. Client-Side Error Handling

### 4.1 Network Errors

```typescript
// Axios interceptor pattern (in api-client)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      // Timeout
      Alert.alert('Network error', 'Request timed out. Check your connection.');
    } else if (!error.response) {
      // No network
      // Queue request for offline (if implemented)
    } else if (error.response.status === 401) {
      // Token expired
      logout(); // Clear token, redirect to login
    }
    return Promise.reject(error);
  }
);
```

**Current behavior:** Generic error alerts. No retry logic. No offline queue.

### 4.2 UI Error States

| Screen | Loading State | Error State | Empty State |
|--------|--------------|-------------|-------------|
| HomeScreen | Skeleton loader | "Failed to load" | "Where to?" prompt |
| BookRideScreen | Fare loading spinner | "Could not calculate fare" | "Enter destination" |
| RideTrackingScreen | "Searching for driver..." | "Ride not found" | N/A |
| PaymentScreen | Payment processing | "Payment failed" | "No rides to pay for" |
| RideHistoryScreen | Loading spinner | "Failed to load history" | "No rides yet" |
| RestaurantList | Loading spinner | "Failed to load restaurants" | "No restaurants nearby" |

### 4.3 ErrorBoundary

```typescript
// Wraps entire app in App.tsx
<ErrorBoundary>
  <AuthProvider>
    {/* Navigation */}
  </AuthProvider>
</ErrorBoundary>
```

**Behavior:** Catches unhandled render errors, shows fallback UI. Does NOT log to Sentry.

---

## 5. Server-Side Error Handling

### 5.1 API Error Response Format

```json
// Success
{
  "success": true,
  "message": "Success",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field": ["Error 1", "Error 2"]
  }
}
```

### 5.2 Common Server Errors

| Error | Cause | Backend Handling |
|-------|-------|-----------------|
| `RuntimeException` | Business logic failure | 422 with message |
| `ValidationException` | Form request validation | 422 with field errors |
| `AuthenticationException` | Invalid/missing token | 401 Unauthorized |
| `AuthorizationException` | Insufficient permissions | 403 Forbidden |
| `ModelNotFoundException` | Resource not found | 404 Not Found |
| `QueryException` | Database constraint | 500 (logged to Sentry) |

### 5.3 Sentry Integration

- Error tracking with SQL query breadcrumbs
- Redis breadcrumbs for cache operations
- HTTP client breadcrumbs for API calls
- 25% trace sampling rate
- 10% profile sampling rate

---

## 6. Real-Time Error Handling

### 6.1 Socket.IO Disconnect

```
Socket disconnect detected
    │
    ├──▶ Show "Connection lost" banner
    │
    ├──▶ Start reconnection with exponential backoff:
    │    Attempt 1: 1s delay
    │    Attempt 2: 2s delay
    │    Attempt 3: 4s delay
    │    Attempt 4: 8s delay
    │    Max: 30s delay
    │
    ├──▶ On reconnect:
    │    ├── Re-authenticate (join rooms)
    │    ├── Resume event listeners
    │    ├── Flush queued events (if any)
    │    └── Hide "Connection lost" banner
    │
    └──▶ After max retries:
         Show "Connection failed. Please restart the app."
```

### 6.2 Socket Auth Failure

```
Socket auth error received
    │
    ├──▶ Token may be expired
    │
    ├──▶ Attempt token refresh via GET /auth/me
    │    ├── Success → Reconnect with new token
    │    └── Failure → Logout, redirect to login
    │
    └──▶ Clear all socket state
```

---

## 7. Payment Error Handling

| Error | Scenario | Resolution |
|-------|----------|------------|
| Gateway timeout | PayFast/Ozow redirect timeout | Show "Payment may have processed. Check history." |
| Gateway rejection | Card declined by bank | "Card was declined. Try another method." |
| Idempotency conflict | Duplicate payment attempt | Use existing payment record |
| Insufficient funds | Wallet balance < fare | "Insufficient balance. Top up or use another method." |
| Escrow hold failed | Payment processed but escrow failed | Payment still recorded, manual review |
| Webhook signature invalid | Tampered webhook | Reject, log to Sentry |

---

## 8. Location Error Handling

| Error | Scenario | Resolution |
|-------|----------|------------|
| Permission denied | User denies location | Show "Location required" with settings link |
| Permission permanently denied | Android "Don't ask again" | Direct to app settings |
| GPS unavailable | No GPS signal | Use last known location |
| Location timeout | Can't get location in 10s | Use Phalaborwa center default |
| Background location denied | iOS restrictions | Foreground-only tracking |

---

## 9. Recovery Flows

### 9.1 Network Recovery
```
Network restored (NetInfo event)
    │
    ├──▶ Reconnect Socket.IO
    │
    ├──▶ Flush offline queue (if implemented)
    │
    ├──▶ Refresh current screen data
    │
    └──▶ Hide offline banner
```

### 9.2 Token Recovery
```
401 received on API call
    │
    ├──▶ Try refresh via GET /auth/me
    │    ├── Success → Retry original request
    │    └── Failure → Continue to logout
    │
    ├──▶ Clear stored token
    │
    ├──▶ Navigate to LoginScreen
    │
    └──▶ Show "Session expired. Please login again."
```

---

## 10. Monitoring & Alerting

| Metric | Threshold | Alert Channel |
|--------|-----------|---------------|
| API error rate | >5% of requests | Sentry |
| Socket disconnect rate | >10% of connections | Sentry |
| Payment failure rate | >2% of attempts | Sentry + email |
| Location permission denial | >20% of users | Analytics |
| App crashes | Any | Sentry |

---

## 11. Known Error Handling Gaps

1. **No retry logic** — Network errors show alert but no retry button
2. **No offline mode** — App is fully online-dependent
3. **No optimistic updates** — All mutations wait for server response
4. **ErrorBoundary doesn't log** — Render errors are caught but not tracked
5. **No request deduplication** — Rapid taps can create duplicate rides
6. **No circuit breaker** — Failed APIs keep being called
7. **Socket reconnect not visible** — User doesn't know reconnection is happening
8. **Payment redirect no status check** — After browser redirect, status isn't auto-checked
