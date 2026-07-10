# Phase 11 — Integration Analysis: EasyRyde ↔ PHBIMH

## Executive Summary

This document analyzes the technical integration between **EasyRyde** (ride-hailing + food delivery platform) and **Phalaborwa in My Hand (PHBIMH)** (town utility super-app). Both platforms serve the same market — Phalaborwa, Limpopo, South Africa — and share significant architectural overlap. The goal is to identify integration opportunities, resolve conflicts, and establish a unified strategy.

---

## 1. Architecture Overview

### EasyRyde — Standalone Ride-Hailing + Food Delivery

| Layer | Technology | Details |
|-------|-----------|---------|
| **Backend** | Laravel 11 (PHP) | RESTful API, Sanctum auth, UUID PKs |
| **Real-time** | Node.js (Socket.io) | Driver tracking, ride matching, chat |
| **Database** | PostgreSQL | 35 tables, 7 domains, tenant-scoped |
| **Mobile** | React Native / Expo | Two apps: `rider` + `driver` |
| **Hosting** | VPS (Hetzner) | PM2, Nginx, Cloudflare CDN |

**Core Domains:**
- Domain A: Users & Authentication (5 tables)
- Domain B: Rides & Transportation (6 tables)
- Domain C: Vehicles & Driver Management (3 tables)
- Domain D: Payments & Wallets (4 tables)
- **Domain E: Delivery & Food (7 tables)** — restaurants, menus, menu_items, food_orders, food_order_items, delivery_addresses, driver_locations
- Domain F: Ratings & Reviews (2 tables)
- Domain G: System Administration (5 tables)

### PHBIMH — Town Utility Super-App

| Layer | Technology | Details |
|-------|-----------|---------|
| **Backend** | Laravel 10 (PHP) | RESTful API, Sanctum auth, auto-increment PKs |
| **Real-time** | Node.js (Socket.io) | Ride tracking, order updates |
| **Database** | PostgreSQL | Multi-tenant via `business_id` column |
| **Dashboard** | React SPA (Vite) | Business owner management portal |
| **Super Admin** | Laravel Filament | Platform administration |
| **Mobile** | React Native / Expo | Single resident-facing app |

**Core Domains:**
- Town Utilities: Outage map, community alerts, emergency contacts
- Business Ecosystem: 10 business types, subscriptions, employee management
- **Food Ordering & Delivery**: Restaurants, menus, orders, delivery tracking
- **Ride-Hailing**: Driver onboarding, ride matching, fare calculation
- Marketplace: Business directory, reviews, promotions

---

## 2. API Integration Points

### 2.1 Authentication & User Management

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Auth method | Laravel Sanctum | Laravel Sanctum | ✅ Compatible |
| User ID type | UUID | Auto-increment int | ⚠️ Conflict |
| Roles | `rider`, `driver`, `admin` | `resident`, `business_owner`, `driver`, `super_admin` | ⚠️ Overlap |
| Phone verification | Optional | Required | ⚠️ Different |
| Password reset | Email-based | Phone-based | ⚠️ Different |

**Key Difference:** EasyRyde uses UUIDs for all PKs; PHBIMH uses auto-increment integers. This is a fundamental schema incompatibility.

### 2.2 Restaurant & Menu Management

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Restaurant table | `restaurants` (UUID PK, tenant_id) | `businesses` (int PK, business_type='restaurant') | ⚠️ Different models |
| Menu structure | `menu_items` → `restaurant_categories` | `products` → `categories` | ⚠️ Different naming |
| Menu attributes | is_vegetarian, is_vegan, spice_level, calories | price_range, is_available | ⚠️ Different granularity |
| Pricing | `decimal(8,2)` | `decimal(12,2)` | ⚠️ Different precision |

**Key Difference:** EasyRyde has a dedicated `restaurants` table with food-specific attributes; PHBIMH uses a generic `businesses` table with `business_type='restaurant'`.

### 2.3 Order Management

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Order table | `food_orders` | `orders` | ⚠️ Different naming |
| Order ID | UUID | Auto-increment int | ⚠️ Conflict |
| Order items | `food_order_items` | `order_items` | ⚠️ Different naming |
| Status machine | pending→confirmed→preparing→ready→driver_assigned→picked_up→delivered→completed | pending→confirmed→preparing→ready→completed | ⚠️ EasyRyde has more states |
| Payment tracking | Separate `payments` table | Inline `payment_method`, `payment_status` | ⚠️ Different architecture |
| Delivery address | Separate `delivery_addresses` table | Inline `delivery_address` text field | ⚠️ Different granularity |

**Key Difference:** EasyRyde has a more complex order lifecycle with driver assignment states; PHBIMH has a simpler model without explicit driver assignment.

### 2.4 Ride-Hailing

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Ride table | `rides` | `rides` | ✅ Same name |
| Ride ID | UUID | Auto-increment int | ⚠️ Conflict |
| Location storage | `decimal(10,7)` columns | `point()` (PostGIS) | ⚠️ Different geo types |
| Fare model | base_fare + per_km + surge_multiplier | Single `fare` field | ⚠️ Different complexity |
| Status machine | searching→accepted→arrived→in_progress→completed | requesting→accepted→in_progress→completed | ⚠️ EasyRyde has `arrived` state |
| Vehicle types | `category` field | `vehicle_type` field | ⚠️ Different naming |

**Key Difference:** EasyRyde has a more sophisticated fare calculation and driver matching system; PHBIMH has a simpler model.

### 2.5 Driver Management

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Driver table | `driver_profiles` (UUID PK) | `users` with role='driver' | ⚠️ Different models |
| Vehicle tracking | `driver_locations` table | Inline on `drivers` table | ⚠️ Different architecture |
| Earnings | `driver_wallets` + `wallet_transactions` | Not implemented yet | ⚠️ Gap |
| Payouts | `driver_payouts` table | Not implemented yet | ⚠️ Gap |

### 2.6 Delivery Tracking

| Aspect | EasyRyde | PHBIMH | Alignment |
|--------|----------|--------|-----------|
| Delivery table | `deliveries` (UUID PK) | Not implemented yet | ⚠️ Gap |
| Proof of delivery | Photo, signature, PIN | Not implemented yet | ⚠️ Gap |
| Real-time tracking | `driver_locations` table | Not implemented yet | ⚠️ Gap |

---

## 3. Data Flow Analysis

### 3.1 Food Order Flow (EasyRyde)

```
Customer → Browse restaurants → Select items → Checkout
    ↓
food_orders (status: pending)
    ↓
Restaurant accepts → status: confirmed
    ↓
Restaurant prepares → status: preparing
    ↓
Restaurant ready → status: ready_for_pickup
    ↓
System assigns driver → status: driver_assigned
    ↓
Driver picks up → status: picked_up
    ↓
Driver delivers → status: delivered
    ↓
Customer confirms → status: completed
    ↓
Payment processed → payments table updated
```

### 3.2 Food Order Flow (PHBIMH)

```
Customer → Browse businesses → Select products → Checkout
    ↓
orders (status: pending, type: food)
    ↓
Business accepts → status: confirmed
    ↓
Business prepares → status: preparing
    ↓
Business ready → status: ready
    ↓
Customer picks up / delivery arranged → status: completed
    ↓
Payment recorded inline
```

**Key Gap:** PHBIMH lacks explicit driver assignment and delivery tracking in the order flow.

### 3.3 Ride Flow (EasyRyde)

```
Rider → Request ride → Set pickup/dropoff
    ↓
rides (status: searching)
    ↓
System broadcasts to nearby drivers
    ↓
Driver accepts → status: accepted
    ↓
Driver arrives → status: arrived
    ↓
Rider boards → status: in_progress
    ↓
Ride completes → status: completed
    ↓
Payment processed → payments table updated
```

### 3.4 Ride Flow (PHBIMH)

```
User → Request ride → Set pickup/dropoff
    ↓
rides (status: requesting)
    ↓
Driver accepts → status: accepted
    ↓
Ride in progress → status: in_progress
    ↓
Ride completes → status: completed
    ↓
Payment recorded inline
```

**Key Gap:** PHBIMH lacks the `arrived` state and real-time driver matching.

---

## 4. Gaps & Conflicts

### 4.1 Critical Conflicts

| Conflict | Impact | Resolution |
|----------|--------|------------|
| **UUID vs Auto-increment PKs** | Cannot join tables across systems | Adopt UUIDs as standard (EasyRyde approach) |
| **Different order models** | Cannot sync orders between systems | Create unified order schema or API adapter |
| **Different location storage** | Cannot share driver locations | Standardize on `decimal(10,7)` (simpler) or PostGIS (more powerful) |
| **Different status machines** | State transitions diverge | Define unified state machine with superset of states |

### 4.2 Feature Gaps in PHBIMH

| Missing Feature | EasyRyde Has | Impact |
|----------------|--------------|--------|
| Driver wallet system | ✅ `driver_wallets` + `wallet_transactions` | Drivers cannot track earnings |
| Driver payout system | ✅ `driver_payouts` + `cash_reconciliations` | No automated driver payments |
| Delivery tracking | ✅ `deliveries` + `driver_locations` | No real-time delivery visibility |
| Proof of delivery | ✅ Photo, signature, PIN | No delivery confirmation |
| Surge pricing | ✅ `surge_zones` + `peak_hours` | No dynamic pricing |
| Pool rides | ✅ `pool_rides` + `pool_passengers` | No ride sharing |
| Promo codes | ✅ `promo_codes` | No discount system |
| Ride status history | ✅ `ride_status_histories` | No audit trail |
| SOS alerts | ✅ `sos_alerts` | No emergency system |
| KYC verification | ✅ `kyc_verifications` | No driver identity verification |
| Dispute system | ✅ `disputes` | No complaint handling |
| Compliance tracking | ✅ `consent_records` | No POPIA/FICA compliance |

### 4.3 Feature Gaps in EasyRyde

| Missing Feature | PHBIMH Has | Impact |
|----------------|------------|--------|
| Business dashboard | ✅ React SPA for owners | Restaurants cannot self-manage |
| Multi-business support | ✅ Business switcher | Single business per owner only |
| Employee management | ✅ `employees` + `employee_roles` | No staff access control |
| Subscription billing | ✅ `subscriptions` + plans | No SaaS revenue model |
| Town utilities | ✅ Outage map, alerts | No community features |
| Business marketplace | ✅ 10 business types | Limited to restaurants only |
| Community posts | ✅ `community_posts` | No social features |
| Reviews system | ✅ `reviews` with moderation | Only basic ratings |
| Super admin panel | ✅ Laravel Filament | Only API-based admin |

### 4.4 Data Model Conflicts

| Table | EasyRyde | PHBIMH | Conflict |
|-------|----------|--------|----------|
| `users` | UUID PK, nullable tenant_id | int PK, role enum | Different structure |
| `restaurants` | Dedicated table | `businesses` with type='restaurant' | Different models |
| `rides` | UUID PK, complex fare model | int PK, simple fare | Different complexity |
| `orders` | `food_orders` table | `orders` table with type enum | Different naming |
| `drivers` | `driver_profiles` table | `users` with role='driver' | Different models |

---

## 5. Alignment Recommendations

### 5.1 Unified Architecture Strategy

**Recommendation: PHBIMH as the platform, EasyRyde as a module.**

PHBIMH is the broader platform (town utilities + business ecosystem + delivery + rides). EasyRyde is a specialized module (ride-hailing + food delivery) that can be integrated into PHBIMH.

```
┌─────────────────────────────────────────────────────────────┐
│                     PHBIMH Platform                          │
├─────────────────────────────────────────────────────────────┤
│  Town Utilities  │  Business Ecosystem  │  Delivery & Rides  │
│  - Outage map    │  - 10 business types │  - Food ordering   │
│  - Alerts        │  - Subscriptions     │  - Delivery tracking│
│  - Emergency     │  - Employee mgmt     │  - Ride-hailing    │
│                  │  - Analytics         │  - Driver mgmt     │
├─────────────────────────────────────────────────────────────┤
│                   EasyRyde Module                            │
│  - Advanced ride matching    - Surge pricing                 │
│  - Driver wallets            - Pool rides                    │
│  - Delivery proof            - Promo codes                   │
│  - KYC verification          - Dispute system                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Schema Standardization

#### Adopt UUIDs as Standard
```sql
-- All tables use UUID PKs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);
```

#### Unified Order Model
```sql
-- Single orders table with type enum
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    business_id UUID REFERENCES businesses(id),
    type VARCHAR(20) NOT NULL, -- 'food', 'delivery', 'ride', 'pickup'
    status VARCHAR(30) DEFAULT 'pending',
    ...
);
```

#### Unified Driver Model
```sql
-- Extend users with driver-specific data
CREATE TABLE driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    vehicle_model VARCHAR(100),
    license_plate VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    current_latitude DECIMAL(10,7),
    current_longitude DECIMAL(10,7),
    ...
);
```

#### Unified Location Storage
```sql
-- Use decimal(10,7) for simplicity (no PostGIS dependency)
latitude DECIMAL(10,7) NOT NULL,
longitude DECIMAL(10,7) NOT NULL,
```

### 5.3 API Integration Strategy

#### Option A: Shared Database (Recommended)
- Both systems share the same PostgreSQL database
- Use schema prefixing: `easyryde_*` and `phbimh_*` tables
- Unified API gateway handles routing

#### Option B: API-to-API Integration
- EasyRyde exposes delivery/ride APIs
- PHBIMH calls EasyRyde APIs for delivery/ride features
- Synchronization layer keeps data consistent

#### Option C: Module Extraction
- Extract EasyRyde's delivery/ride modules as standalone services
- PHBIMH integrates these services via API
- Independent deployment and scaling

### 5.4 Data Migration Strategy

1. **Phase 1: Schema Alignment**
   - Add UUID columns to PHBIMH tables
   - Create mapping tables for existing int PKs
   - Standardize column names and types

2. **Phase 2: Data Synchronization**
   - Sync users between systems (phone number as unique key)
   - Sync restaurants/businesses
   - Sync orders and rides

3. **Phase 3: Feature Integration**
   - Enable EasyRyde features in PHBIMH app
   - Unified driver management
   - Shared payment processing

### 5.5 Unified Status Machines

#### Order Status Machine (Superset)
```yaml
pending:
  - confirmed
  - cancelled
confirmed:
  - preparing
  - cancelled
preparing:
  - ready
  - cancelled
ready:
  - driver_assigned
  - picked_up
  - completed
driver_assigned:
  - picked_up
  - cancelled
picked_up:
  - delivered
  - cancelled
delivered:
  - completed
completed: []
cancelled: []
```

#### Ride Status Machine (Superset)
```yaml
searching:
  - accepted
  - cancelled
accepted:
  - arrived
  - cancelled
arrived:
  - in_progress
  - cancelled
in_progress:
  - completed
  - cancelled
completed: []
cancelled: []
```

---

## 6. Implementation Plan

### Phase 1: Schema Standardization (Weeks 1-2)

| Task | Owner | Priority |
|------|-------|----------|
| Add UUID columns to PHBIMH tables | Backend | P0 |
| Create user sync table | Backend | P0 |
| Standardize order schema | Backend | P0 |
| Standardize driver schema | Backend | P0 |
| Update API endpoints for UUID support | Backend | P1 |

### Phase 2: Feature Port (Weeks 3-4)

| Task | Owner | Priority |
|------|-------|----------|
| Port driver wallet system | Backend | P0 |
| Port driver payout system | Backend | P0 |
| Port delivery tracking | Backend | P0 |
| Port proof of delivery | Backend | P1 |
| Port surge pricing | Backend | P2 |
| Port promo codes | Backend | P2 |

### Phase 3: UI Integration (Weeks 5-6)

| Task | Owner | Priority |
|------|-------|----------|
| Integrate EasyRyde driver app into PHBIMH | Mobile | P0 |
| Add delivery tracking to resident app | Mobile | P0 |
| Add driver earnings view | Mobile | P1 |
| Add delivery proof UI | Mobile | P1 |

### Phase 4: Testing & Deployment (Weeks 7-8)

| Task | Owner | Priority |
|------|-------|----------|
| Integration testing | QA | P0 |
| Performance testing | DevOps | P0 |
| Security audit | Security | P0 |
| Staged rollout | DevOps | P0 |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema migration breaks existing data | Medium | High | Backup before migration, rollback plan |
| API incompatibility causes failures | Medium | High | Comprehensive integration tests |
| Performance degradation | Low | Medium | Load testing, query optimization |
| Data inconsistency between systems | Medium | High | Reconciliation jobs, audit logs |
| User experience fragmentation | Medium | Medium | Unified UI design system |

---

## 8. Decision Points

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Primary platform | PHBIMH or EasyRyde | **PHBIMH** (broader scope) |
| Database strategy | Shared or separate | **Shared** (simpler) |
| PK standard | UUID or int | **UUID** (future-proof) |
| Location storage | decimal or PostGIS | **decimal(10,7)** (simpler) |
| Integration approach | Module or API | **Module** ( tighter coupling, better UX) |

---

## 9. Next Steps

1. **Review this document** with both teams
2. **Align on decision points** (Section 8)
3. **Create detailed migration scripts** for schema changes
4. **Build integration test suite** before any code changes
5. **Start with Phase 1** (Schema Standardization)

---

*Document Version: 1.0*
*Created: July 8, 2026*
*Status: Draft — Pending Team Review*
