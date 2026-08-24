# EasyRyde Admin App — Design Spec

**Date:** 2026-06-30  
**Version:** 1.0  
**Status:** Draft  
**Reference:** `C:\wamp64\www\RideAway-master\New Frontend\admin.html`

---

## 1. Overview

The Admin app is the operations dashboard for EasyRyde Phalaborwa. It provides real-time visibility into fleet status, ride activity, driver/user management, financial analytics, and system configuration. The app matches the HTML reference design (dark theme, purple primary #6366f1) and consumes existing backend API endpoints.

### 1.1 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map placement | Dashboard tab only | Matches rider/driver pattern; other tabs are list-based |
| Data source | Real backend APIs | Production-ready from day one |
| Settings | Fully functional | Admin controls pricing, surge, zones |
| Deep-dive screens | 4 detail screens | Driver, User, Ride, Financial analytics |

---

## 2. Architecture

### 2.1 Package Structure

```
apps/admin/
├── App.tsx                              # Root: AuthProvider + NavigationContainer
├── index.js                             # Entry point
├── app.json                             # Expo config (za.co.easyryde.admin)
├── android/
│   └── app/src/main/AndroidManifest.xml # Location, Internet permissions
├── navigation/
│   ├── BottomTabNavigator.tsx            # 5-tab navigator
│   └── AdminStack.tsx                    # Stack for detail screens
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx              # Admin login
│   ├── dashboard/
│   │   └── DashboardScreen.tsx          # Map + stats + activity
│   ├── rides/
│   │   ├── RidesScreen.tsx              # Ride list with filters
│   │   └── RideDetailScreen.tsx         # Full ride lifecycle view
│   ├── drivers/
│   │   ├── DriversScreen.tsx            # Driver list with filters
│   │   └── DriverDetailScreen.tsx       # Full driver profile
│   ├── users/
│   │   ├── UsersScreen.tsx              # User list with filters
│   │   └── UserDetailScreen.tsx         # Full user/rider profile
│   ├── settings/
│   │   └── SettingsScreen.tsx           # System configuration
│   ├── analytics/
│   │   └── AnalyticsScreen.tsx          # Financial analytics + charts
│   └── profile/
│       └── AdminProfileScreen.tsx       # Admin account settings
├── components/
│   ├── common/
│   │   ├── StatCard.tsx                 # Reusable stat card (icon, value, label, trend)
│   │   ├── SearchBar.tsx                # Search input with icon
│   │   ├── FilterTabs.tsx              # Horizontal scrollable tab buttons
│   │   ├── EmptyState.tsx              # Empty list placeholder
│   │   ├── LoadingSpinner.tsx           # Activity indicator
│   │   ├── ErrorState.tsx              # Error + retry button
│   │   ├── Avatar.tsx                   # User avatar with initials fallback
│   │   ├── Badge.tsx                    # Status badge (online/offline/busy/active)
│   │   ├── Card.tsx                     # Surface card wrapper
│   │   └── ProgressBar.tsx             # Animated progress bar
│   ├── dashboard/
│   │   ├── FleetStatus.tsx             # 4-column fleet grid
│   │   ├── ActiveRidesCard.tsx          # Top 3 active rides
│   │   ├── ActivityFeed.tsx             # Recent activity list
│   │   ├── HourlyChart.tsx             # Bar chart (react-native-chart-kit)
│   │   └── TopDrivers.tsx              # Leaderboard top 3
│   ├── rides/
│   │   └── RideCard.tsx                # Ride list item
│   ├── drivers/
│   │   └── DriverCard.tsx              # Driver list item
│   └── users/
│       └── UserCard.tsx                # User list item
├── api/
│   ├── client.ts                        # Re-export from shared/api/client
│   ├── admin.ts                         # Admin API functions
│   └── types.ts                         # Admin-specific API types
├── hooks/
│   ├── useAdminDashboard.ts            # Dashboard data + polling
│   ├── useAdminRides.ts                # Ride list + pagination
│   ├── useAdminDrivers.ts              # Driver list + pagination
│   ├── useAdminUsers.ts                # User list + pagination
│   └── useAdminSettings.ts             # Settings CRUD
└── constants/
    └── theme.ts                         # Admin-specific theme tokens
```

### 2.2 Shared Dependencies

From `packages/shared/`:

| Import | Used For |
|--------|----------|
| `hooks/useAuth.tsx` | Admin login/logout, role verification |
| `api/client.ts` | HTTP client, token management |
| `constants/index.ts` | COLORS, GRADIENTS, PHALABORWA_LOCATIONS |
| `types/index.ts` | User, Ride, Driver, Vehicle types |
| `utils/mapUtils.ts` | PHALABORWA_CENTER, formatZAR, calculateDistance |

### 2.3 Navigation Structure

```
AdminStack (Stack.Navigator)
├── LoginScreen (if not authenticated)
└── MainTabs (BottomTabNavigator)
    ├── Dashboard (tab)
    ├── Rides (tab)
    │   └── RideDetail (push)
    ├── Drivers (tab)
    │   └── DriverDetail (push)
    ├── Users (tab)
    │   └── UserDetail (push)
    └── Settings (tab)
        ├── Analytics (push)
        └── AdminProfile (push)
```

Bottom tab bar: purple active color (#6366f1), gray inactive (#666), 5 tabs with icons.

---

### 3.11 Admin Profile Screen

**Purpose:** Admin account settings  
**Access:** Admin role required

**Layout:**

#### 3.11.1 Header
```
┌─────────────────────────────────────┐
│  ← Thabo Molefe                     │
│  Operations Manager                  │
│  admin@easyryde.com                  │
└─────────────────────────────────────┘
```

#### 3.11.2 Account Card
```
┌─────────────────────────────────────┐
│  Account Settings                   │
│  Name: Thabo Molefe                 │
│  Email: admin@easyryde.com          │
│  Role: Operations Manager           │
│  Last Login: 2 min ago              │
│                                     │
│  [Change Password]                  │
└─────────────────────────────────────┘
```

#### 3.11.3 Security Card
```
┌─────────────────────────────────────┐
│  Security                           │
│  Two-Factor Auth    [●──] ON       │
│  Session Timeout    30 min         │
│  Active Sessions: 1                │
│                                     │
│  [Sign Out All Other Sessions]      │
└─────────────────────────────────────┘
```

#### 3.11.4 Notifications Card
```
┌─────────────────────────────────────┐
│  Notification Preferences           │
│  New Ride Alerts        [●──] ON   │
│  Driver Alerts          [●──] ON   │
│  System Alerts          [●──] ON   │
│  Email Digest           [──○] OFF  │
└─────────────────────────────────────┘
```

#### 3.11.5 Log Out button

---

## 3. Screen Specifications

### 3.1 Login Screen

**Purpose:** Admin authentication  
**Access:** Unauthenticated users only

**Layout:**
- Dark background (#0f0f11)
- Purple logo/icon at top
- "EasyRyde Admin" title
- "Operations Dashboard" subtitle
- Email input field
- Password input field
- "Sign In" button (purple gradient)
- "EasyRyde Admin v4.0.0 • Phalaborwa, Limpopo" footer

**Behavior:**
- Calls `POST /api/v1/login` with `{ email, password }`
- On success: stores token, checks `role === 'admin'`, navigates to MainTabs
- On failure: shows error alert
- Loading state on button while authenticating

**API Contract:**
```typescript
POST /api/v1/login
Request: { email: string; password: string }
Response: {
  user: { id, name, email, role: 'admin', ... };
  token: string;
  token_type: 'Bearer';
}
```

---

### 3.2 Dashboard Screen

**Purpose:** Real-time operations overview  
**Access:** Admin role required  
**Data polling:** Every 30 seconds

**Layout (top to bottom):**

#### 3.2.1 Purple Gradient Header
```
┌─────────────────────────────────────┐
│  Dashboard              [LIVE] [Avatar] │
│  Monday, June 30, 2026              │
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐        │
│  │Revenue   │  │Rides     │        │
│  │R28,450   │  │156       │        │
│  │↑ +12.5%  │  │↑ +8.3%   │        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
```

**Stat cards data source:** `GET /admin/dashboard`

**API Response:**
```typescript
{
  total_users: number;
  total_drivers: number;
  total_rides: number;
  active_rides: number;
  total_revenue: number;
  rides_today: number;
  completed_today: number;
  revenue_today: number;
}
```

#### 3.2.2 Fleet Status Card
```
┌─────────────────────────────────────┐
│  Fleet Status              [Refresh]│
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │  42  │ │  28  │ │  14  │ │   5  │  │
│  │Active│ │Online│ │ Busy │ │Offline│ │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
└─────────────────────────────────────┘
```

**Data source:** Derived from `GET /admin/drivers` response — count by `is_online` status.

#### 3.2.3 Active Rides Card
```
┌─────────────────────────────────────┐
│  Active Rides        5 in progress  │
│  ┌─────────────────────────────────┐│
│  │ 🚗 Sarah Anderson              ││
│  │    Shoprite Centre → Kruger Gate││
│  │                    R185  ████░  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 🚗 Michael Brown               ││
│  │    Town Center → Namakgale      ││
│  │                     R95  ██████ ││
│  └─────────────────────────────────┘│
│  View All Rides →                   │
└─────────────────────────────────────┘
```

**Data source:** `GET /admin/rides?status=in_progress`

#### 3.2.4 Hourly Activity Chart
```
┌─────────────────────────────────────┐
│  Hourly Activity                    │
│  ▓▓                                 │
│  ▓▓ ▓▓       ▓▓                    │
│  ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓         │
│  6AM 8  10  12  2PM 4  6PM 8PM     │
└─────────────────────────────────────┘
```

**Data source:** `GET /admin/reports/revenue?period=today` (hourly breakdown)

#### 3.2.5 Recent Activity Feed
```
┌─────────────────────────────────────┐
│  Recent Activity                    │
│  ● Ride R-28460 completed     1m ago│
│  ● Mike Ndlovu went online     3m ago│
│  ● New user registered         5m ago│
│  ● Surge active in CBD (1.4x)  8m ago│
└─────────────────────────────────────┘
```

**Data source:** `GET /admin/audit-logs?per_page=10`

#### 3.2.6 Top Drivers Leaderboard
```
┌─────────────────────────────────────┐
│  Top Drivers Today                  │
│  #1 🟢 John Mkhonto     1847 trips │
│  #2 🟠 Sarah Dlamini    2156 trips │
│  #3 🟢 Mike Ndlovu      1234 trips │
└─────────────────────────────────────┘
```

**Data source:** Derived from `GET /admin/drivers?is_online=true` sorted by trip count.

#### 3.2.7 Map (Full-screen background)
- `react-native-maps` MapView with dark theme (CartoDB dark_all tiles)
- Driver markers: green (online), orange (busy), gray (offline)
- Ride markers: purple dots at destination
- Tapping marker shows driver/ride popup
- Map behind scrollable content (z-index layering)

**Driver marker data:** `GET /admin/drivers?is_online=true` (includes `latitude`/`longitude` from driverProfile)

---

### 3.3 Rides Screen

**Purpose:** Ride management and monitoring  
**Access:** Admin role required

**Layout:**
- Purple gradient header: "Ride Management" + LIVE badge
- Filter tabs: All | In Progress | Completed | Cancelled
- Search bar (search by ride ID, passenger name, driver name)
- Ride cards list (paginated, load more on scroll)

**Ride Card:**
```
┌─────────────────────────────────────┐
│  R-28471              IN PROGRESS  │
│  2 min ago                         │
│                                     │
│  🟢 John Mkhonto                   │
│     Toyota Corolla • LPS 123 GP    │
│                                     │
│  ● Shoprite Centre                 │
│  │                                 │
│  ▼ Kruger Gate                     │
│                                     │
│  Progress  ████████░░░░  45%       │
│                                     │
│  📞 Call    💬 Message    R185     │
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
GET /api/v1/admin/rides
Query: {
  status?: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  category?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}
Response: {
  data: Ride[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
```

**Ride Object:**
```typescript
interface Ride {
  id: string;
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  category: string; // 'standard' | 'premium' | 'food'
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  total_fare: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  rider: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  driver: {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicle?: {
      make: string;
      model: string;
      color: string;
      license_plate: string;
    };
  } | null;
  payment: {
    method: 'cash' | 'card' | 'wallet';
    status: 'pending' | 'completed' | 'refunded';
    amount: number;
  } | null;
  rating: {
    score: number;
    comment: string;
  } | null;
}
```

---

### 3.4 Ride Detail Screen

**Purpose:** Full ride lifecycle view for dispute resolution and debugging  
**Access:** Admin role required  
**Navigation:** Push from RidesScreen (tap ride card)

**Layout:**

#### 3.4.1 Header
```
┌─────────────────────────────────────┐
│  ← Ride R-28471                     │
│  Status: IN PROGRESS (purple badge) │
│  Created: 2 min ago                 │
└─────────────────────────────────────┘
```

#### 3.4.2 Route Card
```
┌─────────────────────────────────────┐
│  Route                              │
│  ● Shoprite Centre (pickup)        │
│  │  12.5 km • ~18 min              │
│  ▼ Kruger Gate (dropoff)           │
│                                     │
│  [Mini map with route polyline]     │
└─────────────────────────────────────┘
```

**Map:** Small static map showing pickup → dropoff route with markers.

#### 3.4.3 Participants Card
```
┌─────────────────────────────────────┐
│  Rider                              │
│  👤 Sarah Anderson                  │
│    sarah@email.com • +27 82 123 4567│
│    Rating: 4.9 ⭐ • 247 trips      │
│    [View Profile →]                 │
├─────────────────────────────────────┤
│  Driver                             │
│  🚗 John Mkhonto                    │
│    john@email.com • +27 83 234 5678 │
│    Toyota Corolla • LPS 123 GP     │
│    Rating: 4.8 ⭐ • 1847 trips     │
│    [View Profile →]                 │
└─────────────────────────────────────┘
```

#### 3.4.4 Payment Card
```
┌─────────────────────────────────────┐
│  Payment                            │
│  Method: Cash                       │
│  Status: Pending                    │
│  Fare: R185.00                      │
│  Distance: 12.5 km                  │
│  Duration: 18 min                   │
│                                     │
│  [Process Refund] (if completed)    │
└─────────────────────────────────────┘
```

#### 3.4.5 Timeline Card
```
┌─────────────────────────────────────┐
│  Ride Timeline                      │
│  ● 14:32 — Ride requested           │
│  ● 14:33 — Driver accepted          │
│  ● 14:41 — Driver arrived           │
│  ● 14:42 — Trip started             │
│  ● 14:58 — (In progress)            │
└─────────────────────────────────────┘
```

**Timeline events derived from:** `created_at`, `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at` fields.

#### 3.4.6 Rating Card (if completed)
```
┌─────────────────────────────────────┐
│  Rating                             │
│  ⭐⭐⭐⭐⭐ 4.9/5                  │
│  "Great driver, smooth ride"        │
│  Rider rated driver                 │
└─────────────────────────────────────┘
```

#### 3.4.7 Actions Card
```
┌─────────────────────────────────────┐
│  Actions                            │
│  [📞 Call Rider]  [📞 Call Driver]  │
│  [💬 Message Rider] [💬 Message Driver]│
│  [🚩 Flag Issue]  [↩️ Refund]       │
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
// Ride detail comes from the ride object in the list
// No separate endpoint needed — pass ride ID via navigation params
// If detail endpoint needed:
GET /api/v1/admin/rides/{rideId}
Response: Ride (same shape as list item, with full details)
```

---

### 3.5 Drivers Screen

**Purpose:** Driver management, approval, monitoring  
**Access:** Admin role required

**Layout:**
- Purple gradient header: "Drivers" + "Add" button
- Filter tabs: All | Online | Busy | Offline | Pending
- Search bar
- Driver cards list

**Driver Card:**
```
┌─────────────────────────────────────┐
│  🟢 John Mkhonto           Online  │
│     Toyota Corolla • LPS 123 GP    │
│                                     │
│  4.8      1847      CBD     Active │
│  Rating   Trips     Zone    Status  │
│                                     │
│  [View Profile]           [...]    │
└─────────────────────────────────────┘
```

**Pending Approval Card (different layout):**
```
┌─────────────────────────────────────┐
│  👤 Peter Thabo           PENDING  │
│     VW Polo • LPS 111 GP           │
│                                     │
│  Documents: ID ✓  License ✓  PDP ✓ │
│                                     │
│  [Approve ✓]              [Reject ✗]│
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
GET /api/v1/admin/drivers
Query: {
  is_online?: boolean;
  is_approved?: boolean;
  is_verified?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}
Response: {
  data: Driver[];
  current_page: number;
  last_page: number;
  total: number;
}

POST /api/v1/admin/drivers/{driverId}/approve
Response: { message: string; driver_profile: DriverProfile }

POST /api/v1/admin/drivers/{driverId}/reject
Response: { message: string }
```

**Driver Object:**
```typescript
interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_online: boolean;
  created_at: string;
  driverProfile: {
    id: string;
    is_approved: boolean;
    is_verified: boolean;
    rating: number;
    total_trips: number;
    total_earnings: number;
    license_number: string;
    license_expiry: string;
    background_check: boolean;
    approved_at: string | null;
    approved_by: string | null;
    latitude: number | null;
    longitude: number | null;
    current_zone: string | null;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
    vehicle_type: string;
  } | null;
}
```

---

### 3.6 Driver Detail Screen

**Purpose:** Full driver profile for management decisions  
**Access:** Admin role required  
**Navigation:** Push from DriversScreen

**Layout:**

#### 3.6.1 Header
```
┌─────────────────────────────────────┐
│  ← John Mkhonto                     │
│  🟢 Online                [Edit]   │
│  Driver since March 2024            │
└─────────────────────────────────────┘
```

#### 3.6.2 Stats Overview
```
┌─────────────────────────────────────┐
│  4.8       1847       R142,560     │
│  Rating    Total Trips Total Earnings│
└─────────────────────────────────────┘
```

#### 3.6.3 Personal Information Card
```
┌─────────────────────────────────────┐
│  Personal Information               │
│  Name: John Mkhonto                 │
│  Email: john@email.com              │
│  Phone: +27 83 234 5678            │
│  ID Number: 9001011234567           │
│  Joined: 15 March 2024              │
│  Last Active: 2 min ago             │
└─────────────────────────────────────┘
```

#### 3.6.4 Vehicle Information Card
```
┌─────────────────────────────────────┐
│  Vehicle Information                │
│  🚗 Toyota Corolla (2023)          │
│     Color: White                    │
│     Plate: LPS 123 GP              │
│     Type: Standard                  │
│                                     │
│  Documents:                         │
│  ✅ Vehicle Registration            │
│  ✅ Insurance Certificate           │
│  ✅ Vehicle Inspection              │
└─────────────────────────────────────┘
```

#### 3.6.5 Documents Card
```
┌─────────────────────────────────────┐
│  Verification Documents             │
│  ✅ Driver's License    Exp: 2026  │
│  ✅ ID Document                      │
│  ✅ Professional Driving Permit     │
│  ✅ Background Check   Passed      │
│  ✅ Vehicle Registration            │
│  ✅ Insurance Certificate           │
│                                     │
│  Verified by: Admin Thabo (2024-03-15)│
└─────────────────────────────────────┘
```

#### 3.6.6 Performance Card
```
┌─────────────────────────────────────┐
│  Performance                        │
│  Acceptance Rate: 96%              │
│  Cancellation Rate: 2.1%           │
│  Avg Rating: 4.8 ⭐                │
│  Total Earnings: R142,560          │
│  Avg Earnings/Trip: R77            │
│  Online Hours Today: 6.5h          │
└─────────────────────────────────────┘
```

#### 3.6.7 Recent Trips Card
```
┌─────────────────────────────────────┐
│  Recent Trips (last 5)              │
│  R-28471  CBD → Kruger Gate  R185  │
│  R-28460  Airport → Town     R95   │
│  R-28455  Lulekani → CBD    R78   │
│  R-28449  CBD → Namakgale   R112  │
│  R-28440  Town → Airport    R65   │
│                                     │
│  [View All Trips →]                 │
└─────────────────────────────────────┘
```

#### 3.6.8 Earnings Card
```
┌─────────────────────────────────────┐
│  Earnings                           │
│  This Week: R4,250                  │
│  Last Week: R3,890 (+9.3%)         │
│  This Month: R18,450               │
│                                     │
│  ┌─────┐                            │
│  │Chart│ Weekly earnings trend      │
│  └─────┘                            │
└─────────────────────────────────────┘
```

#### 3.6.9 Activity Timeline
```
┌─────────────────────────────────────┐
│  Activity Timeline                  │
│  ● 18:45 — Completed ride R-28471  │
│  ● 18:30 — Started ride R-28471    │
│  ● 18:15 — Accepted ride R-28471   │
│  ● 17:00 — Went online             │
│  ● 16:30 — Went offline            │
└─────────────────────────────────────┘
```

#### 3.6.10 Actions
```
┌─────────────────────────────────────┐
│  Actions                            │
│  [📞 Call]  [💬 Message]            │
│  [🚫 Suspend]  [📤 Export Data]     │
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
// Driver detail: pass driver ID via navigation params
// Use existing endpoints:
GET /api/v1/admin/drivers?search={driverId}   // Get driver info
GET /api/v1/admin/rides?driver_id={driverId}  // Get driver's rides
GET /api/v1/admin/reports/drivers?driver_id={driverId}  // Get driver stats
```

---

### 3.7 Users Screen

**Purpose:** Rider/user management  
**Access:** Admin role required

**Layout:**
- Purple gradient header: "Users"
- Filter tabs: All | Active | New (joined last 30 days)
- Search bar
- User cards list

**User Card:**
```
┌─────────────────────────────────────┐
│  👤 Sarah Anderson          Active  │
│     sarah@email.com                 │
│                                     │
│  4.9       247        2022         │
│  Rating    Trips     Joined        │
│                                     │
│  [View Profile]           [...]    │
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
GET /api/v1/admin/users
Query: {
  role?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}
Response: {
  data: User[];
  current_page: number;
  last_page: number;
  total: number;
}
```

**User Object:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  // Derived from rides:
  total_trips?: number;
  avg_rating?: number;
  total_spent?: number;
}
```

---

### 3.8 User Detail Screen

**Purpose:** Full rider profile for support and account management  
**Access:** Admin role required  
**Navigation:** Push from UsersScreen

**Layout:**

#### 3.8.1 Header
```
┌─────────────────────────────────────┐
│  ← Sarah Anderson                   │
│  Active                    [Edit]   │
│  Member since March 2022            │
└─────────────────────────────────────┘
```

#### 3.8.2 Stats Overview
```
┌─────────────────────────────────────┐
│  4.9       247        R18,450     │
│  Rating    Total Trips Total Spent  │
└─────────────────────────────────────┘
```

#### 3.8.3 Personal Information Card
```
┌─────────────────────────────────────┐
│  Personal Information               │
│  Name: Sarah Anderson               │
│  Email: sarah@email.com             │
│  Phone: +27 82 345 6789            │
│  Joined: 15 March 2022              │
│  Last Active: 5 min ago             │
│  Account Status: Active             │
└─────────────────────────────────────┘
```

#### 3.8.4 Ride History Card
```
┌─────────────────────────────────────┐
│  Ride History                       │
│  Total: 247 rides                   │
│  Completed: 239 (96.8%)            │
│  Cancelled: 8 (3.2%)               │
│                                     │
│  Last 5 rides:                      │
│  R-28471  CBD → Kruger Gate  R185  │
│  R-28460  Airport → Town     R95   │
│  R-28455  Lulekani → CBD    R78   │
│  R-28449  CBD → Namakgale   R112  │
│  R-28440  Town → Airport    R65   │
│                                     │
│  [View All Rides →]                 │
└─────────────────────────────────────┘
```

#### 3.8.5 Spending Card
```
┌─────────────────────────────────────┐
│  Spending                           │
│  Total Spent: R18,450              │
│  This Month: R1,250                │
│  Avg per Ride: R74.70              │
│  Payment Methods:                   │
│    💳 Visa •••• 4242                │
│    💵 Cash                          │
│                                     │
│  ┌─────┐                            │
│  │Chart│ Monthly spending trend     │
│  └─────┘                            │
└─────────────────────────────────────┘
```

#### 3.8.6 Ratings Given Card
```
┌─────────────────────────────────────┐
│  Ratings Given by This User         │
│  ⭐⭐⭐⭐⭐ 4.8 avg (239 ratings)  │
│                                     │
│  Recent ratings:                    │
│  "Great driver!" — R-28471 ⭐⭐⭐⭐⭐│
│  "Smooth ride" — R-28460 ⭐⭐⭐⭐   │
│  "On time" — R-28455 ⭐⭐⭐⭐⭐     │
└─────────────────────────────────────┘
```

#### 3.8.7 Saved Locations Card
```
┌─────────────────────────────────────┐
│  Saved Locations                    │
│  🏠 Home: 12 Main St, Phalaborwa   │
│  🏢 Work: Shoprite Centre, CBD     │
│  ❤️ Favorite: Kruger Gate          │
└─────────────────────────────────────┘
```

#### 3.8.8 Support Tickets Card
```
┌─────────────────────────────────────┐
│  Support History                    │
│  #TK-142 — Refund request — Open   │
│  #TK-138 — Lost item — Resolved    │
│  #TK-135 — Driver complaint — Closed│
│                                     │
│  [View All Tickets →]               │
└─────────────────────────────────────┘
```

#### 3.8.9 Actions
```
┌─────────────────────────────────────┐
│  Actions                            │
│  [📞 Call]  [💬 Message]            │
│  [🚫 Ban Account]  [🎁 Add Credit]  │
│  [📤 Export Data]                   │
└─────────────────────────────────────┘
```

---

### 3.9 Settings Screen

**Purpose:** System configuration  
**Access:** Admin role required

**Layout:**

#### 3.9.1 Pricing Card
```
┌─────────────────────────────────────┐
│  PRICING SETTINGS                   │
│                                     │
│  Base Fare              R25.00      │
│  ═══════════════════●═══════════   │
│                                     │
│  Per KM Rate            R8.50      │
│  ════════════●══════════════════   │
│                                     │
│  Per Minute Rate        R1.50      │
│  ════●═════════════════════════   │
└─────────────────────────────────────┘
```

**API:**
```typescript
GET /api/v1/admin/settings
// Returns: { base_fare: { value: '25', type: 'number' }, per_km: { value: '8.5', ... }, ... }

POST /api/v1/admin/settings
Body: {
  key: 'base_fare';
  value: '30';
  type: 'number';
  description: 'Base fare for all rides';
}
```

#### 3.9.2 Surge Pricing Card
```
┌─────────────────────────────────────┐
│  SURGE PRICING                      │
│  Enable Surge Pricing    [●──] ON  │
│  Max Surge Multiplier    3.0x      │
│  ═══════════════════●═══════════   │
│  Peak Hour Boost        1.4x Active│
└─────────────────────────────────────┘
```

#### 3.9.3 Service Zones Card
```
┌─────────────────────────────────────┐
│  SERVICE ZONES                      │
│  📍 Phalaborwa CBD         1.4x    │
│  📍 Airport Zone           1.0x    │
│  📍 Township Areas         1.0x    │
│  [+ Add Zone]                       │
└─────────────────────────────────────┘
```

#### 3.9.4 System Settings Card
```
┌─────────────────────────────────────┐
│  SYSTEM SETTINGS                    │
│  🔔 Push Notifications    [●──] ON │
│  📧 Email Alerts          [●──] ON │
│  🔒 Two-Factor Auth       [●──] ON │
└─────────────────────────────────────┘
```

#### 3.9.5 App Information
```
┌─────────────────────────────────────┐
│  APP INFORMATION                    │
│  Version        4.0.0               │
│  Build          2026.06.30.1        │
│  Region         Phalaborwa, Limpopo │
│  Environment    Production          │
└─────────────────────────────────────┘
```

#### 3.9.6 Log Out button

---

### 3.10 Analytics Screen (Financial)

**Purpose:** Revenue analytics and financial reporting  
**Access:** Admin role required  
**Navigation:** Push from Settings or Dashboard

**Layout:**

#### 3.10.1 Period Selector
```
┌─────────────────────────────────────┐
│  [Today] [This Week] [This Month] [Custom] │
└─────────────────────────────────────┘
```

#### 3.10.2 Revenue Summary Cards
```
┌─────────────────────────────────────┐
│  Revenue Today    Revenue This Week │
│  R28,450          R156,780         │
│  ↑ +12.5%         ↑ +8.3%          │
├─────────────────────────────────────┤
│  Revenue This Month  Avg per Ride  │
│  R624,500            R181          │
│  ↑ +15.2%            ↑ +3.1%       │
└─────────────────────────────────────┘
```

#### 3.10.3 Revenue Chart
```
┌─────────────────────────────────────┐
│  Revenue Trend                      │
│  ┌─────┐                            │
│  │     │ Line chart showing daily   │
│  │  ╱╲ │ revenue over selected      │
│  │ ╱  ╲│ period                     │
│  └─────┘                            │
└─────────────────────────────────────┘
```

#### 3.10.4 Revenue by Zone
```
┌─────────────────────────────────────┐
│  Revenue by Zone                    │
│  Phalaborwa CBD    R45,200  (35%)  │
│  ████████████████░░░░░              │
│  Airport           R28,100  (22%)  │
│  ██████████░░░░░░░░░░░              │
│  Township Areas    R32,400  (25%)  │
│  ████████████░░░░░░░░░              │
│  Other             R22,800  (18%)  │
│  █████████░░░░░░░░░░░░              │
└─────────────────────────────────────┘
```

#### 3.10.5 Top Drivers by Earnings
```
┌─────────────────────────────────────┐
│  Top Drivers by Earnings            │
│  #1 John Mkhonto    R8,450  142 trips│
│  #2 Sarah Dlamini   R7,200  128 trips│
│  #3 Mike Ndlovu     R6,100  115 trips│
│  #4 Anna Khoza      R5,800  108 trips│
│  #5 Tom Mulaudzi    R4,900   92 trips│
└─────────────────────────────────────┘
```

#### 3.10.6 Rides by Status
```
┌─────────────────────────────────────┐
│  Rides Today by Status              │
│  Completed:  142  (91%)            │
│  Cancelled:    8  (5.1%)           │
│  In Progress:  6  (3.9%)           │
└─────────────────────────────────────┘
```

#### 3.10.7 Export Button
```
┌─────────────────────────────────────┐
│  [📊 Export to CSV]                 │
└─────────────────────────────────────┘
```

**API Contract:**
```typescript
GET /api/v1/admin/reports/revenue
Query: {
  period?: 'today' | 'week' | 'month' | 'custom';
  from_date?: string;
  to_date?: string;
}
Response: {
  total_revenue: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  avg_per_ride: number;
  revenue_by_zone: { zone: string; revenue: number; percentage: number }[];
  top_drivers: { driver_id: string; name: string; earnings: number; trips: number }[];
  rides_by_status: { status: string; count: number; percentage: number }[];
  daily_breakdown: { date: string; revenue: number; rides: number }[];
}

GET /api/v1/admin/reports/dashboard
Response: {
  // Aggregated dashboard metrics
}

POST /api/v1/admin/reports/revenue/export
Body: { period: string; from_date?: string; to_date?: string }
Response: { download_url: string }
```

---

## 4. API Layer

### 4.1 `api/admin.ts`

```typescript
import { apiGet, apiPost } from '../shared/api/client';

// Dashboard
export const getAdminDashboard = () => apiGet('/admin/dashboard');

// Rides
export const getAdminRides = (params: RideQuery) => apiGet('/admin/rides', params);
export const getAdminRideDetail = (id: string) => apiGet(`/admin/rides/${id}`);

// Drivers
export const getAdminDrivers = (params: DriverQuery) => apiGet('/admin/drivers', params);
export const approveDriver = (id: string) => apiPost(`/admin/drivers/${id}/approve`);
export const rejectDriver = (id: string) => apiPost(`/admin/drivers/${id}/reject`);
export const createDriver = (data: CreateDriverData) => apiPost('/admin/drivers', data);

// Users
export const getAdminUsers = (params: UserQuery) => apiGet('/admin/users', params);

// Settings
export const getAdminSettings = () => apiGet('/admin/settings');
export const updateAdminSetting = (data: UpdateSettingData) => apiPost('/admin/settings', data);

// Reports
export const getRevenueReport = (params: ReportQuery) => apiGet('/admin/reports/revenue', params);
export const getDashboardReport = () => apiGet('/admin/reports/dashboard');
export const exportRevenue = (params: ExportQuery) => apiPost('/admin/reports/revenue/export', params);

// Audit Logs
export const getAuditLogs = (params: AuditQuery) => apiGet('/admin/audit-logs', params);
```

### 4.2 Error Handling

All API calls follow this pattern:
```typescript
try {
  const data = await getAdminDashboard();
  setDashboard(data);
} catch (error: any) {
  if (error.status === 401) {
    // Token expired — redirect to login
    signOut();
  } else if (error.status === 403) {
    // Not admin role — show access denied
    Alert.alert('Access Denied', 'Admin role required');
  } else {
    // Network or server error
    Alert.alert('Error', error.message || 'Something went wrong');
  }
}
```

### 4.3 Loading States

Each screen has 3 states:
1. **Loading:** Spinner centered on screen
2. **Empty:** EmptyState component with icon + message
3. **Error:** ErrorState component with retry button
4. **Data:** Rendered content

```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorState message={error} onRetry={refetch} />;
if (data.length === 0) return <EmptyState icon="car" message="No rides found" />;
return <RideList data={data} />;
```

---

## 5. Theme & Styling

### 5.1 Color Tokens

```typescript
// apps/admin/constants/theme.ts
export const ADMIN_COLORS = {
  primary: '#6366f1',        // Purple
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#0f0f11',     // Dark bg
  surface: '#1a1a1e',        // Card bg
  surfaceLight: '#252529',   // Input bg
  text: '#ffffff',
  textMuted: '#9ca3af',
  green: '#16a34a',          // Online/active
  orange: '#FFAD7A',         // Busy/surge
  red: '#dc2626',            // Error/offline
  blue: '#3b82f6',           // Info
  yellow: '#f59e0b',         // Warning
};
```

### 5.2 Gradient Header

All main screens use the same purple gradient header:
```typescript
style={{
  backgroundColor: ADMIN_COLORS.primary,
  paddingHorizontal: 16,
  paddingTop: 48,
  paddingBottom: 24,
  borderBottomLeftRadius: 32,
  borderBottomRightRadius: 32,
}}
```

### 5.3 Card Style

```typescript
{
  backgroundColor: ADMIN_COLORS.surface,
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: ADMIN_COLORS.surfaceLight,
}
```

---

## 6. State Management

### 6.1 Pattern: Screen-Level Hooks

Each screen manages its own state via a custom hook:

```typescript
// hooks/useAdminDashboard.ts
export function useAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => { ... };
  const refresh = async () => { ... };

  useEffect(() => { fetchDashboard(); }, []);

  // Auto-poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refresh };
}
```

### 6.2 Pagination Pattern

```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [items, setItems] = useState([]);

const loadMore = async () => {
  if (!hasMore) return;
  const next = page + 1;
  const result = await fetchRides({ page: next });
  setItems([...items, ...result.data]);
  setPage(next);
  setHasMore(next < result.last_page);
};
```

---

## 7. Testing Strategy

### 7.1 Unit Tests
- API functions (mock fetch)
- Custom hooks (renderHook)
- Utility functions (formatZAR, calculateDistance)

### 7.2 Integration Tests
- Login flow (auth → dashboard)
- Driver approve/reject flow
- Settings update flow
- Pagination (load more)

### 7.3 E2E Tests (Detox)
- Full admin login → dashboard → rides → driver detail
- Settings change → verify persistence

---

## 8. Build & Deploy

### 8.1 Build Commands
```bash
# Dev server
cd apps/admin && npx expo start

# Release APK (armeabi-v7a for Galaxy A02)
npx expo export:embed --platform android \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --dev false

cd android && ./gradlew assembleRelease \
  -PreactNativeArchitectures=armeabi-v7a
```

### 8.2 APK Output
`apps/admin/android/app/build/outputs/apk/release/app-release.apk`

---

## 9. Open Questions

None — all design decisions are finalized.

---

## 10. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-30 | 1.0 | Initial design spec |
