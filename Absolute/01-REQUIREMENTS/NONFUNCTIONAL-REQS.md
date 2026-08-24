# EasyRyde — Non-Functional Requirements

> **Segment**: 01-REQUIREMENTS · **Status**: VERIFIED 2026-08-14  
> **Linked**: `../05-SECURITY/THREAT-MODEL.md`, `../09-OPS/SLO-SLI.md`, `../07-INFRASTRUCTURE/MONITORING.md`, `../../docs/flow/05-production-readiness/sla-commitments.md`

---

## 1. Performance

| ID | Requirement | Current fact | Gap? |
|---|---|---|---|
| NFR-101 | API p95 < 500ms (normal load) | k6 thresholds: rides p95<500ms; admin endpoints p95<1000ms | Pending load validation run |
| NFR-102 | Location updates p95 < 200ms @500VU | k6 scenario `driver-location-updates.js` targets this | Pending run |
| NFR-103 | WebSocket connect p95 < 200ms | k6 `websocket-connections.js` (1000 VU) | Pending run |
| NFR-104 | Static fare estimate cold < 1s | `FareCalculationService` uses route service (OSRM) + cached fare rates | — |
| NFR-105 | Cache hot paths in Redis | fare rates (`PlatformFeeService`), driver geos, ride info (24h), auth cache (60s) | — |
| NFR-106 | Slow requests flagged >1000ms | `RequestTimingMiddleware` logs + Redis counters | — |

## 2. Reliability & Resilience

| ID | Requirement | Current fact |
|---|---|---|
| NFR-201 | Queue survives restarts | Redis queue + Horizon (tries 3, supervisor auto-scale 1–10) |
| NFR-202 | Idempotent payments | `idempotency_key` unique on payments; `ProcessPaymentJob` skips completed |
| NFR-203 | Job retry/backoff | Horizon `jobs` tables, failed_jobs; retry policies |
| NFR-204 | Scheduled ops unattended | 15 scheduled jobs (escrow 02:00, payouts 03:00, retention 03:30…) |
| NFR-205 | Socket reconnection | ping 25s / timeout 20s; client `ReconnectionBanner`, 30s poll fallback in `useActiveRide` |
| NFR-206 | DB backups | `deployment/scripts/backup.sh` daily/weekly rotation + optional S3 |
| NFR-207 | Blue-green deploy w/ rollback | `docker-compose.prod.{blue,green}.yml` + weight flip via `nginx/blue-green.conf` |
| NFR-208 | Health endpoints | `/health` API + socket `:3001/health` + `health-check.sh` |

## 3. Security

| ID | Requirement | Current fact | Doc |
|---|---|---|---|
| NFR-301 | No card data processed server-side (SAQ-A) | Stripe intents, PayFast/Ozow redirects; no PAN/CVV fields anywhere | `05-SECURITY/PCI-DSS.md` |
| NFR-302 | Webhook authenticity | IP whitelists per gateway + signature checks (PayFast ITN, Ozow, Stripe, partner) | `05-SECURITY/THREAT-MODEL.md` |
| NFR-303 | PII encrypted or hashed at rest | `EncryptsPii` trait; email/phone hashed (`email_hash`); licence/id/DOB encrypted (text columns) | `02-DATA-MODEL/ENCRYPTION.md` |
| NFR-304 | RBAC on every admin/driver route | `role:` middleware; channel authorization | `05-SECURITY/RBAC-MATRIX.md` |
| NFR-305 | Rate limiting on abuse-prone endpoints | 18 named limiters (auth 3–5/min, ride-create 5, location 30…) | `05-SECURITY/THREAT-MODEL.md` |
| NFR-306 | Input sanitization globally | `InputSanitizationMiddleware` (trim/strip XSS) on API group | — |
| NFR-307 | Security headers | CSP, HSTS, DENY, nosniff via `SecurityHeadersMiddleware` + nginx | — |
| NFR-308 | 2FA for admin | TOTP (`HasTotp` trait, `admin.totp` middleware) | — |
| NFR-309 | Audit trail | `admin_audit_logs` on admin ops; `ride_status_histories` on transitions | — |

## 4. Compliance (POPIA)

| ID | Requirement | Current fact | Doc |
|---|---|---|---|
| NFR-401 | Data subject access (export) | `GET /data/export` | `05-SECURITY/POPIA-GDPR.md` |
| NFR-402 | Erasure / anonymization | `POST /data/erasure|anonymize` + scheduled retention cleanup | same |
| NFR-403 | Consent management | consent types/versions + history | same |
| NFR-404 | Breach notification | `BreachNotificationService` + alert path | `05-SECURITY/INCIDENT-RESPONSE.md` |
| NFR-405 | Data minimization/retention periods | `DataRetentionService` config | POPIA doc |

## 5. Operability & Bus Factors

| ID | Requirement | Current fact |
|---|---|---|
| NFR-501 | Admin panel deployed as SPA behind nginx | `deployment/nginx/admin.conf` (admin.easyryde.co.za) |
| NFR-502 | Code quality gates in CI | PHPStan 2G, Pint, PHPUnit, tsc, secret scanner, docker build |
| NFR-503 | Secrets never in repo | `.githooks/pre-commit` blocks real secrets; `secret-scanner.yml` |
| NFR-504 | Logs and metrics visible | Prometheus + Grafana (overview + Laravel perf dashboards), Sentry |
| NFR-505 | Documentation is the memory | this `Absolute/` set + `docs/flow/` — kept verified (INDEX) |
| NFR-506 | Local-first: works at 90% reliability of cloud | client offline queue (`offlineQueue.ts`), GET cache 5min TTL, retry ×2 |

## 6. Mobile UX Constraints

| ID | Requirement | Current fact |
|---|---|---|
| NFR-601 | Dark, battery-light driver theme | `designTokens.ts` dark family; `expo-task-manager` background location |
| NFR-602 | Data-light by default | 30/min location throttle; polyline decode; compact maps |
| NFR-603 | Works offline-ish | offline mutation queue + cache + banners |
| NFR-604 | Accessibility: text scaling, contrast | token spacing ≥44pt targets in `TOKENS.md`; a11y checks pending |
| NFR-605 | Support en locale (ZA) | i18n `en.ts` only; `expo-localization` for formatting |

## References

- SLOs with numbers: `../09-OPS/SLO-SLI.md`
- Load plan: `../../docs/flow/05-production-readiness/load-testing-plan.md`
- Security detail: `../05-SECURITY/THREAT-MODEL.md`, `AUDIT-2026-07-30.md`