# EasyRyde — System Flow Documentation

**Version:** 1.0.0
**Generated:** 2026-07-02
**Status:** Final — Comprehensive Analysis

---

## What This Is

Brutally honest, exhaustive documentation of every flow in the EasyRyde platform. Three apps, one backend, one socket server, one web dashboard — all flows mapped, all edge cases exposed, all gaps identified.

---

## The 3 Apps

| App | Type | Screens | Purpose |
|-----|------|---------|---------|
| **Rider** | React Native (Expo) | 16 | Book rides, order food, pay, chat |
| **Driver** | React Native (Expo) | 10 | Accept rides, manage earnings, deliver food |
| **Admin** | React Native (Expo) | 12 | Fleet ops, users, pricing, compliance |

**Supporting Infrastructure:**
- Backend API: Laravel 13 + PHP 8.4 + PostgreSQL 16
- Socket Server: Node.js + Socket.IO 4.8
- Web Dashboard: React + Vite + Tailwind
- Infrastructure: Docker + Nginx + Redis 7

---

## Document Map

### System Overview
| File | Description |
|------|-------------|
| [system-architecture-flow.md](00-system-overview/system-architecture-flow.md) | Full architecture, service interactions, data paths |
| [service-dependency-map.md](00-system-overview/service-dependency-map.md) | Which services depend on which, failure cascades |

### Rider App
| File | Description |
|------|-------------|
| [rider-user-flow.md](01-rider/rider-user-flow.md) | Every screen, every tap, every transition |
| [rider-system-flow.md](01-rider/rider-system-flow.md) | API calls, socket events, state management |
| [rider-data-flow.md](01-rider/rider-data-flow.md) | Data movement: fetch, cache, store, send |
| [rider-integration-flow.md](01-rider/rider-integration-flow.md) | Maps, payments, push, SMS integrations |
| [rider-error-flow.md](01-rider/rider-error-flow.md) | Network failures, timeouts, recovery |

### Driver App
| File | Description |
|------|-------------|
| [driver-user-flow.md](02-driver/driver-user-flow.md) | Online toggle, ride acceptance, trip lifecycle |
| [driver-system-flow.md](02-driver/driver-system-flow.md) | Socket events, background location, API calls |
| [driver-data-flow.md](02-driver/driver-data-flow.md) | Location data, earnings, trip data paths |
| [driver-integration-flow.md](02-driver/driver-integration-flow.md) | Socket.IO, background location, food delivery |
| [driver-error-flow.md](02-driver/driver-error-flow.md) | Socket disconnect, location loss, offline mode |

### Admin App
| File | Description |
|------|-------------|
| [admin-user-flow.md](03-admin/admin-user-flow.md) | Dashboard, driver approval, settings, surge |
| [admin-system-flow.md](03-admin/admin-system-flow.md) | Inspector, audit logs, TOTP enforcement |
| [admin-data-flow.md](03-admin/admin-data-flow.md) | Metrics aggregation, real-time fleet data |
| [admin-integration-flow.md](03-admin/admin-integration-flow.md) | Inspector API, Socket.IO monitoring |
| [admin-error-flow.md](03-admin/admin-error-flow.md) | Dashboard failures, TOTP issues, recovery |

### Cross-Cutting Concerns
| File | Description |
|------|-------------|
| [authentication-flow.md](04-cross-cutting/authentication-flow.md) | Login, register, social auth, TOTP, tokens |
| [payment-flow.md](04-cross-cutting/payment-flow.md) | PayFast, Ozow, Stripe, wallet, escrow |
| [realtime-communication-flow.md](04-cross-cutting/realtime-communication-flow.md) | Socket.IO events, ride matching, chat |
| [notification-flow.md](04-cross-cutting/notification-flow.md) | Push, in-app, SMS, email channels |
| [ride-lifecycle-flow.md](04-cross-cutting/ride-lifecycle-flow.md) | State machine: searching → completed |
| [food-delivery-flow.md](04-cross-cutting/food-delivery-flow.md) | Order lifecycle: placed → delivered |

---

## 5W Analysis Summary

### WHO
- **Riders:** End consumers in Phalaborwa, Limpopo, SA
- **Drivers:** Approved professionals with verified KYC
- **Admins:** 1-3 platform operators with TOTP 2FA
- **Partners:** Restaurants (food delivery), payment gateways

### WHAT
- Ride-hailing with 4 vehicle categories (Economy/Standard/Premium/XL)
- Food delivery with restaurant partnerships
- Package delivery
- Pool rides (ride-sharing)
- Wallet system with 5 payment methods
- Real-time GPS tracking
- In-ride chat
- SOS/emergency system
- KYC/compliance (POPIA)

### WHEN
- Ride request → 15s driver timeout → acceptance window
- Stale ride cleanup every 60 seconds
- Background location every 50m distance interval
- Escrow release after 24 hours
- Scheduled rides publish every minute
- Dashboard refresh every 30 seconds

### WHERE
- **Database:** PostgreSQL 16 on Docker
- **Cache/Queue:** Redis 7
- **Real-time:** Socket.IO with Redis pub/sub
- **Mobile:** EAS Build (Android primary)
- **Web:** Vite dev / Nginx production
- **Payments:** PayFast, Ozow, Stripe (redirect + intent)
- **Notifications:** FCM (push), Twilio (SMS), SendGrid (email)

### WHY
- Laravel for complex payment ecosystem (3 gateways + escrow + wallet)
- Node.js for sub-200ms real-time GPS tracking
- React Native (Expo) for cross-platform with small team
- Central admin model for small-town launch
- South African payment methods (PayFast, Ozow) over global-only options

---

## Critical Findings

### Showstoppers (Fix Before Launch)
1. `calculateFinalFare()` returns hardcoded R50 — **every ride gets wrong fare**
2. Hardcoded demo credentials in source code
3. No webhook signature validation visible
4. Ride acceptance race condition (multiple drivers same ride)
5. No test suite for any mobile app

### High Risk
6. No certificate pinning on mobile apps
7. Guest login button has no handler
8. Fake trip progress bar (not GPS-based)
9. Empty rideId passed to payment screen
10. Background location may be killed by iOS

### Technical Debt
11. 60 migration files need squashing
12. Dual fare rate source (constant + DB)
13. Inconsistent API response formats
14. No API documentation (Swagger/OpenAPI)
15. Stale MASTER_PROJECT_PLAN (claims 40%, reality is 70%)

---

## How to Read This

1. Start with `system-architecture-flow.md` for the big picture
2. Read the cross-cutting docs for shared concerns (auth, payment, rides)
3. Read per-app docs for specific screen-level flows
4. Use `service-dependency-map.md` to understand failure cascades

Every flow document follows the 5W framework:
- **Who** — actors and roles
- **What** — actions and data
- **When** — triggers and timing
- **Where** — storage and integration points
- **Why** — design rationale and business rules
