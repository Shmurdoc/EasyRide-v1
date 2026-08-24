# Admin App — Data Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

How data moves through the Admin App — metrics aggregation, real-time fleet data, and management operations.

---

## 2. Data Sources

| Source | Type | Frequency | Volume |
|--------|------|-----------|--------|
| REST API | HTTP JSON | Per action + 30s poll | 1-50 KB |
| Socket.IO | WebSocket | Real-time | 50-200 bytes |
| Inspector API | HTTP JSON | Every 30s | 1-5 KB |
| AsyncStorage | Local | On read | <10 KB |

---

## 3. Data Flow Diagrams

### 3.1 Dashboard Data Flow
```
┌──────────────┐
│  App Launch  │
│  + Login     │
└──────┬───────┘
       │
       ▼
┌──────────────┐    GET /admin/dashboard
│  Dashboard   │──────────────────────────▶ Backend API
│  Load        │◀──────────────────────────
└──────┬───────┘    Response: {
       │             fleetStatus: { online, offline, onRide },
       │             activeRides: 8,
       │             poolRides: 2,
       │             hourlyChart: [...],
       │             topDrivers: [...],
       │             recentActivity: [...]
       │           }
       │
       ├──▶ useInspectorStats(30000)
       │    │
       │    ├──▶ GET /inspector/api-stats (every 30s)
       │    │    Response: { avg_response_time: 45, endpoints: [...] }
       │    │
       │    ├──▶ GET /inspector/ride-flow (every 30s)
       │    │    Response: { rides_per_minute: 12, active: 8 }
       │    │
       │    └──▶ GET /inspector/queue-health (every 30s)
       │         Response: { pending: 0, processing: 3, failed: 0 }
       │
       └──▶ Socket.IO (real-time)
            │
            ├── ride:status-change → Update active rides
            ├── driver:toggle-online → Update fleet status
            └── ride:completed → Update activity feed
```

### 3.2 Driver Approval Flow
```
┌──────────────┐
│  Admin taps  │
│  "Approve"   │
└──────┬───────┘
       │
       ▼
┌──────────────┐    POST /admin/drivers/{id}/approve
│  API Call    │──────────────────────────▶ Backend API
│             │◀──────────────────────────
└──────┬───────┘    Response: { driver: { is_approved: true } }
       │
       ├──▶ AdminAuditLog created
       │    { action: "driver.approve", old: {is_approved: false}, new: {is_approved: true} }
       │
       ├──▶ Push notification sent to driver
       │    "Your account has been approved!"
       │
       └──▶ Dashboard refreshes driver count
```

### 3.3 Surge Zone Management Flow
```
┌──────────────┐
│  Admin creates│
│  surge zone   │
└──────┬───────┘
       │
       ▼
┌──────────────┐    POST /admin/surge-zones
│  API Call    │──────────────────────────▶ Backend API
│             │◀──────────────────────────
└──────┬───────┘    Response: { zone: { id, name, multiplier } }
       │
       ├──▶ SurgePricingService cache invalidated
       │    (Redis cache TTL 5 min)
       │
       ├──▶ AdminAuditLog created
       │
       └──▶ Next fare estimate uses new zone multiplier
```

---

## 4. Data Transformations

| Input | Transform | Output | Location |
|-------|-----------|--------|----------|
| API dashboard response | Format for widgets | Typed dashboard data | App |
| Inspector stats | Format for cards | "45ms", "12/min", "0 pending" | App |
| Driver list | Filter by status | Pending/Approved/Rejected views | App |
| Surge zone data | Format for map | Zone circles on map | App |
| Audit log entries | Format for list | Timestamp + action + user | App |

---

## 5. Data Privacy (Admin Access)

| Data Type | Admin Access | Restriction |
|-----------|-------------|-------------|
| User PII (name, email, phone) | Full view | Audit logged |
| Driver PII (license, ID) | Full view | Audit logged |
| Ride details | Full view | Audit logged |
| Payment details | Full view | Audit logged |
| Wallet balances | Full view | Audit logged |
| Location data | Real-time via Socket | Audit logged |
| System settings | Full edit | Audit logged + TOTP required |
| KYC documents | Download | Audit logged |

---

## 6. Data Sync Patterns

| Pattern | Implementation | When |
|---------|---------------|------|
| Real-time push | Socket.IO | Fleet status, ride events |
| Polling | REST API (30s) | Inspector stats |
| On-demand | REST API | Driver/user lists, settings |
| Cache | Server-side Redis | Surge pricing, fare rates |
| Audit trail | Database write | Every admin action |
