# Admin App — Error Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Error handling and recovery strategy for the Admin App.

---

## 2. Error Categories

| Category | Severity | Examples | User Impact |
|----------|----------|----------|-------------|
| Auth | CRITICAL | Token expired, TOTP invalid | Can't manage platform |
| API | HIGH | Server error, validation | Feature broken |
| Socket | MEDIUM | Disconnect | Delayed real-time updates |
| Inspector | LOW | Polling failure | Blind to system health |
| Dashboard | HIGH | Data load failure | No visibility |
| TOTP | HIGH | Code expired, wrong code | Can't perform admin ops |

---

## 3. Error Handling Matrix

| Error | Source | User Message | Recovery |
|-------|--------|--------------|----------|
| Token expired | API 401 | Redirect to login | Re-login |
| TOTP invalid | API 403 | "Invalid 2FA code" | Re-enter code |
| TOTP not set up | API 403 | "2FA required" | Enable TOTP |
| API server error | API 500 | "Something went wrong" | Retry later |
| Validation error | API 422 | Field-level errors | Fix input |
| Dashboard load fail | API error | "Failed to load dashboard" | Pull-to-refresh |
| Socket disconnect | Socket.IO | "Connection lost" banner | Auto-reconnect |
| Inspector poll fail | API error | "System health unknown" | Next poll retry |
| Driver approval fail | API error | "Could not approve driver" | Retry |
| Settings save fail | API error | "Could not save settings" | Retry |

---

## 4. TOTP Error Handling

### 4.1 Code Expired
```
Admin enters TOTP code
    │
    ├──▶ POST /admin/totp/verify
    │    { code: "123456" }
    │
    ├──▶ Server checks Redis for code reuse
    │    ├── Code already used → "Code already used. Wait for new code."
    │    └── Code not used → Continue validation
    │
    ├──▶ Server validates code against secret
    │    ├── Valid → Mark as used (Redis TTL 60s)
    │    │         → Enable TOTP for account
    │    │
    │    └── Invalid → "Invalid 2FA code. Try again."
    │
    └──▶ Admin enters new code
```

### 4.2 TOTP Middleware Block
```
Admin tries to access protected endpoint
    │
    ├──▶ admin.totp middleware checks X-Totp-Code header
    │    ├── Header missing → 403 "TOTP verification required"
    │    ├── Header present → Validate code
    │    │   ├── Valid → Request proceeds
    │    │   └── Invalid → 403 "Invalid TOTP code"
    │    │
    │    └── TOTP not enabled → Skip middleware (allows setup)
    │
    └──▶ Admin must include X-Totp-Code header in all admin write requests
```

---

## 5. Dashboard Error Handling

### 5.1 Dashboard Load Failure
```
DashboardScreen mounts
    │
    ├──▶ GET /admin/dashboard
    │    ├── Success → Populate widgets
    │    └── Failure → Show error state
    │                  "Failed to load dashboard"
    │                  [Retry] button
    │
    └──▶ useInspectorStats(30000)
         ├── Success → Update inspector cards
         └── Failure → Show "Unknown" on cards
                       Next poll will retry
```

### 5.2 Partial Dashboard Data
```
Dashboard data loaded
    │
    ├──▶ fleetStatus present? → Show fleet card
    │   └── Missing → Show "No data" placeholder
    │
    ├──▶ hourlyChart present? → Show chart
    │   └── Missing → Hide chart widget
    │
    ├──▶ topDrivers present? → Show list
    │   └── Missing → Show "No drivers" message
    │
    └──▶ recentActivity present? → Show feed
        └── Missing → Show "No recent activity"
```

---

## 6. Socket.IO Error Handling

```
Socket disconnect detected
    │
    ├──▶ Show "Connection lost" banner
    │
    ├──▶ Auto-reconnect with exponential backoff
    │
    ├──▶ On reconnect:
    │    ├── Re-join admin room
    │    ├── Resume event listeners
    │    └── Hide banner
    │
    └──▶ After max retries:
         Show "Connection failed. Real-time updates unavailable."
```

---

## 7. Recovery Flows

### 7.1 TOTP Recovery
```
TOTP code not working
    │
    ├──▶ Check if time sync is correct
    │    (TOTP codes are time-based, 30s window)
    │
    ├──▶ Try next code (current + 1)
    │
    └──▶ If still failing:
         ├── Disable TOTP: POST /admin/totp/disable
         │   (requires current TOTP code)
         └── Re-enable TOTP: POST /admin/totp/enable
```

### 7.2 Dashboard Recovery
```
Dashboard in error state
    │
    ├──▶ Pull-to-refresh
    │
    ├──▶ If still failing:
    │    ├── Check network connection
    │    ├── Check API health: GET /health
    │    └── Restart app
    │
    └──▶ If API is down:
         Show "System maintenance. Try again later."
```

---

## 8. Known Error Handling Gaps

1. **No TOTP recovery codes** — If admin loses authenticator, account is locked
2. **No session management** — Can't see active sessions or revoke them
3. **No push notifications for admin** — SOS alerts only visible in-app
4. **No error tracking** — No Sentry integration for admin app
5. **Inspector polling silent failure** — Stats show "Unknown" but no alert
6. **No audit log export** — Can't export audit trail for compliance
