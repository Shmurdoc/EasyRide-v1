# System Architecture Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

EasyRyde is a ride-hailing platform for Phalaborwa, Limpopo, South Africa. The system consists of 5 services communicating via REST API, WebSocket, and Redis pub/sub.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│  Rider App    │  Driver App   │  Admin App    │  Web Dashboard  │
│  (Expo/RN)   │  (Expo/RN)   │  (Expo/RN)   │  (React+Vite)  │
│  16 screens   │  10 screens   │  12 screens   │  18 pages       │
└───────┬───────┴───────┬───────┴───────┬───────┴────────┬────────┘
        │               │               │                │
        │  REST API     │  REST API     │  REST API      │  REST API
        │  Socket.IO    │  Socket.IO    │  Socket.IO     │  SSE/Polling
        ▼               ▼               ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GATEWAY LAYER                               │
│                    Nginx (Alpine)                                │
│              SSL Termination + Rate Limiting                     │
│              Security Headers + Gzip                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Laravel API     │ │  Socket.IO   │ │  Web Dashboard   │
│  (PHP 8.4)      │ │  Server      │ │  (Static/Vite)   │
│  Port 9000      │ │  (Node 20)   │ │  Port 80/443     │
│                  │ │  Port 3001   │ │                  │
│  37 Controllers  │ │  Express     │ │  React 18        │
│  37 Services     │ │  Socket.IO   │ │  React Router 6  │
│  37 Models       │ │  Redis Adapter│ │  Axios           │
└────────┬─────────┘ └──────┬───────┘ └──────────────────┘
         │                  │
         │  REST API        │  Redis Pub/Sub
         │  + Queue Jobs    │  + WebSocket
         ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├───────────────────┬───────────────────┬─────────────────────────┤
│  PostgreSQL 16    │  Redis 7          │  Laravel Horizon        │
│  (Primary DB)     │  (Cache/Queue/    │  (Queue Dashboard)      │
│  37 tables        │   Sessions/PubSub)│  5 Queues:              │
│  60 migrations    │  Geo-index for    │  default, high, rides,  │
│  UUID PKs         │  driver locations │  payments, notifications│
└───────────────────┴───────────────────┴─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ PayFast  │  Ozow    │  Stripe  │   FCM    │  Twilio  │ SendGrid │
│ (EFT)    │ (EFT)    │ (Card)   │ (Push)   │  (SMS)   │ (Email)  │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

---

## 3. Service Communication Map

### 3.1 Client → Backend (REST API)

| Client | Endpoint Prefix | Auth | Rate Limit |
|--------|----------------|------|------------|
| Rider | `/api/v1/rides`, `/api/v1/payments`, `/api/v1/wallet` | Sanctum Token | Per-route throttle |
| Driver | `/api/v1/drivers`, `/api/v1/rides` | Sanctum + `role:driver` | Per-route throttle |
| Admin | `/api/v1/admin` | Sanctum + `role:admin` + TOTP | Global 60/min |
| Web | Same as Admin | Sanctum Token (localStorage) | Same as Admin |

### 3.2 Client → Socket Server (WebSocket)

| Client | Events Emitted | Events Received | Auth |
|--------|---------------|-----------------|------|
| Rider | `rider:book-ride`, `ride:cancel`, `chat:send` | `ride:accepted`, `ride:arrived`, `ride:location`, `chat:message` | Sanctum token in handshake |
| Driver | `driver:accept-ride`, `driver:location-update`, `driver:toggle-online` | `ride:request`, `ride:cancelled` | Sanctum token in handshake |

### 3.3 Backend ↔ Redis

| Operation | Purpose | Frequency |
|-----------|---------|-----------|
| Queue (Horizon) | Background job processing | Continuous |
| Cache | Surge pricing, fare rates, auth tokens | 5-60s TTL |
| Sessions | API session storage | Per-request |
| Pub/Sub | Broadcast events to Socket.IO | Per-event |
| Geo | Driver location index (GEOADD/GEOSEARCH) | Per-location-update |

### 3.4 Socket Server ↔ Redis

| Operation | Purpose | Frequency |
|-----------|---------|-----------|
| Geo queries | Find nearby drivers (GEOSEARCH) | Per-ride-request |
| Pub/Sub adapter | Horizontal scaling (multi-instance) | Per-event |
| Token cache | Avoid re-validating with Laravel | 60s TTL |
| Chat storage | In-memory chat messages (Redis list, 100 max, 24h TTL) | Per-message |

### 3.5 Backend → External Services

| Service | Protocol | Purpose | Failure Handling |
|---------|----------|---------|------------------|
| PayFast | Redirect + ITN webhook | EFT payment | Return URL fallback |
| Ozow | Redirect + webhook | Instant EFT | Return URL fallback |
| Stripe | Payment Intent + webhook | Card payment | Retry with idempotency key |
| FCM | HTTP v1 API | Push notifications | Auto-deactivate invalid tokens |
| Twilio | REST API | SMS (OTP, alerts) | Log failure, continue |
| SendGrid | v3 API | Transactional email | Log failure, continue |
| OSRM | REST API | Route/distance/duration | Haversine fallback |
| Nominatim | REST API | Geocoding | No fallback (search fails) |
| Sentry | SDK | Error tracking | Non-blocking, best-effort |

---

## 4. Data Flow: Ride Lifecycle

```
Rider App                    Socket Server                 Driver App
    │                             │                            │
    │── POST /rides ─────────────▶│                            │
    │   (pickup, dropoff, cat)    │                            │
    │                             │── ride:request ───────────▶│
    │                             │   (broadcast to nearby)    │
    │                             │                            │
    │                             │◀── driver:accept-ride ─────│
    │                             │   (Lua atomic claim)       │
    │                             │                            │
    │◀── ride:accepted ───────────│                            │
    │                             │                            │
    │   [RideTrackingScreen]      │   [ActiveRideScreen]       │
    │                             │                            │
    │◀── ride:location ───────────│◀── driver:location-update ─│
    │   (driver GPS updates)      │   (Redis GEO)             │
    │                             │                            │
    │                             │── driver:arrived ─────────▶│
    │◀── ride:arrived ────────────│                            │
    │                             │                            │
    │                             │── ride:start ─────────────▶│
    │◀── ride:started ────────────│                            │
    │                             │                            │
    │                             │── ride:complete ──────────▶│
    │◀── ride:completed ──────────│                            │
    │                             │                            │
    │── POST /payments/pay ──────▶│                            │
    │   (wallet/cash/stripe)      │                            │
    │                             │                            │
    │── POST /rides/rate ────────▶│                            │
    │   (1-5 stars + comment)     │                            │
```

---

## 5. Data Flow: Payment Processing

```
Rider App          Backend API         Redis           PostgreSQL        External
    │                  │                  │                 │                │
    │── Pay Request ──▶│                  │                 │                │
    │                  │── Idempotency ──▶│  Check key      │                │
    │                  │◀── Not found ────│                 │                │
    │                  │                  │                 │                │
    │                  │── Calculate Fare │                 │                │
    │                  │   (surge + base) │                 │                │
    │                  │                  │                 │                │
    │                  │── Begin Transaction ──────────────▶│                │
    │                  │   Lock wallet rows                │                │
    │                  │                  │                 │                │
    │                  │   [If Stripe] ────────────────────────────────────▶│
    │                  │◀── Payment Intent ─────────────────────────────────│
    │◀── Client Secret │                  │                 │                │
    │── Confirm ──────▶│                  │                 │                │
    │                  │◀── Confirmed ──────────────────────────────────────│
    │                  │                  │                 │                │
    │                  │   [If Cash/Wallet]                │                │
    │                  │── Create Payment ────────────────▶│                │
    │                  │── Update Wallet ─────────────────▶│                │
    │                  │── Commit Transaction ────────────▶│                │
    │                  │                  │                 │                │
    │◀── Success ─────│                  │                 │                │
```

---

## 6. Service Failure Cascade Map

```
                    ┌─────────────┐
                    │   Redis     │
                    │   Down      │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Queue   │   │  Cache   │   │  Pub/Sub │
    │  Stops   │   │  Misses  │   │  Dies    │
    └────┬─────┘   └────┬─────┘   └────┬─────┘
         │              │              │
         ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Jobs    │   │  API     │   │  Socket  │
    │  Pile    │   │  Slower  │   │  Events  │
    │  Up      │   │  (DB hit)│   │  Lost    │
    └────┬─────┘   └──────────┘   └────┬─────┘
         │                             │
         ▼                             ▼
    ┌──────────┐                 ┌──────────┐
    │  Payments│                 │  Real-time│
    │  Delayed │                 │  Tracking │
    │  Escrow  │                 │  Broken   │
    │  Backlog │                 │           │
    └──────────┘                 └──────────┘
```

### Critical Paths

| Failure | Impact | Severity | Recovery |
|---------|--------|----------|----------|
| Redis down | Queue stops, cache misses, Socket.IO events lost | **CRITICAL** | Restart Redis, replay queue |
| PostgreSQL down | All API calls fail | **CRITICAL** | Failover to replica |
| Socket.IO down | Real-time tracking broken, ride matching fails | **HIGH** | Restart server, reconnect clients |
| PayFast down | EFT payments fail | **MEDIUM** | Users can use cash/wallet/Stripe |
| Google Maps API down | No route calculation, no fare estimate | **HIGH** | Haversine fallback kicks in |
| FCM down | Push notifications fail | **MEDIUM** | In-app notifications still work |
| Twilio down | SMS fails | **LOW** | Email/push still work |

---

## 7. Multi-Tenancy

The system supports multi-tenancy via a `tenant_id` column on all major tables:

| Model | Tenant Scoped | Notes |
|-------|--------------|-------|
| User | Yes | All users belong to a tenant |
| Ride | Yes | All rides scoped to tenant |
| Payment | Yes | Via ride relationship |
| Wallet | Yes | Per-tenant currency |
| SystemSetting | Yes | Per-tenant config |
| PeakHour | Yes | Per-tenant pricing |
| SurgeZone | Yes | Per-tenant zones |
| PromoCode | Yes | Per-tenant promotions |

**Current state:** Single tenant (Phalaborwa). Multi-tenancy infrastructure exists but is untested with multiple tenants.

---

## 8. Security Boundaries

```
┌─────────────────────────────────────────────────┐
│                  INTERNET                        │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Nginx         │
              │  SSL/TLS 1.2+  │ ◄── Certificate pinning (missing on mobile)
              │  Rate Limiting │
              │  Security Hdrs │
              └────────┬───────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Public  │ │  Auth'd  │ │  Admin   │
    │  Routes  │ │  Routes  │ │  Routes  │
    │          │ │          │ │          │
    │ /health  │ │ /rides   │ │ /admin/* │
    │ /config  │ │ /payments│ │ + TOTP   │
    │ /auth/*  │ │ /wallet  │ │ + Role   │
    │ /webhook │ │ /drivers │ │          │
    └──────────┘ └──────────┘ └──────────┘
         │            │            │
         │     Sanctum Token   Sanctum + TOTP
         │     + Role Check    + Role Check
         ▼            ▼            ▼
    ┌─────────────────────────────────────┐
    │           PostgreSQL                │
    │  PII Encrypted Fields:             │
    │  - id_number, license_number       │
    │  - emergency_contact_*             │
    │  - license_plate                   │
    │  - delivery addresses              │
    └─────────────────────────────────────┘
```

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              Docker Compose                      │
├──────────┬──────────┬──────────┬────────────────┤
│ backend  │ nginx    │ database │ redis          │
│ php:8.4  │ nginx:al │ pg:16    │ redis:7        │
│ fpm-alp  │          │ alpine   │ alpine         │
│ Port 9000│ 80/443   │ 5432     │ 6379           │
├──────────┴──────────┴──────────┴────────────────┤
│ queue        │ scheduler                        │
│ (same image) │ (same image)                     │
│ queue:work   │ cron loop (60s)                  │
└─────────────────────────────────────────────────┘

External:
- Socket.IO Server (separate Docker container)
- Prometheus + Grafana (separate monitoring stack)
- EAS Build (mobile CI/CD)
```

---

## 10. Technology Decision Log

| Decision | Choice | Why | Risk |
|----------|--------|-----|------|
| Backend framework | Laravel 13 | SA payment SDK support, rapid development | PHP 8.4 is new, ecosystem gaps |
| Real-time | Socket.IO (Node.js) | Sub-200ms GPS updates, Redis adapter for scaling | Separate service = separate failure domain |
| Mobile | React Native (Expo) | Cross-platform, small team, shared packages | Expo SDK versions may lag |
| Database | PostgreSQL 16 | PostGIS for geo, JSON support, reliability | Overkill for Phalaborwa scale |
| Queue | Redis + Horizon | Already using Redis for cache/pub/sub | Single point of failure |
| Payments | PayFast + Ozow + Stripe | SA market (PayFast/Ozow) + global (Stripe) | 3 integrations = 3 webhook surfaces |
| Auth | Laravel Sanctum | Token-based, mobile-friendly, Laravel-native | No refresh token rotation visible |
| RBAC | Spatie Permission | Mature Laravel package, flexible | Adds query overhead on every auth check |
