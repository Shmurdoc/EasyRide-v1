# EasyRyde — Operations Runbooks

> **Segment**: 09-OPS · **Status**: 2026-08-14  
> **Linked**: `../05-SECURITY/INCIDENT-RESPONSE.md` (SEV playbooks), `SLO-SLI.md`, `BACKUP-DR.md`, `../07-INFRASTRUCTURE/DEPLOYMENT.md`

---

## R-HEALTH — Daily Health Check

```bash
deployment/scripts/health-check.sh          # 7 containers, /api/v1/health, socket /health, pg+PostGIS, redis ping
```
1. Container states all `running` (queue+scheduler included).
2. `/api/v1/health` returns ok; check `system_health` cache (MonitorSystemHealthJob every 30 min).
3. Queue depth sane (`/inspector/queue-health`); no stuck `failed_jobs`.
4. Backup ran (02:30 file exists, size growing).

## R-JOB — Job/Queue Failure

1. `docker compose logs queue --tail 200` / Horizon UI (`/horizon`).
2. Retry failed: `php artisan queue:retry all` (idempotent jobs safe).
3. If rides queue stalls: dispatch pressure — restart `queue` service; check Redis memory.
4. Alert if repeats (M-006).

## R-PAYOUT — Payout Not Landing

1. `GET /admin/wallets/payout-queue` — pending? → approve or process.
2. `php artisan payouts:process --type=weekly --type=daily` dry-run first (job supports flags).
3. Check `ProcessPayoutJob` failed; wallet `pending_balance` intact → re-process (guards prevent double).
4. Communicate ETA to driver via `admin/notifications`.

## R-WEBHOOK — Gateway Callback Lost

1. Gateway dashboard (PayFast ITN log / Ozow / Stripe events) vs `webhook_events` table.
2. Replay via `PaymentController::verifyPayment` admin path or re-push from gateway.
3. Confirm `payment.status` terminal; escrow sweep will release on next 02:00 batch.

## R-SOCKET — Dispatch Latency/Outage

1. `curl :3001/health` + `/metrics` (connections, onlineDrivers).
2. Redis keys: `drivers:geo` ZCARD; ride rooms empty → clients rejoin on reconnect.
3. Restart socket-server (stateless; Redis holds state) — safe. Client 30s poll fallback keeps UX.
4. If Redis down: restart redis; Horizon/queue reconnect automatically.

## R-DEPLOY — Rollback (see DEPLOYMENT.md §7)

`deploy.sh --rollback` → health check → restore DB only if migration damage (BACKUP-DR.md §2).

## R-SEC — Secret Rotated/Leaked

1. `.githooks/pre-commit` + `secret-scanner.yml` blocked? → rotate leaked var, purge git history (BFG), update `.env` on host.
2. Webhook secrets (STRIPE, PAYFAST PASSPHRASE, OZOW private key): rotate in gateway console + env + restart.
3. Confirm no PII exposure → else INCIDENT-RESPONSE R4.

## R-DR — Quarterly Disaster Drill

1. Restore latest backup into fresh DB container (rename volume to avoid clobbering prod).
2. Run `php artisan migrate:status` (must be zero pending beyond backup point) + route matrix (API-TESTS.md).
3. Verify wallet reconcile drift = 0; document result in `09-OPS` (append date).

## R-ADMIN-SOP — Weekly Ops Checklist

- [ ] Cash reconciliation: all `pending` cash rides reconciled
- [ ] KYC queue drained (no >48h pending)
- [ ] Payout queue clean; escrow `release_failed` = 0
- [ ] Surge/peak config matches promo calendar
- [ ] Backup verified (restore spot-check monthly)
- [ ] Failed jobs reviewed (Sentry)

## References

- Incident severity: `../05-SECURITY/INCIDENT-RESPONSE.md` · SLIs: `SLO-SLI.md` · Restore: `BACKUP-DR.md`