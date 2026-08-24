# EasyRyde — Test Strategy

> **Segment**: 08-TESTING · **Status**: REFRESHED 2026-08-14 — v1 "mobile has no tests / E2E ~0" is CLOSED (76 Jest files + 7 Detox + Maestro)  
> **Linked**: `MOBILE-TESTS.md`, `API-TESTS.md`, `../04-QA-AUDIT/TEST-COVERAGE.md`, `../02-DATA-MODEL/` (fixtures)

---

## 1. Pyramid (actual vs target)

```
        UI e2e (Maestro/Detox)          — exists: 7 detox + 6 maestro (target: full happy paths ×2 apps)
      Component/Integration (Jest)      — exists: 76 mobile files; Laravel Feature 49
    Service/Unit (Laravel Unit + jobs)  — exists: 38 unit files
  Security/Load/Fuzz                    — exists: 3 security suites + k6 (12 scenarios, never run in CI)
```

## 2. Principles (from AGENTS.md + practice)

- **Server-side truth**: tests assert server recomputes fare/geometry (`SecurityFixTest`), ignores client distance.
- **Role setup**: `$user->assignRole('driver')` in setUp; roles via `Role::create([... 'guard_name' => 'web'])`.
- **Encrypted columns are text** — factories/fixtures must respect 200+ char encrypted values.
- **Service bindings**: 5 scalar-ctor services bound in AppServiceProvider — tests use env-driven config (no real keys).
- DB: **PostgreSQL `easyryde_test`** via `SafeDatabaseMigrations`; queue sync in tests; `APP_WEBHOOK_BYPASS=true` for webhook tests.

## 3. Backend Test Matrix

| Layer | Files | Command |
|---|---|---|
| Feature | 49 | `docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml --filter <Test>` |
| Unit | 38 | same, `tests/Unit` |
| Security | 3 | same, `tests/Security` |
| Route matrix QA | TASK-QA-002 | covered in `API-TESTS.md` |

## 4. Mobile Test Stack

- Jest (jest-expo) per app + shared/theme/ui-kit; mocks in `__tests__/mocks.ts`; `test-utils.tsx` providers.
- Detox (`.detoxrc.js`): rider/driver/admin android builds; `jest.config.e2e.js`.
- Maestro flows: login + ride-booking (Phalaborwa Mall→Economy→Request Ride).
- Playwright (web/ admin): login/rides/drivers/payouts/pricing/audit-log/food/restaurants/sos.

## 5. Supporting Layers

| Layer | Tool |
|---|---|
| Static | PHPStan 2G, Pint, tsc --noEmit, expo lint |
| Load (real) | k6 `load-tests/` (12 scenarios incl. security forgery) |
| Visual | screenshots + visual QA reports (root `*QA*.md`); golden screenshots TBD |
| Contract | openapi.yaml (parity gap H-002) |

## 6. Known Weak Spots (be honest)

1. Socket-server tests thin (H-003).
2. Payment gateway live-path not integration-tested in CI (only mocks + webhook replay).
3. Load evidence missing (B-001).
4. No fuzz corpus beyond 10 payloads (TEST-COVERAGE gaps).

## References

- Coverage map: `../04-QA-AUDIT/TEST-COVERAGE.md` · Evidence: `TASK-QA-002-REPORT.md` · Bugs: `../04-QA-AUDIT/CRITICAL-BUGS.md`