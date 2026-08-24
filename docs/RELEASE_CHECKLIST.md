# EasyRyde — Production Release Checklist

> **Stack**: Laravel 11 (PHP 8.4) · PostgreSQL 16 + PostGIS · Redis 7 · Laravel Horizon · Reverb WebSockets  
> **Mobile**: Expo (React Native) — Rider, Driver, Admin  
> **CI**: GitHub Actions · **Deploy**: Blue-green Docker Compose

---

## 1. Prerequisites

### 1.1 Domains & DNS

- [ ] `api.easyryde.co.za` — A record points to production server IP
- [ ] `socket.easyryde.co.za` — A record points to production server IP
- [ ] TXT/SPF/DKIM records for outbound email (`hello@easyryde.com`)
- [ ] DNS TTL lowered to 300s before cutover (restore after)

### 1.2 SSL Certificates

- [ ] Let's Encrypt certs issued for `api.easyryde.co.za`
- [ ] Certs mounted at `./ssl/live/api.easyryde.co.za/` on server
- [ ] Auto-renewal verified (certbot container, 12h loop)

### 1.3 Android Signing

- [ ] Production keystore generated (`.docker/android/easyryde-upload-key.jks`)
- [ ] Keystore password, key alias, key password recorded in vault
- [ ] Keystore committed to CI secrets (see §6.3)

### 1.4 API Keys & Third-Party Services

| Key | Source | Used By |
|-----|--------|---------|
| Google Maps API Key | Google Cloud Console | All 3 mobile apps |
| Sentry DSN (PHP) | Sentry | Backend error tracking |
| Stripe key pair | Stripe Dashboard | Payment processing |
| Stripe webhook secret | Stripe Dashboard | Webhook verification |
| AWS S3 key pair | AWS IAM | File uploads |
| Telegram Bot Token | @BotFather | CI notifications |

- [ ] Google Maps API restricted to Android app's SHA-1 + iOS bundle ID
- [ ] Stripe webhook endpoint URL configured: `https://api.easyryde.co.za/api/v1/webhooks/stripe`
- [ ] Sentry project created and DSN for `easyryde-prod` configured

### 1.5 Server

- [ ] Production server provisioned (Ubuntu 24.04 LTS)
- [ ] Docker Engine 27+ and Docker Compose v2 installed
- [ ] `git`, `make`, `curl`, `jq` installed
- [ ] `/opt/easyryde/` directory created and repo cloned
- [ ] Server firewall: ports 22, 80, 443, 13099 (WebSocket) open
- [ ] `sysctl net.core.somaxconn=65535` set for WebSocket connections
- [ ] Server clock synchronised (NTP) — required for JWT tokens

### 1.6 CI Secrets (GitHub Actions)

- [ ] `SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY` added
- [ ] `DOCKER_USERNAME`, `DOCKER_PASSWORD` added
- [ ] `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` added
- [ ] `CODECOV_TOKEN` added
- [ ] `SENTRY_AUTH_TOKEN` added (for release tracking)

---

## 2. Backend Deployment

### 2.1 Pre-Deploy Checks

- [ ] `phpunit` — 285 tests, 555 assertions, 0 failures
- [ ] `phpstan analyse --level max` — no errors
- [ ] `pint --test` — passes
- [ ] `composer install --no-dev --optimize-autoloader` — no issues
- [ ] `APP_KEY` generated and stable (same across blue/green deploys)
- [ ] Database migrations reviewed: confirm no destructive changes since last deploy
- [ ] Rollback script written for this release's migrations

### 2.2 Environment Variables (`/opt/easyryde/.env`)

- [ ] `APP_KEY` — set to production key
- [ ] `APP_URL` — set to `https://api.easyryde.co.za`
- [ ] `APP_ENV=production`, `APP_DEBUG=false`
- [ ] `DB_PASSWORD` — strong random value (shared with PostgreSQL + PgBouncer)
- [ ] `REDIS_PASSWORD` — strong random value (shared with all Redis consumers)
- [ ] `JWT_SECRET` — strong random value (for socket-server JWT auth)
- [ ] `SANCTUM_STATEFUL_DOMAINS` — comma-separated frontend domains
- [ ] `MAIL_MAILER=smtp` — `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- [ ] `MAIL_FROM_ADDRESS=hello@easyryde.com`
- [ ] `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET` — for S3 uploads
- [ ] `SENTRY_LARAVEL_DSN` — production Sentry project
- [ ] `STRIPE_KEY`, `STRIPE_SECRET` — live (not test) keys
- [ ] `STRIPE_WEBHOOK_SECRET` — live webhook signing secret
- [ ] `FRONTEND_URL` — single allowed CORS origin
- [ ] `SESSION_DRIVER=redis`, `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis`

### 2.3 Docker Compose Deploy

- [ ] Blue or green target selected (`docker-compose.prod.blue.yml` / `green.yml`)
- [ ] Images pulled: `docker compose -f docker-compose.prod.blue.yml pull`
- [ ] Stack started: `docker compose -f docker-compose.prod.blue.yml up -d`
- [ ] All 6 services healthy (`docker compose ps` — all `Up`):
  - [ ] nginx
  - [ ] php-fpm
  - [ ] postgres (PostGIS)
  - [ ] redis
  - [ ] socket-server
  - [ ] horizon
  - [ ] pgbouncer
  - [ ] certbot

### 2.4 Post-Up Steps

- [ ] `docker exec easyryde-api-{color} php artisan migrate --force`
- [ ] `docker exec easyryde-api-{color} php artisan config:cache`
- [ ] `docker exec easyryde-api-{color} php artisan route:cache`
- [ ] `docker exec easyryde-api-{color} php artisan view:cache`
- [ ] `docker exec easyryde-api-{color} php artisan event:cache`
- [ ] `docker exec easyryde-api-{color} php artisan queue:restart`
- [ ] `docker exec easyryde-horizon-{color} php artisan horizon:terminate`
- [ ] `docker exec easyryde-api-{color} php artisan storage:link`

### 2.5 Horizon

- [ ] Horizon dashboard accessible (admin route, gated by 2FA)
- [ ] All queues listed: `high`, `default`, `low`, `websockets`
- [ ] No failed jobs on any queue

### 2.6 SSL/nginx

- [ ] nginx config updated to `api.easyryde.co.za` (already in `nginx/api.conf`)
- [ ] Let's Encrypt initial issuance: `docker compose run certbot certonly --webroot -w /var/www/html/letsencrypt -d api.easyryde.co.za`
- [ ] nginx reloaded: `docker exec easyryde-nginx nginx -s reload`
- [ ] HTTPS forced (301 redirect from HTTP)

---

## 3. Mobile App Build

> All 3 apps: `mobile/apps/{rider,driver,admin}` — repeat steps for each.

### 3.1 Pre-Build Checks

- [ ] `npx tsc --noEmit` — 0 errors (all 3 apps)
- [ ] `npx eslint . --ext .ts,.tsx` — no errors
- [ ] All shared packages (`mobile/packages/*`) compile cleanly
- [ ] Expo Go dev builds tested on physical Android device

### 3.2 EAS Build (each app)

```bash
# Rider
cd mobile/apps/rider
npx eas build --platform android --profile production

# Driver
cd ../driver
npx eas build --platform android --profile production

# Admin
cd ../admin
npx eas build --platform android --profile production
```

- [ ] Rider APK built (expected ~142 MB)
- [ ] Driver APK built (expected ~140 MB)
- [ ] Admin APK built (expected ~132 MB)
- [ ] All 3 APKs uploaded to EAS and downloadable

### 3.3 App Signing

- [ ] Production keystore used (not debug keystore)
- [ ] APK signed with correct key alias
- [ ] Google Play App Signing enabled (if Play Store)
- [ ] SHA-1 fingerprint matches Google Maps API key restriction

### 3.4 Play Store / Distribution

- [ ] Internal testing track set up on Google Play Console
- [ ] Testers added (email list)
- [ ] Release notes drafted for each app
- [ ] Screenshots + feature graphic uploaded to store listing
- [ ] App privacy policy URL set

---

## 4. Post-Deploy Verification

### 4.1 Smoke Tests (Backend API)

- [ ] `curl -I https://api.easyryde.co.za/api/v1/health` → `200 OK`
- [ ] Login: `POST /api/v1/auth/login` with admin credentials → returns token
- [ ] Login: `POST /api/v1/auth/login` with driver credentials → returns token
- [ ] Login: `POST /api/v1/auth/login` with rider credentials → returns token
- [ ] Auth me: `GET /api/v1/auth/me` with token → returns user data
- [ ] Ride creation: `POST /api/v1/rides` → `201 Created`
- [ ] Rate limiting: 10 rapid requests to login → `429 Too Many Requests`
- [ ] Sentry: Trigger a test exception → confirm it appears in Sentry dashboard
- [ ] Horizon: Dashboard loads, queues processing

### 4.2 WebSocket

- [ ] Socket server reachable: `curl -i https://socket.easyryde.co.za` → `400` (expected, WS upgrade)
- [ ] JWT-authenticated WS connection succeeds
- [ ] Ride status events received in real time (driver/rider)
- [ ] Location update events flow from driver to rider

### 4.3 Mobile Apps (on device)

- [ ] Rider app: login → see map → request ride → receive driver assignment
- [ ] Driver app: login → go online → receive ride request → accept → navigate
- [ ] Admin app: login → 2FA → view dashboard → see live rides
- [ ] Google Maps renders correctly on all 3 apps
- [ ] Push notifications arrive for ride events

### 4.4 Monitoring

- [ ] Sentry: no new errors after 15 minutes of smoke testing
- [ ] Horizon: no failed jobs after 15 minutes
- [ ] nginx access log: no `5xx` errors
- [ ] PHP-FPM status: `pm.status_path` shows enough idle workers
- [ ] Redis memory: `INFO memory` — within limits
- [ ] Database: `pg_stat_activity` — no long-running queries

### 4.5 Security

- [ ] Scan with `gitleaks` on latest commit — no secrets leaked
- [ ] Check `APP_DEBUG=false` in production `.env`
- [ ] Confirm CORS allows only `FRONTEND_URL`
- [ ] Confirm admin routes gated by 2FA (TOTP)
- [ ] Confirm rate limiting active: auth (10/min), API (60/min)

---

## 5. Rollback

### 5.1 Backend (Blue-Green)

```bash
# Flip nginx traffic back to previous stack
docker compose -f docker-compose.prod.<prev-color>.yml up -d
# Verify previous stack health
# Stop current stack
docker compose -f docker-compose.prod.<current-color>.yml down
```

- [ ] Previous compose stack (`blue` or `green`) still running with old code
- [ ] Database migration rollback script ready: `php artisan migrate:rollback --step=N`
- [ ] Old Docker images tagged and not yet pruned

### 5.2 Mobile App

- [ ] Google Play: promote previous APK build back to production track
- [ ] App Center / EAS: restore previous build artifact
- [ ] Users downgrade automatically (Play Store) or manually reinstall

### 5.3 Environment

- [ ] `.env` backup taken before deploy (`cp .env .env.$(date +%Y%m%d_%H%M%S)`)
- [ ] `APP_KEY` is same across blue/green (no re-encryption of data)
- [ ] Database backup taken before migration (`pg_dump`)

```bash
pg_dump -h localhost -U easyryde -d easyryde > /opt/easyryde/backups/pre-release-$(date +%Y%m%d_%H%M%S).sql
```

---

## 6. Manual Config Items

### 6.1 Production `.env` (at `/opt/easyryde/.env`)

| Variable | File | Notes |
|----------|------|-------|
| `APP_KEY` | `.env` | Generate with `php artisan key:generate`, keep stable |
| `DB_PASSWORD` | `.env`, `docker-compose.prod.*.yml` | Same value in all compose files |
| `REDIS_PASSWORD` | `.env`, `docker-compose.prod.*.yml` | Same in php-fpm, horizon, socket-server |
| `JWT_SECRET` | `.env`, `docker-compose.prod.*.yml` | Socket-server auth, same in all compose files |
| `MAIL_*` | `.env` | SMTP credentials for transactional email |
| `AWS_*` | `.env` | S3 bucket for uploads |
| `STRIPE_KEY/STRIPE_SECRET` | `.env` | Live (not test) keys |
| `STRIPE_WEBHOOK_SECRET` | `.env` | From Stripe Dashboard webhook settings |
| `SENTRY_LARAVEL_DSN` | `.env` | Production Sentry project |
| `FRONTEND_URL` | `.env` | CORS origin, single domain |
| `SANCTUM_STATEFUL_DOMAINS` | `.env` | SPA subdomains for Sanctum cookie auth |

### 6.2 Mobile App Config (`mobile/apps/*/eas.json`)

| Variable | File | Notes |
|----------|------|-------|
| `EXPO_PUBLIC_API_URL` | `eas.json` → `.build.production.env` | Set to `https://api.easyryde.co.za/api` |
| `EXPO_PUBLIC_SOCKET_URL` | `eas.json` → `.build.production.env` | Set to `https://socket.easyryde.co.za` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `eas.json` → `.build.production.env` | Restricted to app SHA-1 |
| `EXPO_PUBLIC_CLEARTEXT_TRAFFIC` | `eas.json` → `.build.production.env` | `false` for production |

Repeat for all 3 apps: `rider`, `driver`, `admin`.

### 6.3 GitHub Actions Secrets

| Secret | Set In | Used By |
|--------|--------|---------|
| `SERVER_HOST` | GitHub repo → Settings → Secrets | SSH deploy step |
| `SERVER_USER` | same | SSH deploy step |
| `SSH_PRIVATE_KEY` | same | SSH deploy step (ed25519 key) |
| `DOCKER_USERNAME` | same | Docker image push |
| `DOCKER_PASSWORD` | same | Docker image push |
| `TELEGRAM_BOT_TOKEN` | same | Deploy notification |
| `TELEGRAM_CHAT_ID` | same | Deploy notification |
| `CODECOV_TOKEN` | same | Coverage upload |

### 6.4 Google Play Console

- [ ] Keystore uploaded to Google Play App Signing
- [ ] App signing key certificate SHA-1 added to Google Maps API restriction
- [ ] Testers added to internal/closed testing track

---

## 7. Sign-Off

- [ ] **QA**: All smoke tests pass (see §4)
- [ ] **Security**: No open findings from last security scan
- [ ] **Team**: All GAPS.md items closed (19 confirmed)
- [ ] **CI**: `ci.yml` and `deploy.yml` passing on `main` at current commit
- [ ] **Backup**: Database and `.env` backed up
- [ ] **Release tagged**: `git tag v<major>.<minor>.<patch> && git push --tags`
