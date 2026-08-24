# Admin App — Integration Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Third-party service integrations used by the Admin App.

---

## 2. Integration Map

| Service | Purpose | Protocol | Authentication |
|---------|---------|----------|----------------|
| Socket.IO | Real-time fleet monitoring | WebSocket | Sanctum token |
| Inspector API | System health metrics | REST API | Sanctum token |
| Firebase (FCM) | Push notifications | HTTP v1 | Service Account |
| Google Maps | Fleet map display | SDK | API Key |

---

## 3. Integration Flows

### 3.1 Real-Time Fleet Monitoring

```
Socket.IO Connection
    │
    ├──▶ Join room: admin
    │
    ├──▶ Receive events:
    │    ├── ride:status-change → Update ride counts
    │    ├── driver:toggle-online → Update fleet status
    │    ├── ride:completed → Update activity feed
    │    ├── sos:triggered → Show SOS alert
    │    └── ride:location → Update fleet positions on map
    │
    └──▶ Emit events:
         └── (none — admin is read-only for real-time)
```

### 3.2 Inspector API Integration

```
useInspectorStats(30000)
    │
    ├──▶ Every 30 seconds:
    │    │
    │    ├──▶ GET /inspector/api-stats
    │    │    Response: {
    │    │      avg_response_time: 45,
    │    │      p95_response_time: 120,
    │    │      error_rate: 0.02,
    │    │      endpoints: [
    │    │        { path: "/rides", method: "POST", avg_time: 85, count: 150 },
    │    │        ...
    │    │      ]
    │    │    }
    │    │
    │    ├──▶ GET /inspector/ride-flow
    │    │    Response: {
    │    │      rides_per_minute: 12,
    │    │      active_rides: 8,
    │    │      pending_requests: 3,
    │    │      completion_rate: 0.95
    │    │    }
    │    │
    │    └──▶ GET /inspector/queue-health
    │         Response: {
    │           pending: 0,
    │           processing: 3,
    │           failed: 0,
    │           oldest_job_age: 45,
    │           queues: {
    │             default: { pending: 0, processing: 1 },
    │             rides: { pending: 0, processing: 1 },
    │             payments: { pending: 0, processing: 1 }
    │           }
    │         }
    │
    └──▶ Update dashboard inspector cards
```

### 3.3 Push Notification to Drivers

```
Admin approves driver
    │
    ├──▶ POST /admin/drivers/{id}/approve
    │
    ├──▶ Backend processes:
    │    ├── Update driver profile: is_approved = true
    │    ├── Create audit log entry
    │    └── Dispatch push notification:
    │        NotificationService::send(
    │          userId: driver.user_id,
    │          title: "Account Approved",
    │          body: "Your driver account has been approved!",
    │          type: "driver_approved"
    │        )
    │
    └──▶ FCM delivers to driver's device
```

---

## 4. Rate Limits

| Service | Limit | Window | Action |
|---------|-------|--------|--------|
| Inspector API | 60 | 1 minute | 429 |
| Admin endpoints | 60 | 1 minute | 429 |
| Global API | 60 | 1 minute | 429 |
| Socket.IO | 60 events | 1 minute | Event dropped |

---

## 5. Fallback Strategies

| Failure Scenario | Primary | Fallback | Impact |
|------------------|---------|----------|--------|
| Socket.IO down | Real-time fleet | REST polling (30s) | Delayed updates |
| Inspector API down | System health | "Unknown" on cards | Blind to issues |
| FCM down | Push to drivers | In-app notifications | Delayed alerts |
| API down | All admin ops | Error screen | Can't manage platform |
| Google Maps down | Fleet map | No map | Can't see positions |

---

## 6. Monitoring

| Service | Health Check | Frequency |
|---------|-------------|-----------|
| Backend API | GET /health | Every 30s |
| Socket.IO | Connection status | Real-time |
| Inspector API | Response time | Every 30s |
| FCM | Token registration | Per notification |
