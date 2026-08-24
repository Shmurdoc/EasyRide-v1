# EasyRyde — Docker Architecture

> **Segment**: 07-INFRASTRUCTURE · **Status**: REWRITTEN 2026-08-14 — v1 had factual drift (ports, network, volumes, missing services); this matches `docker-compose.yml` exactly  
> **Linked**: `DEPLOYMENT.md`, `CI-CD.md`, `MONITORING.md`

---

## 1. Dev Stack (docker-compose.yml — 7 services)

| Service | Image/Build | Ports (host→cont) | Volumes | Healthcheck |
|---|---|---|---|---|
| backend | `./backend/Dockerfile` (php:8.4-fpm-alpine) | — | `./backend:/var/www` + `backend-storage` + `backend-logs` | — |
| nginx | nginx:alpine | **90:80, 9443:443, 3082:8080** | `./backend:/var/www`, `./nginx/conf.d`, `backend-storage`, `./nginx/ssl` | — |
| database | postgres:16-alpine | **5433:5432** | `postgres-data` | pg_isready 10s/5/5 |
| redis | redis:7-alpine | **6380:6379** | `redis-data` | ping 10s/5/5 |
| queue | backend image | — | `backend-storage` | — · `artisan queue:work --sleep=3 --tries=3 --max-time=3600` |
| scheduler | backend image | — | `backend-storage` | — · `schedule:run` 60s loop |
| socket-server | `./socket-server/Dockerfile` | **3002:3001** | — | — · env REDIS_HOST=redis, CLIENT_URL=http://nginx:8080 |

Network `easyryde` (bridge). **No frontend/admin services in dev compose** — admin runs via Vite (`:3001` on host) with `/api` proxy → `localhost:8000`; mobile runs via Expo on host.

## 2. Production Stack (docker-compose.prod.yml)

Networks: `easyryde_frontend` (bridge) + `easyryde_backend` (internal). Volumes: `postgres_data`, `redis_data`, `easyryde_storage`.

| Service | Image | Ports | Notes |
|---|---|---|---|
| nginx | nginx:alpine | 80:80, 443:443 | `nginx/api.conf`, letsencrypt mount |
| php-fpm | `.docker/php/Dockerfile` (8.4-bookworm) | — | Redis drivers (cache/session/queue/broadcast), 512M |
| postgres | postgis/postgis:16-3.4 | — | 1G, user easyryde |
| redis | redis:7-alpine | — | requirepass, maxmemory 1gb allkeys-lru |
| socket-server | `.docker/socket/Dockerfile` (node:20) | 13099:3001 | APP_API_BASE_URL=http://nginx |
| horizon | php image | — | `php artisan horizon` |
| pgbouncer | edoburu/pgbouncer | — | transaction pooling, 100 conns |
| certbot | certbot/certbot | — | renew every 12h |

## 3. Blue/Green Pair (docker-compose.prod.{blue,green}.yml)

- Identical structure; every container suffixed `-blue`/`-green`; `DEPLOY_COLOR` env; nginx `8081:80` (blue) / `8082:80` (green); no host socket mapping (internal).
- Switch logic: `scripts/deploy/blue-green-deploy.sh` flips weights in `nginx/blue-green.conf` (weight 1↔0) + reload — see `DEPLOYMENT.md`.

## 4. Server-Hosted Variant (deployment/docker-compose.yml)

nginx(80/443 + admin SPA) · laravel (deployment/Dockerfile.laravel) · socket (deployment/Dockerfile.socket, healthcheck :3001/health) · database postgis · redis(requirepass) · queue=horizon · scheduler · admin (nginx serving admin-dist).

## 5. PHP Runtime Facts

- Dev backend: php:8.4-fpm-alpine, extensions `pdo_pgsql pgsql bcmath mbstring xml zip intl opcache pcntl` + pecl redis; HEALTHCHECK `:9000/up`.
- Prod: php:8.4-fpm-bookworm + `gd gmp exif` + composer; entrypoint caches config/routes/views/events.
- Both: user `appuser` uid 1000.

## 6. Startup Order & Health Gates

`database(healthy) + redis(healthy) → backend → nginx → queue/scheduler → socket-server`. Production deploy script runs migrations + seeds before `up -d` (DEPLOYMENT.md).

## 7. Known Issues (unchanged from v1, still open)

- No healthcheck on backend/queue/scheduler services (dev).
- No log rotation for nginx/docker containers (B-204).
- No resource limits on dev services.
- Legacy `socket/` server NOT wired to compose (quarantined — `THREAT-MODEL.md` T-05).

## References

- Deploy process: `DEPLOYMENT.md` · CI build steps: `CI-CD.md` · Monitoring: `MONITORING.md` · nginx routing: `../01-REQUIREMENTS/SYSTEM-OVERVIEW.md` §3