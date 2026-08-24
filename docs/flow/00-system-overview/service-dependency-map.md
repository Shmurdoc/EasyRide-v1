# Service Dependency Map — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Service Inventory

| Service | Technology | Port | Health Endpoint | Owner |
|---------|-----------|------|-----------------|-------|
| Laravel API | PHP 8.4 + Laravel 13 | 9000 (FPM) | `GET /health` | Backend |
| Nginx | nginx:alpine | 80, 443 | `GET /health` | Infra |
| PostgreSQL | postgres:16-alpine | 5432 | TCP check | Infra |
| Redis | redis:7-alpine | 6379 | `PING` | Infra |
| Socket.IO | Node.js 20 + Express | 3001 | `GET /health` | Realtime |
| Queue Worker | Same as Laravel API | - | Horizon dashboard | Backend |
| Scheduler | Same as Laravel API | - | Process check | Backend |
| Web Dashboard | React + Vite | 80/443 (via Nginx) | Static | Frontend |
| Prometheus | prom/prometheus | 9090 | `GET /-/healthy` | Monitoring |
| Grafana | grafana/grafana | 3000 | `GET /api/health` | Monitoring |

---

## 2. Dependency Graph

```
                    ┌──────────────┐
                    │    Rider     │
                    │    App       │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Driver  │ │  Admin   │ │   Web    │
        │  App     │ │  App     │ │ Dashboard│
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                   ┌────────────┐
                   │   Nginx    │ ◄── SSL, Rate Limit, Headers
                   └─────┬──────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
       ┌────────────┐        ┌────────────┐
       │ Laravel API│        │ Socket.IO  │
       │ (PHP-FPM)  │        │ Server     │
       └─────┬──────┘        └─────┬──────┘
             │                     │
    ┌────────┼────────┐            │
    ▼        ▼        ▼            │
┌───────┐ ┌───────┐ ┌───────┐     │
│  PG   │ │ Redis │ │ Queue │     │
│  DB   │ │ Cache │ │ Worker│     │
└───────┘ └───────┘ └───┬───┘     │
                        │         │
                        ▼         ▼
                   ┌──────────────────┐
                   │     Redis        │
                   │  (Pub/Sub + Geo) │
                   └──────────────────┘
```

---

## 3. Dependency Matrix

| Service | Depends On | Used By |
|---------|-----------|---------|
| **Laravel API** | PostgreSQL, Redis, External APIs | Nginx, Socket.IO (validation) |
| **Socket.IO** | Redis (pub/sub, geo, cache), Laravel API (token validation) | Rider App, Driver App |
| **Queue Worker** | Redis, PostgreSQL | Laravel API (dispatches jobs) |
| **Scheduler** | Redis, PostgreSQL | Cron (triggers jobs) |
| **Nginx** | Laravel API (FPM), Web Dashboard (static) | All clients |
| **Rider App** | Laravel API (REST), Socket.IO (WebSocket), Google Maps | - |
| **Driver App** | Laravel API (REST), Socket.IO (WebSocket), Google Maps | - |
| **Admin App** | Laravel API (REST), Socket.IO (WebSocket) | - |
| **Web Dashboard** | Laravel API (REST) | - |

---

## 4. Failure Impact Analysis

### Tier 1: Total System Failure

| Service Down | Impact | User Experience | Revenue Impact |
|-------------|--------|-----------------|----------------|
| **PostgreSQL** | All API calls fail, no data persistence | Complete outage | 100% loss |
| **Redis** | Queue stops, cache misses, Socket.IO events lost, sessions broken | API slower (50ms→500ms), real-time broken, jobs pile up | 90% loss |
| **Nginx** | No traffic reaches any service | Complete outage | 100% loss |

### Tier 2: Major Feature Failure

| Service Down | Impact | User Experience | Revenue Impact |
|-------------|--------|-----------------|----------------|
| **Laravel API** | No ride booking, no payments, no auth | Login fails, booking fails | 100% loss |
| **Socket.IO** | No real-time tracking, no ride matching, no chat | Drivers can't receive requests, riders can't track | 80% loss |
| **Queue Worker** | Jobs pile up, payments delay, notifications stop | Ride completes but payment doesn't process | 60% loss |

### Tier 3: Partial Degradation

| Service Down | Impact | User Experience | Revenue Impact |
|-------------|--------|-----------------|----------------|
| **PayFast** | EFT payments fail | Rider uses cash/wallet/Stripe | 20% loss |
| **Ozow** | Instant EFT fails | Rider uses alternative | 15% loss |
| **Stripe** | Card payments fail | Rider uses cash/wallet/EFT | 25% loss |
| **Twilio** | SMS fails | No OTP, no ride alerts | 5% loss |
| **FCM** | Push notifications fail | In-app notifications still work | 10% loss |
| **SendGrid** | Emails fail | No receipts, no password reset emails | 5% loss |
| **OSRM** | Route calculation fails | Haversine fallback (less accurate) | 0% (fallback) |
| **Google Maps** | Places search fails | Manual location entry only | 5% loss |
| **Sentry** | Error tracking blind | Errors go untracked | 0% (observability) |
| **Prometheus/Grafana** | Monitoring blind | No metrics visible | 0% (observability) |

---

## 5. Critical Path: Ride Booking

```
User taps "Request Ride"
        │
        ▼
   ┌─────────┐     FAIL → "Network error"
   │ Nginx   │
   └────┬────┘
        │
        ▼
   ┌─────────┐     FAIL → 500 error
   │ Laravel │
   │ API     │
   └────┬────┘
        │
   ┌────┼────────────┐
   │    │             │
   ▼    ▼             ▼
┌────┐ ┌────┐    ┌─────────┐
│ PG │ │Redis│   │ Socket  │
└────┘ └────┘    │ Server  │
                 └────┬────┘
                      │
                      ▼
                 ┌─────────┐
                 │ Driver  │
                 │   App   │
                 └─────────┘

ANY failure in this chain = ride cannot be booked or matched
```

---

## 6. Data Dependencies

### 6.1 What Each Service Reads

| Service | Reads From | Data |
|---------|-----------|------|
| Laravel API | PostgreSQL | All business data |
| Laravel API | Redis | Cache (surge, fares, config), sessions |
| Socket.IO | Redis | Token cache, driver geo-index, chat messages |
| Socket.IO | Laravel API | Token validation (on connect) |
| Queue Worker | Redis | Job queue |
| Queue Worker | PostgreSQL | Job data, business data |
| Scheduler | Redis | Trigger scheduled jobs |
| Scheduler | PostgreSQL | Scheduled data (rides, promos) |

### 6.2 What Each Service Writes

| Service | Writes To | Data |
|---------|----------|------|
| Laravel API | PostgreSQL | All business data (rides, payments, users) |
| Laravel API | Redis | Cache, sessions, queue jobs |
| Socket.IO | Redis | Driver locations (GEO), chat messages, token cache |
| Queue Worker | PostgreSQL | Job results (payments, notifications, stats) |
| Queue Worker | Redis | Job completion status |

---

## 7. Shared Resources (Contention Points)

| Resource | Contention Risk | Mitigation |
|----------|----------------|------------|
| PostgreSQL connections | HIGH (6 services compete) | Connection pooling (not configured) |
| Redis memory | MEDIUM (geo + cache + queue) | Eviction policy, monitoring |
| Redis CPU | MEDIUM (pub/sub + geo queries) | Redis cluster at scale |
| Nginx worker connections | LOW | Default config sufficient |
| Socket.IO connections | MEDIUM (1 per mobile user) | Redis adapter for horizontal scaling |

---

## 8. Scaling Bottlenecks

| Bottleneck | Current Limit | Scale Trigger | Solution |
|-----------|---------------|---------------|----------|
| PostgreSQL max_connections | 100 (default) | 50+ concurrent API requests | PgBouncer connection pooler |
| Redis memory | 256MB (default) | 10K+ drivers with geo data | Redis cluster + eviction |
| Socket.IO single instance | ~10K connections | 500+ concurrent users | Horizontal scaling with Redis adapter |
| Queue worker single process | ~10 jobs/sec | 100+ rides/hour | Horizon auto-scaling (1-10 processes) |
| Nginx worker_connections | 1024 (default) | 500+ concurrent connections | Increase to 4096+ |
| Google Maps API quota | 28,500 requests/month (free tier) | 100+ rides/day | Billing account + quota increase |
