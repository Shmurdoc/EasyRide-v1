# EasyRyde Backend

Laravel 11 REST API for the EasyRyde ride-hailing platform. Powers rider, driver, and admin mobile apps plus the web admin dashboard.

## Key Features

- **Ride management** — Book, accept, track, complete, cancel rides with GPS-based fare calculation
- **Driver matching** — Proximity-based driver discovery with Redis GeoSet
- **Multi-payment** — Wallet, card (Stripe), PayFast, Ozow, cash
- **Food delivery** — Restaurant orders with driver assignment and real-time tracking
- **Deliveries** — Package delivery with driver matching
- **Pool rides** — Ride-sharing with passenger matching
- **Chat** — In-ride messaging between riders and drivers
- **Notifications** — Push (Firebase), SMS (Twilio), in-app
- **KYC / Compliance** — Document verification, incidents, driver violations
- **Admin dashboard** — User/driver/ride management, live map, reporting, payouts
- **Security** — TOTP 2FA, Sanctum tokens, webhook IP validation, rate limiting, audit logging
- **POPIA compliance** — Data export, anonymization, erasure endpoints

## Docker Setup

```bash
# Start the full stack (nginx, backend, postgres, redis)
docker compose up -d

# Run artisan commands
docker compose exec backend php artisan <command>

# Access the container
docker compose exec backend bash
```

The backend runs behind Nginx on port `3082` (host) -> `8080` (container).

## Testing

```bash
# Full test suite (inside Docker)
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml

# Specific test
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml --filter <TestName>

# Seed test data
docker compose exec backend php artisan db:seed --class=FoodDeliverySeeder
```

**Test DB:** PostgreSQL at `127.0.0.1:5433` (host) / `database:5432` (container), database `easyryde_test`.

**Current status:** 796 tests, 1828 assertions, 0 failures.

## Key Middleware

| Middleware | Purpose |
|-----------|---------|
| `auth:sanctum` | Token-based authentication |
| `role:driver`, `role:admin\|super-admin` | Role-based access control via Spatie |
| `throttle:*` | Per-route rate limiting (auth, ride-create, payments, etc.) |
| `webhook.ip:*` | Webhook IP whitelist validation (PayFast, Ozow, Stripe, etc.) |
| `admin.totp` | Requires TOTP 2FA code for sensitive admin operations |
| `DriverMiddleware` | Checks `hasRole('driver')` — used in driver-specific routes |

## API Documentation

Route definitions: `backend/routes/api.php`

### Key Endpoints

**Auth**
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login (returns Sanctum token)
- `POST /api/v1/auth/refresh` — Refresh token
- `POST /api/v1/auth/logout` — Logout (invalidates token)

**Rides**
- `POST /api/v1/rides` — Book a ride
- `GET /api/v1/rides/current` — Get active ride
- `POST /api/v1/rides/{id}/driver-accept` — Driver accepts ride
- `POST /api/v1/rides/{id}/start` — Start ride
- `POST /api/v1/rides/{id}/complete` — Complete ride
- `GET /api/v1/rides/fare-estimate` — Get fare estimate

**Driver**
- `POST /api/v1/drivers/toggle-online` — Go online/offline
- `PUT /api/v1/drivers/profile` — Update driver profile
- `GET /api/v1/drivers/earnings` — View earnings

**Payments**
- `POST /api/v1/wallet/deposit` — Top up wallet
- `POST /api/v1/payments/rides/{id}/pay` — Process ride payment
- `POST /api/v1/payments/stripe/create-intent` — Create Stripe payment intent

**Food**
- `GET /api/v1/food/restaurants` — List restaurants
- `POST /api/v1/food/restaurants/{id}/order` — Place food order
- `GET /api/v1/food/orders` — List my orders

**Admin**
- `GET /api/v1/admin/dashboard` — Dashboard stats
- `GET /api/v1/admin/manage/users` — User management
- `GET /api/v1/admin/manage/drivers` — Driver management
- `GET /api/v1/admin/live-map/drivers` — Live driver locations
- `GET /api/v1/admin/reports/revenue` — Revenue reports

**Webhooks** (no auth — IP whitelist + signature)
- `POST /api/v1/webhooks/payfast` — PayFast ITN
- `POST /api/v1/webhooks/ozow` — Ozow webhook
- `POST /api/v1/webhooks/stripe` — Stripe webhook
- `POST /api/v1/webhooks/partner/order` — Partner order webhook

## Project Structure

```
backend/
  app/
    Http/Controllers/    — API controllers (Api/V1, Admin)
    Models/              — Eloquent models
    Services/            — Business logic (Fare, Payment, Ride, etc.)
    Jobs/                — Queued jobs
  config/                — Laravel configuration
  database/migrations/   — Database schema
  routes/api.php         — All API route definitions
  tests/                 — PHPUnit tests
```
