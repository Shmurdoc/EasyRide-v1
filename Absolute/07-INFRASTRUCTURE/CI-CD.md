# EasyRyde — CI/CD Pipeline

> **Segment**: 07-INFRASTRUCTURE · **Status**: VERIFIED 2026-08-14 (`.github/workflows/*`)  
> **Linked**: `DEPLOYMENT.md`, `../08-TESTING/TEST-STRATEGY.md`, `../09-OPS/RUNBOOKS.md`

---

## 1. Workflow Inventory

| Workflow | Triggers | Jobs | Gates |
|---|---|---|---|
| `ci.yml` | push main/develop + PR main | backend-tests (PHP 8.4 + pcov, composer cache, phpunit --coverage-text) · mobile-typecheck (rider+driver tsc) · docker-build (php + socket images) | tests green |
| `backend.yml` | paths `backend/**` | test (services: postgres:16 + redis:7; PHP 8.3; SQLite phpunit w/ array drivers) | — |
| `deploy.yml` | push main/develop + PR | test-backend (postgis+redis services, PHP 8.4, PHPStan 2G, Pint --test, PHPUnit+clover→Codecov, mobile tsc ×3 apps, socket npm test) → build (main only, buildx → Docker Hub) → build-mobile (EAS rider/driver/admin) → deploy (ssh /opt/easyryde) | all quality gates |
| `mobile.yml` | paths `mobile/**` | typecheck (tsc --noEmit, expo lint continue-on-error) | — |
| `secret-scanner.yml` | push/PR main+develop | detect-secrets: real APP_KEY/JWT_SECRET/sk_live_/Google Maps key/AWS/TWILIO patterns; PR-diff scan | blocks leaks |

## 2. Quality Gates (what must pass before merge)

```
PHPStan level 2G → Pint (style) → PHPUnit (clover) → socket npm test
→ mobile tsc (rider+driver+admin) → secret scan → docker build
Deploy job additionally: migrations + config:cache + route:cache + view:cache on target.
```

## 3. Builds

| Artifact | Where | Tagging |
|---|---|---|
| easyryde-api (php image) | Docker Hub via buildx | latest + sha |
| easyryde-socket | Docker Hub | latest + sha |
| rider/driver/admin APK | EAS (`--profile production`) | EAS build ids |

## 4. Gaps / Wanted

| Gap | Value |
|---|---|
| OpenAPI parity check in CI (diff routes vs docs/api/openapi.yaml) | contract drift (B-005/H-002) |
| k6 load suite as CI job (smoke stage) | NFR evidence |
| Coverage threshold enforcement (block < X%) | code quality |
| Tag-triggered release (vX.Y.Z → deploy) | release hygiene |
| Maestro/detox on CI emulator | mobile e2e every PR (heavy — optional nightly) |

## 5. Secrets Discipline

- `.githooks/pre-commit` blocks real `APP_KEY=base64:` / `JWT_SECRET` / `sk_live_` etc. in `.env` files; warns on 12 patterns.
- `secret-scanner.yml` catches pushed leaks; `deploy.yml` uses GitHub secrets + ssh keys.
- Mobile `.env` files are gitignored; `EXPO_PUBLIC_*` injected at build time.

## References

- Deploy: `DEPLOYMENT.md` · Compose: `DOCKER-ARCH.md` · Strategy: `../08-TESTING/TEST-STRATEGY.md`