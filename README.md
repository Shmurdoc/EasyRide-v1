# EasyRyde

Ride-hailing platform for Phalaborwa, Limpopo. Multi-tenant architecture supporting rides, food delivery, stays, and rentals under the **Phalaborwa In My Hand (PHBIMH)** umbrella brand.

**Target market:** Phalaborwa and surrounding areas in Limpopo, South Africa.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Rider App   │  Driver App  │  Admin App   │  Web (future)      │
│  (Expo/RN)   │  (Expo/RN)   │  (Expo/RN)   │                    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Nginx)                          │
│                    api.easyryde.co.za                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Laravel API │ │  Socket.IO   │ │  Redis            │
│  (PHP 8.2)   │ │  Server      │ │  (cache/sessions) │
│  Backend     │ │  (Node.js)   │ │                    │
└──────┬───────┘ └──────┬───────┘ └──────────────────┘
       │                │
       ▼                ▼
┌──────────────────────────────────────────┐
│           PostgreSQL + PostGIS            │
│         (geo queries, ride tracking)      │
└──────────────────────────────────────────┘

External Integrations:
  ├── Google Maps SDK (geocoding, routing)
  ├── PayFast (payment gateway - ITN webhook)
  ├── Ozow (instant EFT - webhook)
  ├── Stripe (card payments - webhook)
  ├── Twilio (SMS notifications)
  ├── SendGrid (email)
  ├── Firebase Cloud Messaging (push notifications)
  └── Sentry (error tracking)
```

### Project Structure

```
EasyRyde/
├── backend/                    # Laravel API (PHP 8.2)
│   ├── app/
│   │   ├── Http/Controllers/   # 170+ API routes
│   │   ├── Models/             # 41 Eloquent models
│   │   ├── Services/           # 50+ service classes
│   │   └── Policies/           # Authorization policies
│   ├── database/
│   │   ├── migrations/         # Schema definitions
│   │   └── seeders/            # Test/production data
│   └── routes/
│       └── api.php             # All API routes
│
├── socket-server/              # Socket.IO server (Node.js)
│   └── src/
│       ├── handlers/           # ride, chat, driver, food, delivery, admin
│       ├── middleware/          # auth, rateLimit, authorize
│       └── services/           # auth, redis
│
├── mobile/                     # React Native (Expo) monorepo
│   ├── apps/
│   │   ├── rider/              # 21 screens
│   │   ├── driver/             # 13 screens
│   │   └── admin/              # 12 screens
│   └── packages/
│       └── shared/             # Shared theme, constants, utils
│
├── nginx/                      # Reverse proxy config
├── deployment/                 # Production deployment configs
├── load-tests/                 # k6 load testing scripts
├── grafana/                    # Monitoring dashboards
└── prometheus/                 # Metrics collection
```

---

## Setup

### Prerequisites

- PHP 8.2+
- Composer 2.x
- Node.js 18+ / npm 9+
- PostgreSQL 15+ with PostGIS extension
- Redis 7+
- Docker & Docker Compose (recommended)
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android builds)

### Quick Start with Docker

```bash
# Clone and enter the project
cd EasyRyde

# Copy environment files
cp backend/.env.example backend/.env
cp socket-server/.env.example socket-server/.env

# Start all services
docker compose up -d

# Run migrations and seed
docker compose exec backend php artisan migrate --seed

# Create admin user
docker compose exec backend php artisan tinker
# >>> User::create(['name'=>'Admin','email'=>'admin@easyryde.co.za','password'=>Hash::make('password'),'role'=>'super-admin'])
```

### Manual Setup

#### Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

#### Socket Server

```bash
cd socket-server
npm install
cp .env.example .env
# Edit .env with Redis, JWT_SECRET, backend URL
npm start
```

#### Mobile Apps

```bash
cd mobile
npm install

# Per app
cd apps/rider
cp .env.example .env   # Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, EXPO_PUBLIC_API_URL
npx expo start
```

---

## Development

### Backend

```bash
# Start development server
docker compose exec backend php artisan serve

# Run specific test
docker compose exec backend php vendor/bin/phpunit --filter test_rider_can_request_ride

# Generate API docs (if using Scribe)
docker compose exec backend php artisan scribe:generate
```

### Socket Server

```bash
cd socket-server
npm run dev     # With nodemon
npm start       # Production
```

### Mobile

```bash
cd mobile

# Rider app
cd apps/rider && npx expo start

# Driver app
cd apps/driver && npx expo start

# Admin app
cd apps/admin && npx expo start
```

### Environment Variables

See `backend/.env.secure.example` for the full reference. Key variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `APP_KEY` | Laravel encryption key | `base64:...` (generate with `php artisan key:generate`) |
| `JWT_SECRET` | Socket.IO token signing | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Stripe payments | `sk_live_...` |
| `PAYFAST_MERCHANT_ID` | PayFast payments | Production merchant ID |
| `OZOW_SITE_CODE` | Ozow instant EFT | Production site code |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps SDK | Production key with billing |

---

## Testing

### Backend Tests

```bash
# Full test suite
docker compose exec backend php vendor/bin/phpunit

# With coverage
docker compose exec backend php vendor/bin/phpunit --coverage-html coverage/

# Feature tests only
docker compose exec backend php vendor/bin/phpunit --testsuite=feature
```

**Targets:** 80% line coverage, 70% branch coverage.

### Socket Server Tests

```bash
cd socket-server
npm test
```

### Mobile Tests

```bash
cd mobile

# All apps
npx jest --coverage --forceExit

# Per app
cd apps/rider && npx jest --coverage
cd apps/driver && npx jest --coverage
cd apps/admin && npx jest --coverage
```

**Target:** 70% line coverage minimum before launch.

### Load Testing

```bash
cd load-tests
k6 run --vus 50 --duration 30s scenarios/ride-request.js
```

See [MOBILE-TESTING.md](./MOBILE-TESTING.md) for detailed mobile testing conventions.

---

## Building APKs

**Important:** Always use `npx expo run:android --variant release`, NOT `./gradlew assembleRelease` directly. The Gradle-only command skips JS bundling and produces a broken APK.

```bash
cd mobile/apps/rider

# Clean
rm -rf android/app/build
npx expo prebuild --clean

# Build
npx expo run:android --variant release

# Output: android/app/build/outputs/apk/release/app-release.apk

# Verify bundle is embedded
unzip -l app-release.apk | grep index.android.bundle
```

For all three apps:

```bash
cd mobile
./scripts/build-release.sh rider driver admin
```

See [APK-FIX-PLAN.md](./APK-FIX-PLAN.md) for detailed build troubleshooting.

---

## Deployment

### Production Infrastructure

```
Server: Ubuntu 22.04, 4GB+ RAM, 2+ CPU cores
Services: Docker Compose (nginx, backend, socket, postgres, redis)
Domain: api.easyryde.co.za (backend), socket.easyryde.co.za (WebSocket)
SSL: Let's Encrypt (auto-renew via certbot)
```

### Deploy Steps

```bash
# Pull latest
git pull origin main

# Backend
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d

# Migrations
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Cache
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache

# Restart queue
docker compose -f docker-compose.prod.yml restart queue
```

### Rollback

```bash
# If deployment fails
docker compose -f docker-compose.prod.yml down
# Restore database from backup
docker compose -f docker-compose.prod.blue.yml up -d  # Previous version
```

---

## Security

- Webhook signature verification on PayFast, Ozow, Stripe, and partner endpoints
- Server-side fare calculation from GPS tracking (no client-submitted distance/duration)
- Wallet deposits require payment gateway confirmation (self-confirm endpoint removed)
- Rate limiting on all endpoints (login: 5/min, wallet: 3-5/min, driver location: 1/sec)
- Socket.IO: ride ownership validation on all events, per-event rate limits
- PII encrypted at rest via Laravel `EncryptsPii` trait
- Security headers: HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Admin TOTP 2FA required for sensitive operations
- Audit logging on wallet transactions, admin actions, and auth events

See [SECURITY.md](./SECURITY.md) for the full security policy and practices.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CHANGELOG.md](./CHANGELOG.md) | All changes made to the project |
| [SECURITY.md](./SECURITY.md) | Security policy and practices |
| [MOBILE-TESTING.md](./MOBILE-TESTING.md) | Mobile test guide and conventions |
| [PRODUCTION-PUSH-PLAN.md](./PRODUCTION-PUSH-PLAN.md) | Full production readiness plan |
| [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) | Security audit findings |
| [DESIGN-IMPLEMENTATION-PLAN.md](./DESIGN-IMPLEMENTATION-PLAN.md) | PHBIMH design system implementation |
| [APK-FIX-PLAN.md](./APK-FIX-PLAN.md) | APK build fix procedures |

---

## License

Proprietary. All rights reserved.
