# EasyRyde — Monitoring & Observability

> **Segment**: 07-INFRASTRUCTURE · **Status**: VERIFIED 2026-08-14  
> **Linked**: `../09-OPS/SLO-SLI.md`, `../09-OPS/RUNBOOKS.md`, `../05-SECURITY/INCIDENT-RESPONSE.md`

---

## 1. Stack

| Tool | Runs | Provides |
|---|---|---|
| Prometheus | `docker-compose.monitoring.yml` (external `easyryde_backend` network) | scrape 15s: php-fpm :9000, postgres-exporter :9187, redis-exporter :9121, socket :6001, nginx :80 |
| Grafana | same compose, :3000 | provisioned datasource + 2 dashboards |
| Sentry | `config/sentry.php` | errors, traces 0.25, profiles 0.1, PII off |
| Laravel logs | stderr + daily channels | request/app logs |
| Inspector (in-app) | `GET /inspector/*` | endpoint latency counters, ride-flow, queue-health (Redis counters from `RequestTimingMiddleware`) |
| Socket /metrics | `GET /metrics` (+/health) | connections, memory, online drivers |
| Telegram | deploy.yml | deploy notifications |

## 2. Dashboards

| Dashboard | Panels |
|---|---|
| easyryde-overview | Active Rides (ride_requests_total rate) · API p95 (http_request_duration_seconds_bucket) · Error Rate (5xx ratio) · Queue Size (laravel_queue_size) |
| laravel-performance | DB connections, memory usage, PHP-FPM workers |

## 3. Metrics Slots (wanted)

| Metric | Source | Purpose |
|---|---|---|
| ride lifecycle counts by status | table/graphite? (Inspector) | funnel health |
| driver online count & rate | Redis geo / socket /metrics | supply health |
| payment success/failure by gateway | payments table | money health |
| escrow release_failed | DB query | money health |
| job queue depth by queue (rides/payments/notifications) | Horizon + redis | dispatch health |

## 4. Alerting (currently MISSING — M-006)

Alerts to wire (thresholds from `INCIDENT-RESPONSE.md` §3): queue depth >1000, release_failed >0, stuck pending payments, 5xx >1%, socket connections drop, failed jobs (Sentry).

## 5. Logging Rules

- PII never logged; Sentry `send_default_pii=false`; input sanitized before logs.
- Audit-logged admin actions → `admin_audit_logs` (queryable in panel).
- Slow requests (>1000ms) flagged by `RequestTimingMiddleware` with `X-Response-Time`/`X-Request-Id`.

## References

- SLOs: `../09-OPS/SLO-SLI.md` · Runbooks: `../09-OPS/RUNBOOKS.md` · Compose: `DOCKER-ARCH.md` (§7, log rotation gap B-204)