# EasyRyde — API Tests Guide

> **Segment**: 08-TESTING · **Status**: VERIFIED 2026-08-14  
> **Linked**: `TEST-STRATEGY.md`, `../04-QA-AUDIT/TEST-COVERAGE.md`, route truth `backend/routes/api.php`

---

## 1. Run Commands

```bash
# Full suite (Docker, PostgreSQL easyryde_test)
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml
# Single test
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml --filter RideApiTest
# Route surface
docker compose exec backend php artisan route:list --path=v1
# Seed food data
docker compose exec backend php artisan db:seed --class=FoodDeliverySeeder
```

## 2. Suite Map (90 files)

| Suite | Covers |
|---|---|
| Feature (49) | ride lifecycle ×4, payments ×3 (refund/dispute/webhooks/velocity), auth ×2, food ×2, pool ×2, promo ×2 (abuse), scheduled ×2, consent ×2, incidents ×2, reporting, admin ×2, users ×2, wallet, sos, kyc, referral, rating, chat, delivery, driver, places, surge, peak, config, health ×2, data retention/rights, webhooks |
| Unit (38) | services (18 domains), jobs (5), middleware (3), gateways (PayFast/Ozow/Stripe + router), HasTotp |
| Security (3) | SQLi/XSS/access control; server-side fare integrity; wallet-confirm security + rate limits |
| Load (k6) | `load-tests/`: ride-booking, driver-location (500VU), websocket (1000VU), payment webhook, admin dashboard, mixed workload + 6 security scenarios |

## 3. Key Conventions (from codebase practice)

| Convention | Why |
|---|---|
| PostgreSQL `easyryde_test` (port 5433) — not SQLite | PostGIS/pgsql funcs (acos/sin registered for sqlite too) |
| `SafeDatabaseMigrations` helper | clean per-suite schema |
| `APP_WEBHOOK_BYPASS=true` in tests | webhook IP checks bypassed in test env only |
| `queue` driver `sync` | deterministic job assertions |
| Roles in setUp: `Role::create(['name'=>'rider','guard_name'=>'web'])`, `$user->assignRole('driver')` | middleware `hasRole` semantics |
| Encrypted columns = `text` | fixtures must hold 200+ char ciphertext |

## 4. What the Route Matrix Proves (TASK-QA-002)

Every endpoint in `api.php` exercised: auth, rides+driver actions, payments+wallet, food, admin/manage (users/drivers/rides/payments/kyc), compliance (incidents/data-retention), inspector, data rights, webhooks (IP+signature), TOTP — **all green at 2026-07-30**.

## 5. Before You Trust a Test Result

1. `docker compose exec backend php artisan migrate:status` — schema matches migrations.
2. Check `phpunit.xml` env (DB=easyryde_test, queue=sync, APP_WEBHOOK_BYPASS).
3. Stale counts: AGENTS.md (433) vs TASK-QA-002 (556) — run suite for the live number; both reflect growth phases.
4. Add a test with any new endpoint — the matrix is the contract.

## References

- Coverage: `../04-QA-AUDIT/TEST-COVERAGE.md` · Report: `TASK-QA-002-REPORT.md` · Strategy: `TEST-STRATEGY.md` · OpenAPI: `../../docs/api/openapi.yaml`