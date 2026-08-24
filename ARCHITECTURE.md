# EasyRyde — System Architecture

## System Diagram

```
                            ┌─────────────────────────────────────────────┐
                            │              EasyRyde Platform              │
                            └─────────────────────────────────────────────┘

  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Rider   │    │    Driver    │    │    Admin     │    │  Restaurant  │
  │  Mobile  │    │    Mobile    │    │   Mobile     │    │   Staff      │
  │   App    │    │     App      │    │     App      │    │   App        │
  └────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                 │                   │                    │
       │  WebSocket      │  WebSocket       │  WebSocket         │  WebSocket
       │                 │                   │                    │
       ▼                 ▼                   ▼                    ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        Socket.IO Server (Node.js)                      │
  │   ride handlers | driver handlers | chat | food orders | admin         │
  └────────────┬────────────────────────────┬──────────────────────────────┘
               │                            │
               │  Redis Adapter             │  Redis Pub/Sub
               │  (horizontal scaling)      │  (Laravel relay)
               │                            │
               ▼                            ▼
  ┌──────────────────────┐    ┌──────────────────────────────────────────┐
  │       Redis          │◄──►│           Nginx (port 3082)              │
  │  ─ GeoSet (drivers)  │    │         Reverse Proxy                   │
  │  ─ Ride state hashes │    └──────────────────┬───────────────────────┘
  │  ─ Chat lists        │                       │
  │  ─ Pub/Sub channels  │                       │
  └──────────────────────┘                       ▼
                                    ┌──────────────────────────┐
                                    │    Laravel 11 Backend     │
                                    │  ─ REST API (port 8080)  │
                                    │  ─ Sanctum Auth          │
                                    │  ─ Role Middleware        │
                                    │  ─ Rate Limiting          │
                                    │  ─ Webhook Validation     │
                                    └──────────┬───────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
           │  PostgreSQL   │          │    Stripe     │          │   PayFast    │
           │  (port 5433)  │          │   PayFast     │          │    Ozow      │
           │               │          │    Ozow       │          │              │
           └──────────────┘          └──────────────┘          └──────────────┘
```

## Component Overview

### Backend (Laravel 11)
- **Role:** Core API server, business logic, database persistence
- **Auth:** Laravel Sanctum (token-based), Spatie roles/permissions, TOTP 2FA
- **Database:** PostgreSQL with Eloquent ORM
- **Queue:** Laravel jobs for async processing (notifications, payouts, email)
- **Payments:** Stripe, PayFast, Ozow integration via service classes
- **Key services:** FareCalculation, RideMatching, Payment, Wallet, Notification, PushNotification, Sos

### Mobile Apps (React Native / Expo)
- **Rider app** — Book rides, track drivers, pay, rate, chat, food ordering
- **Driver app** — Accept rides, navigate, update status, earnings, chat
- **Admin app** — Manage users/drivers/rides, live map, KYC, violations
- **Shared package** — API client, theme system, shared components, hooks

### Web Admin Dashboard
- **Role:** Full admin panel for platform management
- **Features:** Dashboard stats, user/driver/ride management, live map, reporting, settings

### Socket Server (Node.js)
- **Role:** Real-time WebSocket communication
- **Protocol:** Socket.IO with Redis adapter for horizontal scaling
- **Handlers:** Ride lifecycle, driver location, chat, food orders, deliveries, admin monitoring
- **Security:** JWT validation, per-event rate limiting, input validation, authorization checks
- **Laravel integration:** Redis pub/sub relay subscribes to Laravel broadcast channels

## Data Flow

### Ride Lifecycle
```
1. Rider books ride
   → Socket: rider:book-ride (stores in Redis, finds nearby drivers)
   → API: POST /rides (creates ride in PostgreSQL)
   → Socket: ride:request → nearby drivers

2. Driver accepts
   → Socket: driver:accept-ride (Lua lock in Redis)
   → API: POST /rides/{id}/driver-accept (persists to PostgreSQL)
   → Socket: ride:accepted → rider
   → Socket: ride:status-change → admin

3. Driver arrives / Ride starts / Ride completes
   → Socket events update Redis state
   → API endpoints persist to PostgreSQL
   → Socket broadcasts to rider + admin rooms

4. Fare calculation (on complete)
   → GPS tracking data → server-side distance calculation
   → FareCalculationService with category rates
   → Fare clamped to ±20% of estimate
   → Audit log stored in ride record
```

### Payment Flow
```
1. Ride completes → fare calculated server-side
2. Payment processed via selected method:
   - Wallet: debit from wallet balance (audit logged)
   - Card: Stripe PaymentIntent → confirm → webhook
   - PayFast: redirect to PayFast → ITN webhook
   - Ozow: redirect to Ozow → webhook
   - Cash: marked as pending reconciliation
3. Webhook confirms payment → wallet/driver payout credited
4. Admin reconciliation for cash payments
```

### Real-time Location Flow
```
1. Driver app sends GPS → Socket: driver:location-update
2. Socket server stores in Redis GeoSet
3. Redis GeoSet enables radius queries for nearby matching
4. During active ride: location broadcast to ride room
5. Laravel backend validates GPS for fare calculation
6. Spoofing detection: impossible speed/jump checks
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Redis as socket state store** | Sub-millisecond reads for ride state, driver locations. Enables horizontal scaling via Redis adapter. |
| **Lua scripts for ride claiming** | Atomic SET NX EX prevents race conditions in ride acceptance across multiple drivers. |
| **Server-side fare calculation** | GPS tracking + OSRM routing prevents client-side fare manipulation. ±20% clamp on estimates. |
| **Sanctum tokens (7-day expiry)** | Balance between security and UX for mobile apps. Proactive refresh before expiry. |
| **Redis pub/sub relay** | Socket server subscribes to Laravel broadcast channels — any event Laravel emits is auto-relayed to clients without custom socket code. |
| **Separate socket server** | Decouples real-time concerns from HTTP API. Independent scaling, deployment, and failure isolation. |
| **GPS spoofing detection** | Location updates validated for impossible speed (>180 km/h) and distance jumps (>5 km in <300s). |
| **Webhook IP whitelisting** | Payment gateway webhooks protected by IP + signature verification. No auth bypass via environment. |
| **Multi-tenant architecture** | Tenant IDs plumbed through models and services for future multi-business support. |
| **Spatie roles/permissions** | Granular role-based access: rider, driver, admin, super-admin with middleware enforcement. |
