# EasyRyde — Deployment & Release Plan

> Production deployment strategy for a South African ride-hailing platform.
> Stack: Laravel 11 (PHP 8.4) · PostgreSQL 16 + PostGIS · Redis 7 · Node.js Socket.io · React Native (Expo) · Vite React Admin

---

## Table of Contents

1. [Infrastructure Setup](#1-infrastructure-setup)
2. [Backend Deployment](#2-backend-deployment)
3. [Socket Server Deployment](#3-socket-server-deployment)
4. [Web Admin Deployment](#4-web-admin-deployment)
5. [Mobile App Release](#5-mobile-app-release)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Monitoring & Alerting](#7-monitoring--alerting)
8. [Security](#8-security)
9. [Release Process](#9-release-process)
10. [Cost Estimation](#10-cost-estimation)

---

## 1. Infrastructure Setup

### 1.1 Hosting Recommendation (South African Context)

**Recommended: Hetzner South Africa (Cape Town)**

| Option | Provider | Monthly Cost (ZAR) | Notes |
|--------|----------|-------------------|-------|
| **VPS (Recommended)** | Hetzner CT1 | R1,400–R2,800 | 4 vCPU / 8–16GB RAM / 80–160GB NVMe |
| Budget VPS | Hetzner CPX11 | R700 | 2 vCPU / 4GB RAM — tight for full stack |
| Managed Cloud | AWS Cape Town | R5,000–R12,000 | Overkill at this stage |
| Managed Cloud | Azure SA North | R5,000–R10,000 | Overkill at this stage |

**Why Hetzner SA:**
- Physical presence in Cape Town = low latency for SA users (JHB/PTA ~20ms, Durban ~15ms)
- 40–60% cheaper than AWS/Azure for equivalent specs
- Simple pricing (no egress surprises)
- Supports Ubuntu 24.04 LTS (same as your existing server prep)
- API for automation available

**Server Spec (Minimum Production):**
```
CPU:     4 vCPU (AMD EPYC or Intel Xeon)
RAM:     16 GB (8GB for Docker stack + headroom)
Storage: 160 GB NVMe SSD
Bandwidth: 10 TB/month (included)
OS:      Ubuntu 24.04 LTS
Network: 1 Gbps
```

**Why not AWS/Azure for startup:**
- R5,000+/month gets you less compute than R2,000/month at Hetzner
- Complex pricing (data transfer, NAT gateway, ALB charges add up fast)
- You're already targeting `.co.za` domain — SA-hosted is faster for local users
- Can migrate to cloud later when scaling beyond single-server

### 1.2 Domain Setup

**Primary Domains:**
```
api.easyryde.co.za          → A record → production server IP
socket.easyryde.co.za       → A record → production server IP
admin.easyryde.co.za        → A record → Vercel/CDN IP (web admin)
easyryde.co.za              → A record → landing page / redirect
```

**DNS Provider:** Cloudflare (free plan)
- DDoS protection included (critical for ride-hailing)
- DNS propagation is fast (~300s)
- Rate limiting rules for API
- Page Rules for caching static assets

**DNS Records:**
```
Type  Name              Value                   TTL
A     api               <server-ip>             300
A     socket            <server-ip>             300
A     admin             <vercel-ip>             300
A     @                 <server-ip>             300
TXT   @                 v=spf1 include:...      300
MX    @                 mail.easyryde.co.za     300
```

### 1.3 SSL Certificates

**Backend & Socket (on VPS):**
- **Let's Encrypt** via Certbot (already in docker-compose.prod.yml)
- Auto-renewal every 12 hours (certbot container loop)
- TLS 1.2 + 1.3 only (no legacy SSL)

**Web Admin (on Vercel):**
- Automatic SSL via Vercel (no manual config needed)

**Setup commands (first time):**
```bash
# On production server
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/html/letsencrypt \
  -d api.easyryde.co.za

# For socket subdomain (same server, same cert)
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/html/letsencrypt \
  -d socket.easyryde.co.za
```

### 1.4 Database Hosting

**Decision: On-server PostgreSQL (Docker)**

| Option | Monthly Cost | Why |
|--------|-------------|-----|
| On-server PostGIS (Docker) | R0 (included in VPS) | PostGIS required, already configured |
| Supabase (managed Postgres) | ~R350/mo | Good but adds latency for same-server app |
| AWS RDS | R2,500+/mo | Overkill, no PostGIS on smallest instance |

**Rationale:**
- PostGIS 16 is in your docker-compose already
- Database and app on same server = lowest latency for queries
- 16GB RAM VPS can handle Postgres + Redis + PHP-FPM + Node comfortably
- Backups to S3 or Backblaze B2 for disaster recovery

**Production DB Config:**
```yaml
# In docker-compose.prod.yml
postgres:
  image: postgis/postgis:16-3.4
  deploy:
    resources:
      limits:
        memory: 2G  # Up from 1G for production
  command: >
    postgres
    -c shared_buffers=2GB
    -c effective_cache_size=6GB
    -c work_mem=64MB
    -c maintenance_work_mem=512MB
    -c max_connections=200
    -c log_min_duration_statement=1000
    -c log_checkpoints=on
    -c log_connections=on
    -c log_disconnections=on
```

### 1.5 Redis Hosting

**Decision: On-server Redis (Docker)**

Already in docker-compose.prod.yml. Redis 7 Alpine with:
- 1GB maxmemory, `allkeys-lru` eviction
- Password authentication
- Used for: sessions, cache, queue, Socket.io adapter, broadcasting

### 1.6 Server Firewall (UFW)

```bash
# On production server
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (certbot + redirect)
ufw allow 443/tcp   # HTTPS
ufw allow 13099/tcp # WebSocket (socket.easyryde.co.za)
ufw enable
```

### 1.7 Server Tuning

```bash
# /etc/sysctl.d/99-easyryde.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.core.netdev_max_backlog = 5000
vm.swappiness = 10

# Apply
sysctl --system
```

---

## 2. Backend Deployment

### 2.1 Dockerfile Optimization

**Current state:** `backend/Dockerfile.prod` — multi-stage, already decent.
**Issues found:**
1. Uses `COPY . .` before optimizing — rebuilds everything on any file change
2. No `.dockerignore` in backend directory (sends vendor, node_modules, tests to context)
3. Missing `opcache` extension for production PHP

**Optimized Dockerfile.prod:**
```dockerfile
FROM composer:2.8-alpine AS composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist \
    --optimize-autoloader --no-progress --no-scripts

FROM php:8.4-fpm-alpine AS base
RUN apk add --no-cache postgresql-libs icu-libs libzip
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql pgsql redis zip mbstring exif pcntl bcmath gd intl opcache

RUN addgroup -g 1000 -S appuser && adduser -u 1000 -S appuser -G appuser

WORKDIR /var/www/html

# Copy vendor first (cached layer)
COPY --from=composer /app/vendor vendor/

# Copy only production files
COPY artisan .
COPY config/ config/
COPY routes/ routes/
COPY app/ app/
COPY database/ database/
COPY public/ public/
COPY resources/ resources/

# Setup storage and cache
RUN mkdir -p storage/app/public storage/framework/cache/data \
    storage/framework/sessions storage/framework/views \
    storage/logs bootstrap/cache && \
    chmod -R 775 storage bootstrap/cache && \
    chown -R appuser:appuser storage bootstrap/cache && \
    php artisan package:discover --ansi && \
    php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache && \
    php artisan event:cache

USER appuser
EXPOSE 9000
CMD ["php-fpm"]
```

**Add backend/.dockerignore:**
```
.env
.env.*
!.env.example
.git
tests
coverage
.phpunit.result.cache
phpstan.phar
node_modules
*.md
.docker
docker-compose*
```

### 2.2 Database Migration Strategy

**Pre-migration checklist:**
```bash
# Before every deploy
1. Backup: pg_dump -h localhost -U easyryde -d easyryde > backups/pre-$(date +%s).sql
2. Review: php artisan migrate --pretend  # Shows SQL without executing
3. Confirm rollback plan for each migration
```

**Migration execution:**
```bash
# During blue-green deploy (runs on inactive color)
docker exec easyryde-php-{color} php artisan migrate --force

# If migration fails:
docker exec easyryde-php-{color} php artisan migrate:rollback --step=1
```

**Rules:**
- All migrations must be backward-compatible (old code can run against new schema)
- Never drop columns in the same release as code that reads them
- Use `Schema::hasColumn()` checks in code during transition periods
- Every migration must have a corresponding rollback

### 2.3 Environment Variable Management

**Strategy:** `.env` file on server, never in Docker images.

```bash
# /opt/easyryde/.env (on production server)
# Copy from backend/.env.production and fill in real values
cp backend/.env.production /opt/easyryde/.env
nano /opt/easyryde/.env  # Fill in real secrets
```

**Secrets never committed to git:**
- `APP_KEY` — generate with `php artisan key:generate`
- `DB_PASSWORD` — use `openssl rand -base64 32`
- `REDIS_PASSWORD` — use `openssl rand -base64 32`
- `JWT_SECRET` — use `openssl rand -base64 64`
- All `STRIPE_*`, `PAYFAST_*`, `OZOW_*` keys
- `SENTRY_DSN`, `TWILIO_*`, `MAIL_PASSWORD`

### 2.4 Queue Workers (Laravel Horizon)

Already configured in docker-compose.prod.yml. Horizon handles:
- `high` priority: ride matching, driver notifications
- `default`: email, SMS, general jobs
- `low`: reporting, analytics, cleanup

**Scaling (if needed later):**
```yaml
# Scale horizon workers
docker compose -f docker-compose.prod.yml up -d --scale horizon=2
```

### 2.5 Scheduled Tasks (Cron)

**Add to docker-compose.prod.yml:**
```yaml
scheduler:
  build:
    context: .docker/php
    dockerfile: Dockerfile
  command: >
    sh -c "echo '* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1' | crontab - && crond -f -L /dev/stdout"
  volumes:
    - ./:/var/www/html
  networks:
    - backend
  environment:
    - APP_ENV=production
    - APP_DEBUG=false
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 128M
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
```

**Existing scheduled tasks to verify:**
```php
// backend/routes/console.php
Schedule::command('horizon:snapshot')->everyFiveMinutes();
Schedule::command('queue:work --stop-when-empty')->everyMinute();
Schedule::command('app:cleanup-stale-locations')->everyFiveMinutes();
```

### 2.6 Post-Deploy Cache Warming

```bash
# After deploy, run in sequence:
docker exec easyryde-php-{color} php artisan config:cache
docker exec easyryde-php-{color} php artisan route:cache
docker exec easyryde-php-{color} php artisan view:cache
docker exec easyryde-php-{color} php artisan event:cache
docker exec easyryde-php-{color} php artisan queue:restart
```

---

## 3. Socket Server Deployment

### 3.1 Docker Setup

**Current state:** `.docker/socket/Dockerfile` and `socket-server/Dockerfile` both exist.

**Issues found:**
1. Two different Dockerfiles with different exposed ports (3001 vs 6001)
2. `.docker/socket/Dockerfile` copies from root context — confusing
3. No health check endpoint in `socket-server/Dockerfile`

**Consolidated Dockerfile (socket-server/Dockerfile):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
```

**docker-compose.prod.yml update:**
```yaml
socket-server:
  build:
    context: ./socket-server  # Fixed: use socket-server as context
    dockerfile: Dockerfile
  container_name: easyryde-socket
  ports:
    - "13099:3001"
  networks:
    - frontend
    - backend
  environment:
    - NODE_ENV=production
    - PORT=3001
    - APP_API_BASE_URL=http://nginx
    - JWT_SECRET=${JWT_SECRET}
    - REDIS_HOST=redis
    - REDIS_PORT=6379
    - REDIS_PASSWORD=${REDIS_PASSWORD}
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 512M
  depends_on:
    redis:
      condition: service_healthy
```

### 3.2 Redis Adapter Configuration

Socket.io uses `@socket.io/redis-adapter` for multi-instance pub/sub. Ensure Redis is accessible:

```javascript
// socket-server/src/services/redis.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { Redis } = require('ioredis');

const pubClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 3.3 Load Balancing (Sticky Sessions)

For single-server deployment, no load balancer needed. For future multi-server:

**nginx upstream with sticky sessions:**
```nginx
upstream socket_backend {
    ip_hash;  # Sticky sessions by client IP
    server socket1:3001;
    server socket2:3001;
}

server {
    location /socket.io/ {
        proxy_pass http://socket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### 3.4 Health Monitoring

**Health endpoint (already exists in socket-server):**
```bash
curl -i https://socket.easyryde.co.za/health
# Expected: 200 OK with JSON status
```

**Prometheus metrics:**
- Add `prom-client` to socket-server for metrics export on port 6001
- Already configured in prometheus.yml to scrape `socket-server:6001`

---

## 4. Web Admin Deployment

### 4.1 Build & Deploy

**Option A: Vercel (Recommended for simplicity)**

```bash
# In web/ directory
npm run build  # Produces dist/ folder

# Deploy to Vercel
npx vercel --prod
```

**Vercel configuration (vercel.json in web/):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Option B: Docker on VPS (if you want everything on one server)**

```yaml
# Add to docker-compose.prod.yml
web-admin:
  build:
    context: ./web
    dockerfile: Dockerfile
  container_name: easyryde-web-admin
  networks:
    - frontend
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 128M
```

### 4.2 Environment Variables

**Vercel:**
- Set via Vercel dashboard → Settings → Environment Variables
- `VITE_API_TARGET` → `https://api.easyryde.co.za`

**Docker:**
- Pass via `.env` file on server
- `VITE_API_TARGET=https://api.easyryde.co.za`

### 4.3 CDN Setup

**If using Vercel:** CDN included (global edge network, ~50ms for SA users via Cloudflare routing).

**If self-hosted on VPS:**
- Cloudflare free plan as reverse proxy
- Enable "Auto Minify" for JS/CSS
- Enable "Brotli" compression
- Page Rules: `admin.easyryde.co.za/*` → Cache Level: Standard

---

## 5. Mobile App Release

### 5.1 EAS Build Configuration

**Current state:** All 3 apps have `eas.json` with development/preview/production profiles.

**Required updates to eas.json (all 3 apps):**
```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle",
        "keystorePath": "android/easyryde-upload-key.jks",
        "keystoreAlias": "easyryde",
        "googleServicesFile": "./google-services.json"
      },
      "ios": {
        "bundleIdentifier": "za.co.easyryde.rider",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.easyryde.co.za/api",
        "EXPO_PUBLIC_SOCKET_URL": "https://socket.easyryde.co.za",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "your_key_here",
        "EXPO_PUBLIC_CLEARTEXT_TRAFFIC": "false"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id",
        "ascAppId": "your-asc-app-id"
      }
    }
  }
}
```

### 5.2 Google Play Store Setup (3 APKs)

**Play Console Setup (per app):**

| App | Package Name | Play Console URL |
|-----|-------------|-----------------|
| Rider | `za.co.easyryde.rider` | play.google.com/console |
| Driver | `za.co.easyryde.driver` | play.google.com/console |
| Admin | `za.co.easyryde.admin` | play.google.com/console |

**Steps per app:**
1. Create app in Google Play Console
2. Complete store listing (description, screenshots, feature graphic)
3. Set content rating (IARC questionnaire)
4. Set pricing (free) and distribution (South Africa)
5. Upload privacy policy URL
6. Upload production keystore to Play App Signing
7. Add testers to internal testing track
8. Generate upload key (if using Play App Signing)
9. Set up Play Integrity API (for ride-hailing fraud prevention)

**Build commands:**
```bash
# Build all 3 apps
cd mobile/apps/rider && eas build --platform android --profile production
cd mobile/apps/driver && eas build --platform android --profile production
cd mobile/apps/admin && eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

### 5.3 App Store Connect (iOS)

**If iOS is needed later:**
1. Enroll in Apple Developer Program ($99/year)
2. Create App IDs in Apple Developer portal
3. Create provisioning profiles
4. Configure in eas.json under `build.production.ios`
5. Build: `eas build --platform ios --profile production`
6. Submit: `eas submit --platform ios --profile production`

### 5.4 Over-the-Air Updates (EAS Update)

**Strategy:** Use EAS Update for JavaScript bundle updates without app store review.

```bash
# Update JS bundle without new app store release
eas update --branch production --message "Fix ride matching bug"

# This updates the JS bundle on user devices immediately
# Native code changes still require full app store release
```

**Channel setup:**
- `development` → dev builds, points to dev API
- `preview` → internal testing, points to staging API
- `production` → production builds, points to production API

**Rules:**
- Use EAS Update for bug fixes, UI tweaks, non-native changes
- Use full build for new native modules, permissions, SDK updates
- Always test OTA update on preview channel before production

### 5.5 Version Numbering Scheme

**Format:** `MAJOR.MINOR.PATCH` (semantic versioning)

| Component | Example | When to bump |
|-----------|---------|-------------|
| MAJOR | 2.0.0 | Breaking API changes, database migrations |
| MINOR | 1.1.0 | New features, new screens |
| PATCH | 1.0.1 | Bug fixes, OTA updates |

**Where to set version:**
- `mobile/apps/*/app.json` → `version`
- `mobile/apps/*/package.json` → `version`
- Both must match

**Automated version bump (in CI):**
```bash
# Patch bump on every release
npm version patch --no-git-tag-version
# Then commit and tag
```

---

## 6. CI/CD Pipeline

### 6.1 Current State

**Existing workflows:**
- `.github/workflows/ci.yml` — runs on push to main/develop and PRs to main
- `.github/workflows/deploy.yml` — builds Docker images, deploys on main push

**Issues found:**
1. `ci.yml` and `deploy.yml` have overlapping test steps (run tests twice)
2. No EAS build automation in CI
3. Deploy step is SSH-based (works but could be more robust)
4. No staging environment workflow

### 6.2 Recommended Pipeline Structure

```
PR opened → ci.yml (test only)
    ↓
Merge to develop → ci.yml (test) + build preview APKs
    ↓
Merge to main → ci.yml (test) + deploy.yml (build + deploy production)
    ↓
Tag v*.*.* → build production APKs + submit to Play Store
```

### 6.3 Optimized GitHub Actions

**ci.yml (test only — runs on all pushes and PRs):**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgis/postgis:16-3.4-alpine
        env:
          POSTGRES_DB: easyryde_test
          POSTGRES_USER: easyryde
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: pdo_pgsql, redis, bcmath, gd, intl
          coverage: xdebug
      - run: composer install --no-interaction --prefer-dist
      - run: cp .env.example .env && php artisan key:generate
      - run: ./vendor/bin/phpstan analyse --memory-limit=2G --no-progress
      - run: ./vendor/bin/pint --test
      - run: php artisan test
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_DATABASE: easyryde_test
          DB_USERNAME: easyryde
          DB_PASSWORD: test

  socket:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: socket-server
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: socket-server/package-lock.json
      - run: npm ci
      - run: npm test

  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  mobile:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      - run: npm ci
      - run: |
          npx tsc -p apps/rider/tsconfig.json --noEmit
          npx tsc -p apps/driver/tsconfig.json --noEmit
          npx tsc -p apps/admin/tsconfig.json --noEmit

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: symfonycorp/security-checker-action@v5
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**deploy.yml (build + deploy — runs only on main push):**
```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/ci.yml  # Reuse CI workflow

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile.prod
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/easyryde-api:${{ github.sha }}
            ${{ secrets.DOCKER_USERNAME }}/easyryde-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - uses: docker/build-push-action@v5
        with:
          context: ./socket-server
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/easyryde-socket:${{ github.sha }}
            ${{ secrets.DOCKER_USERNAME }}/easyryde-socket:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - uses: docker/build-push-action@v5
        with:
          context: ./web
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/easyryde-web:${{ github.sha }}
            ${{ secrets.DOCKER_USERNAME }}/easyryde-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/easyryde
            git pull origin main

            # Backup before deploy
            docker exec easyryde-postgres pg_dump -U easyryde easyryde > \
              backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql

            # Build and start
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --build

            # Wait for health
            sleep 10

            # Migrate
            docker exec easyryde-php php artisan migrate --force

            # Cache
            docker exec easyryde-php php artisan config:cache
            docker exec easyryde-php php artisan route:cache
            docker exec easyryde-php php artisan view:cache

            # Restart queue
            docker exec easyryde-php php artisan queue:restart

      - name: Notify
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: "✅ EasyRyde deployed: ${{ github.sha }}"
```

### 6.4 Mobile Build Automation

**Trigger on version tag:**
```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [rider, driver, admin]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup EAS
        run: npm install -g eas-cli

      - name: Build
        working-directory: mobile/apps/${{ matrix.app }}
        run: eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Submit to Play Store
        working-directory: mobile/apps/${{ matrix.app }}
        run: eas submit --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
```

### 6.5 Rollback Strategy

**Backend rollback (blue-green):**
```bash
# Script already exists: scripts/deploy/rollback.sh
# Flips nginx traffic back to previous color
bash scripts/deploy/rollback.sh production
```

**Docker image rollback:**
```bash
# Pin to previous SHA
docker compose -f docker-compose.prod.yml up -d \
  --build --no-deps \
  -e IMAGE_TAG=<previous-sha>
```

**Database rollback:**
```bash
# If migration caused issues
docker exec easyryde-php php artisan migrate:rollback --step=1

# If full restore needed
gunzip -c backups/pre-deploy-*.sql.gz | docker exec -i easyryde-postgres \
  psql -U easyryde -d easyryde
```

---

## 7. Monitoring & Alerting

### 7.1 Prometheus Metrics

**Already configured in docker-compose.monitoring.yml.** Scrape targets:

| Target | Port | Metrics |
|--------|------|---------|
| PHP-FPM | 9000 | Request duration, active workers, queue depth |
| PostgreSQL | 9187 | Connections, query duration, cache hit ratio |
| Redis | 9121 | Memory, ops/sec, connected clients |
| Socket.io | 6001 | WebSocket connections, message rate |
| nginx | 80 | Request rate, response codes, latency |

**Add to socket-server for metrics export:**
```bash
npm install prom-client
```

### 7.2 Grafana Dashboards

**Already provisioned:** `grafana/dashboards/easyryde-overview.json` and `laravel-performance.json`

**Access:** `http://<server-ip>:3000` (restrict to internal network or VPN)

**Key dashboards to create:**
1. **Ride Operations** — active rides, driver availability, match latency
2. **API Performance** — request rate, p50/p95/p99 latency, error rate
3. **Infrastructure** — CPU, RAM, disk, network per container
4. **Business Metrics** — rides/hour, revenue/hour, completion rate

### 7.3 Error Tracking (Sentry)

**Already configured in .env.example.** Setup:

```bash
# Install Sentry Laravel SDK
composer require sentry/sentry-laravel

# In config/sentry.php (publish with:)
php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider"
```

**Config:**
```php
// config/sentry.php
return [
    'dsn' => env('SENTRY_LARAVEL_DSN'),
    'environment' => env('APP_ENV'),
    'release' => env('SENTRY_RELEASE', 'unknown'),
    'traces_sample_rate' => 0.25,
    'profiles_sample_rate' => 0.1,
];
```

**Mobile Sentry (all 3 apps):**
```bash
npx expo install @sentry/react-native
npx sentry-wizard -i reactNative -p ios android
```

### 7.4 Uptime Monitoring

**Recommended: BetterStack (free tier) or UptimeRobot (free)**

Configure checks:
| Check | URL | Interval |
|-------|-----|----------|
| API Health | `https://api.easyryde.co.za/api/v1/health` | 60s |
| Socket Health | `https://socket.easyryde.co.za/health` | 60s |
| Web Admin | `https://admin.easyryde.co.za` | 300s |
| SSL Certificate | `https://api.easyryde.co.za` | 86400s |

### 7.5 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU usage | >70% for 5min | >90% for 2min | Scale or investigate |
| RAM usage | >80% | >95% | Kill processes or scale |
| Disk usage | >75% | >90% | Clean logs/backups |
| API p95 latency | >500ms | >2000ms | Check DB queries |
| Error rate | >1% of requests | >5% of requests | Check Sentry |
| Failed jobs | >10 | >50 | Check Horizon |
| DB connections | >150 | >180 | Check PgBouncer |
| Redis memory | >80% | >95% | Increase limit |

---

## 8. Security

### 8.1 SSL/TLS Configuration

**nginx TLS config (already in api.conf):**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
```

**Add HSTS preload:**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### 8.2 API Rate Limiting

**Already configured via Laravel middleware. Verify thresholds:**

```php
// backend/routes/api.php
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
});

// auth throttle: 10 requests per minute
// API throttle: 60 requests per minute
// Ride requests: 5 per minute (prevent spam)
```

**nginx rate limiting (add to api.conf):**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/v1/auth/ {
    limit_req zone=auth burst=3 nodelay;
    # ...
}

location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ...
}
```

### 8.3 DDoS Protection

**Layer 1: Cloudflare (free plan)**
- Automatic DDoS mitigation
- Bot detection
- Rate limiting rules
- Under Attack mode for emergencies

**Layer 2: nginx**
- Connection limiting: `limit_conn_zone $binary_remote_addr zone=conn:10m;`
- `limit_conn conn 50;` — max 50 concurrent connections per IP

**Layer 3: Application**
- Laravel rate limiting (per user/IP)
- Socket.io rate limiting (already in socket-server/src/middleware/rateLimit.js)

### 8.4 Backup Strategy

**Automated backups (already in scripts/backup-db.sh):**

**Schedule via cron on server:**
```bash
# /etc/crontab
0 2 * * * root /opt/easyryde/scripts/backup-db.sh >> /var/log/easyryde-backup.log 2>&1
```

**Backup targets:**
| What | Frequency | Retention | Destination |
|------|-----------|-----------|-------------|
| PostgreSQL full dump | Daily 2am | 30 days | Local + S3 |
| PostgreSQL WAL archiving | Continuous | 7 days | S3 |
| Redis RDB snapshot | Hourly | 24 hours | Local |
| Application .env | Daily | 30 days | S3 |
| Docker volumes | Daily | 7 days | S3 |
| Server config | Weekly | 90 days | Git |

**S3 setup:**
```bash
# Install AWS CLI
apt install awscli

# Configure
aws configure
# Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, region=af-south-1

# Update backup-db.sh to use S3
aws s3 cp "$BACKUP_FILE" "s3://easyryde-backups/$(basename $BACKUP_FILE)"
```

### 8.5 Disaster Recovery

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 1 hour (max data loss)

**Recovery procedure:**
```bash
# 1. Provision new server (Hetzner, same spec)
# 2. Install Docker, docker-compose
# 3. Clone repo
git clone https://github.com/easyryde/EasyRyde.git /opt/easyryde

# 4. Restore .env
aws s3 cp s3://easyryde-backups/.env /opt/easyryde/.env

# 5. Restore database
aws s3 cp s3://easyryde-backups/latest-db-dump.sql.gz /tmp/
gunzip -c /tmp/latest-db-dump.sql.gz | docker exec -i easyryde-postgres \
  psql -U easyryde -d easyryde

# 6. Start stack
docker compose -f docker-compose.prod.yml up -d

# 7. Verify
curl -I https://api.easyryde.co.za/api/v1/health
```

---

## 9. Release Process

### 9.1 Blue/Green Deployment

**Already implemented** in `docker-compose.prod.blue.yml`, `docker-compose.prod.green.yml`, and `scripts/deploy/blue-green-deploy.sh`.

**How it works:**
1. Blue stack runs live traffic on port 80
2. Deploy new code to Green stack on port 8082
3. Health check Green stack
4. Run migrations on Green
5. Flip nginx upstream to Green
6. Wait 60s for connection drain
7. Stop Blue stack

**Deployment command:**
```bash
bash scripts/deploy/blue-green-deploy.sh production
```

### 9.2 Feature Flags

**Implementation: Laravel Pennant or custom DB table**

```php
// backend/app/Services/FeatureFlagService.php
class FeatureFlagService
{
    public function isEnabled(string $flag, $user = null): bool
    {
        return Cache::remember("feature_flag_{$flag}", 300, function () use ($flag, $user) {
            return FeatureFlag::where('name', $flag)
                ->where('enabled', true)
                ->where(function ($q) use ($user) {
                    $q->whereNull('user_id')
                      ->orWhere('user_id', $user?->id);
                })
                ->exists();
        });
    }
}
```

**Usage:**
```php
if (app(FeatureFlagService::class)->isEnabled('scheduled_rides', $user)) {
    // Show scheduled ride option
}
```

**Admin UI:** Add feature flag toggle to admin dashboard.

### 9.3 App Store Review Process

**Google Play Store:**
- Internal testing → closed testing → open testing → production
- Review time: 1–7 days (usually 1–3 days for SA apps)
- Avoid: crashes, ANRs, policy violations, misleading content
- Required: privacy policy, data safety form, content rating

**Strategy:**
1. Build → internal testing track (team tests)
2. 2–3 days monitoring for crashes
3. Promote to closed testing (beta testers)
4. 1 week monitoring
5. Promote to production

### 9.4 Staged Rollout

**Google Play staged rollout:**
```
Day 1:  10% of users
Day 3:  25% of users (if no issues)
Day 5:  50% of users
Day 7:  100% of users
```

**Monitor during rollout:**
- Crash rate < 1%
- ANR rate < 0.5%
- 1-star review rate < 5%
- Sentry error rate stable

**Rollback:** Revert to previous APK in Play Console if issues found.

### 9.5 Release Checklist

**Pre-release:**
- [ ] All CI checks pass
- [ ] Database migrations backward-compatible
- [ ] Environment variables documented
- [ ] Sentry DSN configured
- [ ] Uptime monitoring configured
- [ ] Backup verified

**Release:**
- [ ] Database backup taken
- [ ] Blue-green deploy executed
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Sentry showing no new errors
- [ ] Telegram notification sent

**Post-release (24 hours):**
- [ ] Monitor error rates
- [ ] Monitor API latency
- [ ] Check user feedback
- [ ] Verify payment processing
- [ ] Confirm push notifications working

---

## 10. Cost Estimation

### 10.1 Monthly Infrastructure Costs (ZAR)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Hetzner CT1 VPS** | R2,100 | 4 vCPU / 16GB RAM / 160GB NVMe |
| **Cloudflare** | R0 | Free plan (DDoS, DNS, CDN) |
| **Let's Encrypt** | R0 | Free SSL certificates |
| **GitHub Actions** | R0 | 2,000 min/month free (足够) |
| **EAS Build** | R0–R350 | Free tier: 30 builds/month; Pro: $19/mo |
| **Vercel (Web Admin)** | R0–R175 | Free tier: 100GB bandwidth; Pro: $20/mo |
| **Total Infrastructure** | **R2,100–R2,975** | |

### 10.2 Third-Party Service Costs (ZAR)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Sentry** | R0–R450 | Free tier: 5K errors/month; Team: $26/mo |
| **BetterStack** | R0–R350 | Free tier: 5 monitors; Pro: $24/mo |
| **SendGrid** | R0–R650 | Free: 100 emails/day; Essentials: $19.95/mo |
| **Twilio (SMS)** | R500–R2,000 | R0.50–R1.00 per SMS in SA |
| **Google Maps** | R0–R875 | $200 free credit/month; then ~$7/1K requests |
| **Stripe** | 2.9% + R5.50 | Per transaction (no monthly fee) |
| **PayFast** | 2.0% + R2.00 | Per transaction (no monthly fee) |
| **Ozow** | R5.00 flat | Per transaction (no monthly fee) |
| **Firebase (FCM)** | R0 | Free for push notifications |
| **Apple Developer** | R1,850/year | R154/month equivalent (iOS builds) |
| **Total Services** | **R2,500–R5,500** | |

### 10.3 Total Monthly Budget

| Scenario | Monthly Cost | Notes |
|----------|-------------|-------|
| **Bootstrap** | R2,100 | VPS only, free tiers everywhere |
| **Launch** | R4,600 | VPS + basic services |
| **Growth** | R8,500 | VPS + paid tiers + SMS |
| **Scale** | R15,000+ | Multiple servers + full services |

### 10.4 Cost Optimization Tips

1. **Start with Hetzner** — move to cloud only when you need auto-scaling
2. **Use free tiers** — Sentry, BetterStack, Vercel, GitHub Actions all have generous free tiers
3. **Batch SMS** — SendGrid for email (free), Twilio for critical SMS only
4. **Optimize images** — Compress app assets before upload to reduce bandwidth
5. **Monitor costs** — Set billing alerts on all services
6. **Negotiate** — Hetzner offers discounts for annual billing

---

## Appendix A: Quick Reference

### Deploy Commands

```bash
# Full production deploy
bash scripts/deploy/blue-green-deploy.sh production

# Health check
bash scripts/health-check.sh https://api.easyryde.co.za/api/v1/health

# Rollback
bash scripts/deploy/rollback.sh production

# Database backup
bash scripts/backup-db.sh

# Build mobile apps
cd mobile/apps/rider && eas build --platform android --profile production
cd mobile/apps/driver && eas build --platform android --profile production
cd mobile/apps/admin && eas build --platform android --profile production
```

### Server Access

```bash
# SSH
ssh root@<server-ip>

# View containers
docker compose -f /opt/easyryde/docker-compose.prod.yml ps

# View logs
docker compose -f /opt/easyryde/docker-compose.prod.yml logs -f php-fpm
docker compose -f /opt/easyryde/docker-compose.prod.yml logs -f socket-server

# Enter container
docker exec -it easyryde-php bash

# Run artisan
docker exec easyryde-php php artisan <command>
```

### Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `APP_KEY` | .env | Laravel encryption key |
| `DB_PASSWORD` | .env | PostgreSQL password |
| `REDIS_PASSWORD` | .env | Redis password |
| `JWT_SECRET` | .env | Socket.io JWT secret |
| `SENTRY_DSN` | .env | Error tracking DSN |
| `STRIPE_SECRET_KEY` | .env | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | .env | Stripe webhook secret |
| `EXPO_TOKEN` | GitHub Secrets | EAS Build authentication |

---

## Appendix B: Server Provisioning Script

```bash
#!/bin/bash
# scripts/provision-server.sh
# Run on fresh Ubuntu 24.04 LTS server

set -e

echo "=== Provisioning EasyRyde Production Server ==="

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Install Docker Compose
apt install docker-compose-plugin -y

# Install tools
apt install git curl jq ufw awscli -y

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 13099/tcp
ufw enable

# Kernel tuning
cat > /etc/sysctl.d/99-easyryde.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.core.netdev_max_backlog = 5000
vm.swappiness = 10
EOF
sysctl --system

# Create directory
mkdir -p /opt/easyryde
mkdir -p /opt/easyryde/backups

# Clone repo
cd /opt/easyryde
git clone https://github.com/easyryde/EasyRyde.git .

# Setup environment
cp backend/.env.production .env
echo ""
echo "=== Edit /opt/easyryde/.env with production values ==="
echo "=== Then run: bash scripts/deploy/blue-green-deploy.sh production ==="
```
