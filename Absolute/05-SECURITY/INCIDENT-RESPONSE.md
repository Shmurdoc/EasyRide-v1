# EasyRyde — Incident Response Playbook

> **Segment**: 05-SECURITY · **Status**: 2026-08-14 · Operational playbook (3 AM call)  
> **Linked**: `../09-OPS/RUNBOOKS.md` (system runbooks), `../03-WORKFLOWS/FAILURE-MODES.md` (failure register), `AUDIT-2026-07-30.md`

---

## 1. Severity Ladder

| Sev | Definition | Responder | SLA |
|---|---|---|---|
| SEV-1 | Money loss / PII exposure / riders or drivers unsafe / total outage | super-admin + founder | 15 min, page |
| SEV-2 | Major feature broken (pay, dispatch, food) or partial outage | admin on-call | 60 min |
| SEV-3 | Minor degradation, cosmetic, no money impact | next working day | 24 h |

## 2. Playbooks

### R1 — Payment / Escrow / Payout Incident (SEV-1/2)
1. Verify via `GET /health` + `inspector/queue-health` + Grafana (queue depth, error rate).
2. Check `payments` stuck `pending`: search `failed_jobs`, Horizon dashboard.
3. If webhooks lost: verify gateway dashboard → use `verifyPaymentWithServer` path or `admin/manage/payments/{id}` manual verify.
4. If escrow release failed: rerun `php artisan escrow:release` / `ReleaseEscrowBatchJob`; check `release_failed` rows.
5. If payout batch failed: rerun `payouts:process --type=weekly`; confirm no double-payout via `canProcessPayout`.
6. Log everything in `admin_audit_logs`; communicate driver/rider via `admin/notifications`.

### R2 — Dispatch / Socket Outage (SEV-1/2)
1. `docker compose ps` socket-server; `curl :3001/health`.
2. Redis GEO set missing? → `SyncDriverLocationsJob` rebuilds within 5 min.
3. Rider poll fallback (30s) keeps UX alive; riders see "finding driver" longer.
4. Restart socket-server (state in Redis, not memory — safe).
5. If Redis down: cache/queue/broadcast break → backend degrades → follow compose recovery (docker restart redis, Horizon reconnects).

### R3 — Database Incident (SEV-1)
1. `pg_isready`; check disk (pg_dump backup runs daily).
2. Read-only degradation accepted; writes fail → apps show offline queue.
3. Restore: `deployment/scripts/backup.sh` (pg_dump custom → `pg_restore` — see `BACKUP-DR.md`).
4. Verify counts (`rides`, `payments`) post-restore; run reconciliation job.

### R4 — Security / Data Breach (SEV-1)
1. Freeze: revoke all admin tokens (`RevokeExpiredTokensJob` or manual), disable admin users, rotate `APP_KEY` (with `APP_PREVIOUS_KEYS`) if encrypted PII possibly exposed.
2. Assess: what PII? which rows? (email_hash lookup; encryption means ciphertext at rest).
3. Notify: `BreachNotificationService` → affected users + Information Regulator (POPIA S.22, without undue delay).
4. Remediate + document in `AUDIT` file; update THREAT-MODEL.

### R5 — Admin Locked Out of TOTP (SEV-3)
1. Super-admin via `docker compose exec backend php artisan tinker` → disable `totp_enabled` for the user.
2. Rotate totp_secret; re-enable flow.

### R6 — General Flow
`Detect (Grafana/Sentry/alerts) → Triage (severity) → Page owner → Status page/comm → Fix → Verify (route matrix + k6) → Post-mortem (append to this file: date, sev, root cause, action, prevention)`.

## 3. Alerting Slots (what to wire)

| Signal | Source | Threshold |
|---|---|---|
| Queue depth | Horizon + redis_exporter | >1000 / >10min |
| Escrow `release_failed` count | DB query | >0 |
| Payment stuck `pending` old | DB query | >50 &age>30min |
| 5xx ratio | nginx_exporter | >1% / 5min |
| Socket connections drop | socket /metrics | <50% baseline |
| Failed jobs | Sentry | any |

## 4. Communication Template

```
[SEV-x] <area> — <1-line impact>
Status: investigating | mitigated | resolved
Users impacted: <who>
ETA: <when>
```
Channels: Telegram (deploy.yml already notifies), admin panel notifications, driver app broadcast (admin:notifications).

## References

- Runbooks (system ops): `../09-OPS/RUNBOOKS.md` · Restore: `../09-OPS/BACKUP-DR.md` · Failure register: `../03-WORKFLOWS/FAILURE-MODES.md` · Legal: `POPIA-GDPR.md`