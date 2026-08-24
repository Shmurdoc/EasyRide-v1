# EasyRyde — SLOs & SLIs

> **Segment**: 09-OPS · **Status**: 2026-08-14 · Targets aligned to NFR-101..105 + k6 thresholds  
> **Linked**: `../01-REQUIREMENTS/NONFUNCTIONAL-REQS.md`, `../07-INFRASTRUCTURE/MONITORING.md`, `../../docs/flow/05-production-readiness/sla-commitments.md`

---

## 1. Service Level Objectives (targets)

| SLI | SLO target | Measurement |
|---|---|---|
| API availability | 99.9% monthly | `/api/v1/health` probe (30s) + nginx 5xx ratio |
| API latency (p95) | < 500 ms (rides), < 1000 ms (admin) | RequestTiming counters + Prometheus histogram |
| Location updates p95 | < 200 ms @ 500 VU | k6 `driver-location-updates.js` |
| Socket connect p95 | < 200 ms @ 1000 VU | k6 `websocket-connections.js` |
| Ride creation errors | < 1% | k6 `ride-booking.js` |
| Payment confirmation (webhook→status) | < 2 min after gateway callback | payment.status timestamps |
| Dispatch: ride→driver-offer | < 10 s p95 | socket event timestamps / ride.driver_notified_at |
| Queue drain | rides/payments queues < 5 min peak | Horizon + redis queue depth |
| Escrow release | 100% within dispute window + 24 h | release_failed count = 0 |
| Background jobs success | > 99.5% (no silent failures) | failed_jobs / job_batches |

## 2. Measurement Gaps (honest)

- Prometheus currently scrapes php-fpm/nginx/socket/redis/postgres — **app-level histograms for rides/payments not yet exported** → latency SLIs rely on k6 for now (B-001 run).
- No alerting wired (MONITORING §4) → SLOs are paper targets until alerts exist (M-006).
- Socket latency requires `client:ping/pong` instrumentation (`client:latency` handler exists).

## 3. Error Budget Policy (proposed)

- 99.9% availability → 43 min/month downtime budget. Payment-system incidents consume the budget at 2× weight (money criticality).
- Weekly review: burn >10% of budget → pause feature deploys, P0 hardening only.
- Escrow/payout correctness: **zero-tolerance** — not part of error budget (violations are SEV-1).

## References

- NFRs: `../01-REQUIREMENTS/NONFUNCTIONAL-REQS.md` · Monitoring: `../07-INFRASTRUCTURE/MONITORING.md` · Runbooks: `RUNBOOKS.md` · Incident: `../05-SECURITY/INCIDENT-RESPONSE.md`