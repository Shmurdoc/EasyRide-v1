# Admin App — System Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Technical architecture of the Admin App — inspector, audit logs, TOTP enforcement, and dashboard components.

---

## 2. System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| AdminDashboardScreen | React Native | Main dashboard with widgets |
| LuxuriousMenu | Custom component | Navigation overlay menu |
| useAdminDashboard | Custom hook | Dashboard data fetching |
| useInspectorStats | Custom hook | System health polling (30s) |
| Dashboard components | 12+ widgets | Fleet status, charts, feed |

---

## 3. API Endpoints Used

### 3.1 Dashboard
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/dashboard` | DashboardScreen mount | `{ stats, fleet, rides, drivers }` |
| GET | `/admin/stats` | DashboardScreen mount | `{ users, drivers, rides, revenue }` |

### 3.2 Inspector
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/inspector/api-stats` | Every 30s | `{ avg_response_time, endpoints }` |
| GET | `/inspector/ride-flow` | Every 30s | `{ rides_per_minute, active }` |
| GET | `/inspector/queue-health` | Every 30s | `{ pending, processing, failed }` |
| GET | `/inspector/my-stats` | On demand | `{ admin statistics }` |

### 3.3 Driver Management
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/drivers` | DriversScreen mount | `{ data: Driver[] }` |
| GET | `/admin/drivers/{id}` | DriverDetailScreen | `{ driver }` |
| POST | `/admin/drivers/{id}/approve` | Approve button | `{ driver }` |
| POST | `/admin/drivers/{id}/reject` | Reject button | `{ driver }` |
| POST | `/admin/drivers` | Create driver | `{ driver }` |

### 3.4 User Management
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/users` | UsersScreen mount | `{ data: User[] }` |
| GET | `/users/{id}` | UserDetailScreen | `{ user }` |
| PUT | `/users/{id}` | Edit user | `{ user }` |

### 3.5 Rides
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/rides` | RidesScreen mount | `{ data: Ride[] }` |
| GET | `/rides/{id}` | RideDetailScreen | `{ ride }` |

### 3.6 Settings
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/settings` | SettingsScreen mount | `{ settings }` |
| POST | `/admin/settings` | Save settings | `{ settings }` |

### 3.7 Surge Pricing
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/surge-zones` | SurgeZonesScreen | `{ data: SurgeZone[] }` |
| POST | `/admin/surge-zones` | Create zone | `{ zone }` |
| PUT | `/admin/surge-zones/{id}` | Update zone | `{ zone }` |
| DELETE | `/admin/surge-zones/{id}` | Delete zone | `{ success }` |
| PATCH | `/admin/surge-zones/{id}/toggle` | Toggle zone | `{ zone }` |
| GET | `/admin/peak-hours` | PeakHoursScreen | `{ data: PeakHour[] }` |
| POST | `/admin/peak-hours` | Create rule | `{ rule }` |
| PUT | `/admin/peak-hours/{id}` | Update rule | `{ rule }` |
| DELETE | `/admin/peak-hours/{id}` | Delete rule | `{ success }` |
| PATCH | `/admin/peak-hours/{id}/toggle` | Toggle rule | `{ rule }` |

### 3.8 Compliance
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/compliance/kyc/pending` | KYC review | `{ data: KycVerification[] }` |
| POST | `/admin/compliance/kyc/{id}/approve` | Approve KYC | `{ verification }` |
| POST | `/admin/compliance/kyc/{id}/reject` | Reject KYC | `{ verification }` |
| GET | `/admin/compliance/incidents` | Incident list | `{ data: IncidentReport[] }` |
| POST | `/admin/compliance/incidents/{id}/resolve` | Resolve incident | `{ incident }` |

### 3.9 Audit & Reports
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/admin/audit-logs` | AuditLogScreen | `{ data: AuditLog[] }` |
| GET | `/admin/reports/dashboard` | ReportsScreen | `{ report }` |
| GET | `/admin/reports/revenue` | Revenue report | `{ revenue }` |
| GET | `/admin/reports/revenue/export` | Export CSV | File download |

### 3.10 TOTP (2FA)
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/admin/totp/enable` | Enable 2FA | `{ qr_code, secret }` |
| POST | `/admin/totp/verify` | Verify 2FA code | `{ verified }` |
| POST | `/admin/totp/disable` | Disable 2FA | `{ success }` |

---

## 4. TOTP 2FA Flow

```
Admin enables TOTP
    │
    ├──▶ POST /admin/totp/enable
    │    Response: { qr_code: "otpauth://...", secret: "XXXX" }
    │
    ├──▶ Display QR code to admin
    │    Admin scans with Google Authenticator
    │
    ├──▶ Admin enters 6-digit code
    │
    ├──▶ POST /admin/totp/verify
    │    { code: "123456" }
    │
    ├──▶ Server validates code
    │    ├── Valid → TOTP enabled, secret stored encrypted
    │    └── Invalid → "Invalid code" error
    │
    └──▶ Subsequent admin requests:
         ├── Include X-Totp-Code header
         ├── admin.totp middleware validates
         ├── Valid → Request proceeds
         └── Invalid → 403 Forbidden
```

**TOTP Enforcement:**
- All admin write operations require TOTP header
- `admin.totp` middleware checks `X-Totp-Code` header
- Code reuse prevention: Redis TTL 60 seconds
- TOTP secrets stored encrypted in `users.totp_secret`

---

## 5. Audit Log Flow

```
Admin performs action
    │
    ├──▶ Controller processes request
    │
    ├──▶ After successful operation:
    │    AdminAuditLog::create({
    │      tenant_id,
    │      user_id: admin.id,
    │      action: "driver.approve",
    │      resource_type: "DriverProfile",
    │      resource_id: driver.id,
    │      old_values: { is_approved: false },
    │      new_values: { is_approved: true },
    │      ip_address: request.ip(),
    │      user_agent: request.userAgent()
    │    })
    │
    └──▶ Log visible in AuditLogScreen
```

---

## 6. Dashboard Component Architecture

```
AdminDashboardScreen
├── FleetStatusWidget
│   ├── Online/Offline counts
│   ├── On-ride/Idle counts
│   └── Real-time updates via Socket.IO
├── ActiveRidesWidget
│   ├── Active ride count
│   ├── Pool ride count
│   └── Pending ride count
├── HourlyChartWidget
│   ├── Bar chart (rides per hour)
│   └── Uses react-native-chart-kit
├── TopDriversWidget
│   ├── Top 5 drivers by rides today
│   └── Rating, trip count
├── ActivityFeedWidget
│   ├── Recent events
│   └── Ride completions, approvals, alerts
├── InspectorCardsWidget
│   ├── API Health (response time)
│   ├── Ride Flow (rides/min)
│   └── Queue Health (pending jobs)
└── LuxuriousMenu
    ├── Navigation overlay
    └── Tab switching
```

---

## 7. Inspector Polling System

```
useInspectorStats(30000)
    │
    ├──▶ Every 30 seconds:
    │    ├── GET /inspector/api-stats
    │    ├── GET /inspector/ride-flow
    │    └── GET /inspector/queue-health
    │
    ├──▶ Update dashboard cards
    │
    └──▶ Cleanup on unmount:
         └── clearInterval
```

**⚠ Issue:** 30s polling is wasteful for real-time data. Should use Socket.IO push.
