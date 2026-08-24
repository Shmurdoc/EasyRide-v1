# EasyRyde — Deployment & Release

> **Segment**: 07-INFRASTRUCTURE · **Status**: VERIFIED 2026-08-14  
> **Linked**: `DOCKER-ARCH.md`, `CI-CD.md`, `../09-OPS/BACKUP-DR.md`, `../09-OPS/RUNBOOKS.md`

---

## 1. Environments

| Env | URL | Stack | Who |
|---|---|---|---|
| dev | localhost:3082 (API), Expo dev | docker compose dev | devs |
| production | api.easyryde.co.za · admin.easyryde.co.za | prod compose or deployment variant on `/opt/easyryde` | founders |
| (blue/green) | weight-switched via nginx blue-green.conf | prod blue/green pair | deploy tooling |

## 2. Standard Deploy Path (deployment/scripts/deploy.sh — 7 steps)

```
1 git pull                     4 stop queue/scheduler   5 artisan migrate --force
2 compose build --no-cache     3 optional backup (backup.sh)
6 db:seed --class=RoleSeeder --force   7 up -d + health-check.sh   → writes .last-deployment
Rollback: --rollback → git checkout marker commit + recreate
```

## 3. Blue/Green Cutover (scripts/deploy/blue-green-deploy.sh)

```
detect ACTIVE color (easyryde-nginx-{blue,green} exists)
build+start INACTIVE compose (8081/8082) → poll /api/health ×30 (2s)
migrate once → sed flip weights in nginx/blue-green.conf → nginx -s reload
drain 60s → stop OLD color. Rollback script reverses weights.
```

## 4. CI-Triggered Deploy (deploy.yml — push main)

`test-backend → build (Docker Hub easyryde-api/easyryde-socket, sha tags) + build-mobile (EAS rider/driver/admin) → deploy (ssh /opt/easyryde: pull, compose prod up, migrate, config:cache, route:cache, view:cache, telegram notify)`.

## 5. Database Migrations Rule

- Migrations run **before** code switch (blue/green or stop-start) to avoid app/schema skew.
- Never `migrate:fresh` on prod. Backup before every deploy (backup.sh automatic in deploy.sh).
- `php artisan migrate --force` in non-interactive.

## 6. Mobile Release (EAS)

| App | appId | EAS project | Profile prod |
|---|---|---|---|
| rider | za.co.easyryde.rider | 4ba44209-c0fe-4311-ba97-3f271ad9eaec | `eas build --platform android --profile production` |
| driver | za.co.easyryde.driver | — | same |
| admin | za.co.easyryde.admin | — | same |

- Never bare `gradlew assembleRelease` (README rule) — use `npx expo run:android --variant release` locally.
- Release builds MUST have `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_SOCKET_URL` pointing at prod (HIGH-007 guard).

## 7. Rollback Decision Table

| Failure context | Action |
|---|---|
| API broken after deploy | `deploy.sh --rollback` (git marker) → health-check |
| Mobile app broken in store | EAS re-build previous commit; keep both builds live during approval |
| Migration broke schema | restore DB from backup (BACKUP-DR.md) then rollback code |
| Socket regression | socket is stateless (Redis state) → rollback socket image only |

## 8. Post-Deploy Verification (health-check.sh)

Containers (7) · `/api/v1/health` · socket `:3001/health` · pg_isready + PostGIS version · Redis PING + memory.

## References

- Compose detail: `DOCKER-ARCH.md` · Build pipeline: `CI-CD.md` · SLOs: `../09-OPS/SLO-SLI.md`