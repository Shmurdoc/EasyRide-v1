# Admin App — User Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02
**Screens:** 12
**App:** `mobile/apps/admin`

---

## 1. Overview

The Admin App is the operations-center application. Admins monitor fleet status, manage drivers/users, configure pricing, handle KYC/compliance, and review system health. The platform has a central admin model (1-3 operators).

---

## 2. Actors

| Actor | Role | Access Level |
|-------|------|-------------|
| Admin | Platform operator | Full access + TOTP 2FA required |
| Super Admin | Highest privilege | Everything + can manage other admins |

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
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AdminDashboard  │
│  Screen          │
└──────────────────┘
```

**Login:** Same as rider/driver — `POST /auth/login` with admin credentials. Token stored in SecureStore.

---

### 3.2 Dashboard (AdminDashboardScreen)

```
┌──────────────────────────────────────────┐
│  AdminDashboardScreen                     │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │  Fleet Status                        │ │
│  │  Online: 15 | Offline: 45           │ │
│  │  On Ride: 8 | Idle: 7               │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Active Rides: 8                     │ │
│  │  Pool Rides: 2                       │ │
│  │  Pending Rides: 3                    │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Hourly Ride Chart (bar chart)       │ │
│  │  ████████░░░░░░░░                    │ │
│  │  6am  9am  12pm  3pm  6pm           │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Top Drivers:                        │ │
│  │  1. John D. ★4.9 (12 rides)        │ │
│  │  2. Sarah M. ★4.8 (10 rides)       │ │
│  │  3. Mike K. ★4.7 (9 rides)         │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Activity Feed:                      │ │
│  │  • Ride #1234 completed             │ │
│  │  • Driver Mike approved             │ │
│  │  • SOS alert from rider             │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Inspector Cards:                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ API      │ │ Ride     │ │ Queue    │ │
│  │ Health   │ │ Flow     │ │ Health   │ │
│  │ ● 45ms   │ │ 12/min   │ │ 0 pending│ │
│  └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────┤
│  [🏠 Dashboard] [🚗 Rides] [👤 Drivers] │
│  [👥 Users]    [⚙ Settings] [☰ Menu]   │
└──────────────────────────────────────────┘
```

**Data Sources:**
- `GET /admin/dashboard` — fleet stats, active rides, top drivers
- `GET /inspector/api-stats` — API response times
- `GET /inspector/ride-flow` — rides per minute
- `GET /inspector/queue-health` — queue depth
- Socket.IO — real-time fleet positions

**Auto-Refresh:** Inspector stats poll every 30 seconds via `useInspectorStats(30000)`.

---

### 3.3 Driver Management

```
┌──────────────────────────────────────────┐
│  DriversScreen                            │
├──────────────────────────────────────────┤
│  Filter: [All] [Pending] [Approved] [Rejected]│
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  [Avatar] John D.                    │ │
│  │  Status: PENDING | Applied: 2 days ago│ │
│  │  [Approve] [Reject] [View Details]   │ │
│  ├──────────────────────────────────────┤ │
│  │  [Avatar] Sarah M.                   │ │
│  │  Status: APPROVED | Rating: 4.8      │ │
│  │  [View Details]                      │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         │
         ▼ (View Details)
┌──────────────────────────────────────────┐
│  DriverDetailScreen                       │
├──────────────────────────────────────────┤
│  Driver Info:                             │
│  Name: John D.                           │
│  Email: john@email.com                   │
│  Phone: +27 82 123 4567                  │
│  Status: PENDING                         │
│                                          │
│  Vehicle:                                │
│  Toyota Corolla | White | 2023           │
│  Plate: LPS 123 GP                       │
│                                          │
│  KYC Documents:                          │
│  [ID Document] ✓ | [License] ✓          │
│  [Vehicle Reg] ✓ | [Insurance] ✓        │
│                                          │
│  Actions:                                │
│  [Approve Driver] [Reject Driver]        │
│  [View Rides] [View Earnings]            │
└──────────────────────────────────────────┘
```

**API Calls:**
1. `GET /admin/drivers` — list drivers with filters
2. `GET /admin/drivers/{id}` — driver details
3. `POST /admin/drivers/{id}/approve` — approve driver
4. `POST /admin/drivers/{id}/reject` — reject driver
5. `GET /admin/compliance/kyc/pending` — pending KYC
6. `POST /admin/compliance/kyc/{id}/approve` — approve KYC
7. `POST /admin/compliance/kyc/{id}/reject` — reject KYC

---

### 3.4 Surge Pricing Management

```
┌──────────────────────────────────────────┐
│  SurgePricingScreen                       │
├──────────────────────────────────────────┤
│  Surge Zones:                             │
│  ┌──────────────────────────────────────┐ │
│  │  Zone: CBD                            │ │
│  │  Center: -23.9, 29.46                │ │
│  │  Radius: 2000m                       │ │
│  │  Multiplier: 1.5x                    │ │
│  │  [Edit] [Delete] [Toggle]            │ │
│  ├──────────────────────────────────────┤ │
│  │  Zone: Mall                          │ │
│  │  Multiplier: 1.2x                    │ │
│  │  [Edit] [Delete] [Toggle]            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  [Add Surge Zone]                         │
├──────────────────────────────────────────┤
│  Peak Hours:                              │
│  ┌──────────────────────────────────────┐ │
│  │  Morning Rush                        │ │
│  │  Mon-Fri | 07:00-09:00              │ │
│  │  Multiplier: 1.3x                    │ │
│  │  [Edit] [Delete] [Toggle]            │ │
│  ├──────────────────────────────────────┤ │
│  │  Evening Rush                        │ │
│  │  Mon-Fri | 17:00-19:00              │ │
│  │  Multiplier: 1.4x                    │ │
│  │  [Edit] [Delete] [Toggle]            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  [Add Peak Hour Rule]                     │
└──────────────────────────────────────────┘
```

**API Calls:**
1. `GET /admin/surge-zones` — list zones
2. `POST /admin/surge-zones` — create zone
3. `PUT /admin/surge-zones/{id}` — update zone
4. `DELETE /admin/surge-zones/{id}` — delete zone
5. `PATCH /admin/surge-zones/{id}/toggle` — enable/disable
6. Same CRUD for `/admin/peak-hours`

---

### 3.5 Other Screens

**RidesScreen:** All rides with status filters. Tap → RideDetailScreen.

**UsersScreen:** All users with search. Tap → UserDetailScreen.

**SettingsScreen:** Platform settings (pricing, system config).

**PeakHoursScreen:** Peak hour pricing rules.

**SurgeZonesScreen:** Geographic surge zone management.

---

## 4. Navigation Structure

```
Stack
├── Login (not authenticated)
└── Main (authenticated) → MainScreen with BottomTabs + LuxuriousMenu
    ├── Dashboard (stats, menu overlay)
    ├── Rides
    ├── Drivers
    ├── Users
    └── Settings
├── AdminRideDetail
├── AdminDriverDetail
├── AdminUserDetail
├── AdminSurgePricing
├── AdminSurgeZones
└── AdminPeakHours
```

---

## 5. State Management

| State | Storage | Scope |
|-------|---------|-------|
| Auth (user, token) | React Context | Global |
| Dashboard data | useAdminDashboard hook | Dashboard |
| Inspector stats | useInspectorStats hook (30s poll) | Dashboard |
| Fleet positions | Socket.IO | Global |
| Menu state | useState | LuxuriousMenu |

---

## 6. Security Considerations

- Sanctum token auth + `role:admin|super-admin` middleware
- TOTP 2FA required for admin operations (`admin.totp` middleware)
- All admin actions logged to `AdminAuditLog` table
- IP address and user agent tracked on every admin action
- Old/new values captured for all changes
