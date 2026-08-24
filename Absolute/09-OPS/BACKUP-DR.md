# EasyRyde — Backup & Disaster Recovery

> **Segment**: 09-OPS · **Status**: VERIFIED 2026-08-14  
> **Linked**: `../05-SECURITY/INCIDENT-RESPONSE.md` (R3 database), `../07-INFRASTRUCTURE/DEPLOYMENT.md`

---

## 1. Backup Topology

| Asset | Method | Frequency | Retention |
|---|---|---|---|
| PostgreSQL | `pg_dump` (custom format, gzip) via `deployment/scripts/backup.sh` / `scripts/backup-db.sh` (compress 9 → `/opt/phalaborwa/backups`) | daily + pre-deploy | 7 daily + 4 weekly; 30-day (script variant); optional S3 `STANDARD_IA` |
| Redis | appendonly yes (`--appendonly yes` dev; prod `appendonly yes` + `allkeys-lru` 1gb) | AOF | point-in-time since last AOF |
| Code | git | per commit | full history |
| Media (KYC docs, receipts) | storage volume `easyryde_storage` | NOT in backup scripts — **gap** | — |
| Admin env/secrets | `.env` files, keystores | NOT versioned (by design) | keep office copy |

## 2. Restore Procedure (DR)

```
1. docker compose -f docker-compose.prod.yml up -d database
2. gunzip -c <backup>.gz | docker compose exec -T database psql -U easyryde -d easyryde
   (or pg_restore for custom format: pg_restore -d easyryde <file>)
3. Re-run migrations? No — backup contains schema; only apply missing ones via migrate --force.
4. Verify: counts (rides/payments/wallets), PostGIS extension present, latest row timestamps.
5. Reconcile: ReconcileWalletBalancesJob + escrow sweep (02:00) will self-heal drift.
```

## 3. DR Objectives

| Objective | Target | Current |
|---|---|---|
| RPO | ≤ 24 h (daily backup) | daily + pre-deploy; Redis AOF narrows money-state loss to last payout job |
| RTO | ≤ 4 h (DB restore + deploy) | single-server design — restore = boot 7 services |
| Money-state consistency | zero double-payout | payout ids idempotent; `canProcessPayout` guard; wallet snapshot reconcile |

## 4. Weak Spots

| Gap | Impact | Fix |
|---|---|---|
| Media/storage not backed up | KYC evidence + receipts lost | add storage volume to backup.sh |
| Prod is single host (no HA across hosts) | RTO blows out on hardware failure | blue/green on 2 hosts + pg replication (next phase) |
| Backup restore untested end-to-end | false confidence | quarterly DR drill (scripted in RUNBOOKS R-DR) |
| Windows PowerShell backups exist (backup.ps1/restore.ps1) — unmaintained | confusion | deprecate or sync with Linux scripts |

## 5. Schedule (cron)

- backup.sh: daily 02:30 SAST (+ weekly retention rotate); pre-deploy hook in deploy.sh.
- Redis AOF rewrite: default aof-rewrite thresholds.

## References

- Deploy: `DEPLOYMENT.md` §5 (migrate-before-switch) · Restore drill: `RUNBOOKS.md` · Incident: `../05-SECURITY/INCIDENT-RESPONSE.md`