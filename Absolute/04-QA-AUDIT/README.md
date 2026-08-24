# EasyRyde — QA Audit Segment

> **Segment**: 04-QA-AUDIT · **Status**: 2026-08-14 · Evidence + gaps only — no opinions without a file path.  
> **Linked**: `../08-TESTING/*`, `../../docs/flow/05-production-readiness/bug-inventory.md`

---

## 1. What This Segment Answers

| Question | Doc |
|---|---|
| Which HTML-demo features are missing in the RN apps? | `MOBILE-GAP-ANALYSIS.md` |
| Which backend APIs have no client consumer? Which clients call endpoints that don't exist? | `BACKEND-GAP-ANALYSIS.md` |
| What is actually tested (unit/feature/security/mobile/e2e)? | `TEST-COVERAGE.md` |
| Which bugs are open right now, by severity? | `CRITICAL-BUGS.md` |

## 2. Recent QA Cycle Outcomes (verified state)

- Class-0 mobile bugs C-001 (broken Alert import), C-002 (RatingScreen unregistered) **fixed in code** (BookRideScreen.tsx:5 Alert import; App.tsx:132 Rating route).
- PCI client-side card-fields finding (C-003) **fixed**: no cardNumber/CVV/expiry fields remain; Stripe intents + redirects only.
- Route-matrix QA (TASK-QA-002) verified **all ~60 live routes** against api.php — clean.
- Security audit 2026-07-30: 28 findings, 4 critical — criticals fixed inline (webhook partner IP, per_page caps, sanitize sweep, rate limits).
- OpenAPI parity gap: 4 routes missing from `docs/api/openapi.yaml` (`/admin/stats`, `/restaurants`, `/food-orders`, `/pool-rides`).

## 3. Verification Commands (run before trusting a claim)

```bash
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml          # full suite
docker compose exec backend php artisan route:list --path=v1                            # API surface
docker compose exec backend php artisan migrate:status                                  # schema state
cd mobile && npm run typecheck && npm run lint                                          # TS + lint (apps)
```

## References

- Test strategy: `../08-TESTING/TEST-STRATEGY.md` · Bug inventory (flow docs): `../../docs/flow/05-production-readiness/bug-inventory.md`