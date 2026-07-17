# Implementation Plan: Phase 2 — Backend Hardening

## Overview
Phase 2 focuses on critical security, reliability, and maintainability improvements for the EasyRyde Laravel backend. The plan addresses six tasks identified in the Phase 1 audit, ordered by priority (P0 → P1 → P2). The first task is blocking all test execution and must complete before others can be verified.

## Architecture Decisions
1. **DB Path Fix**: Use relative path `database/database.sqlite` in both `.env` and `.env.testing` to ensure portability across environments.
2. **Rate Limiting**: Leverage existing `ApiRateLimiterMiddleware` (global) and add per-route throttles for sensitive endpoints. Define missing rate limiters in `bootstrap/app.php`.
3. **Input Validation**: Audit all 35 controllers for missing FormRequest classes; create missing ones following existing patterns.
4. **Database Indexes**: Review existing migration `2026_07_08_000001_create_missing_tables_and_indexes.php` and add any missing indexes via a new migration.
5. **Error Responses**: Extend existing `ApiResponse` class with consistent JSON:API error format; refactor controllers to use it.

## Task List

### Phase 0: Unblock Tests (P0)
- [ ] **Task 1: Fix Test DB Path**
  - **Description**: Correct the absolute `F:\EasyRyde` path in `.env` and `.env.testing` to a relative path. Ensure `database/database.sqlite` exists and is writable. Run full test suite to verify.
  - **Acceptance Criteria**:
    - `.env` and `.env.testing` use `DB_DATABASE=database/database.sqlite`
    - `database/database.sqlite` file exists and is non-zero (after migration)
    - `php -n vendor/bin/phpunit --configuration phpunit.xml` runs with 0 errors
  - **Verification**:
    - Run test command and capture output
    - Inspect `.env` and `.env.testing` for correct path
    - Confirm SQLite file is created/populated
  - **Dependencies**: None
  - **Files Likely Touched**:
    - `backend/.env`
    - `backend/.env.testing`
    - `backend/database/database.sqlite`
  - **Estimated Scope**: S (1-2 files)

### Phase 1: Security Hardening (P0-P1)
- [ ] **Task 2: Add Rate Limiting**
  - **Description**: Audit existing rate limiters and add missing ones for all public and sensitive routes. Ensure `throttle:api` is applied globally and specific throttles for auth, payments, wallet, etc.
  - **Acceptance Criteria**:
    - All routes in `api.php` have appropriate throttle middleware
    - Rate limiters defined in `bootstrap/app.php` for all throttle aliases
    - Sensitive routes (login, register, password reset, payment) have stricter limits (5/min)
    - Global API rate limit (60/min authenticated, 30/min unauthenticated) applied
  - **Verification**:
    - Check `bootstrap/app.php` for rate limiter definitions
    - Verify middleware in `api.php` routes
    - Test rate limiting by sending rapid requests (manual or via test)
  - **Dependencies**: Task 1 (tests must pass to verify)
  - **Files Likely Touched**:
    - `backend/bootstrap/app.php`
    - `backend/routes/api.php`
    - Possibly new rate limiter definitions
  - **Estimated Scope**: M (3-5 files)

- [ ] **Task 3: Secure .env Files**
  - **Description**: Verify `.env` and `.env.testing` are in `.gitignore`. Create `.env.example` with placeholder values. Scan for any committed secrets and remove them.
  - **Acceptance Criteria**:
    - `.env` and `.env.testing` listed in `.gitignore`
    - `.env.example` exists with placeholder values (no real keys)
    - No API keys, tokens, or secrets committed in repository
    - Git history cleaned of any previously committed secrets (if feasible)
  - **Verification**:
    - `git ls-files --cached "backend/.env"` returns empty
    - `git ls-files --cached "backend/.env.testing"` returns empty
    - Manual scan of `.env.example` for placeholders
    - `git log --all --full-history -- "backend/.env"` shows no commits (or only removal)
  - **Dependencies**: None (can run parallel with Task 2)
  - **Files Likely Touched**:
    - `backend/.gitignore`
    - `backend/.env.example` (new)
    - Possibly `backend/.env`
  - **Estimated Scope**: S (1-2 files)

### Phase 2: Code Quality (P1-P2)
- [ ] **Task 4: Add Input Validation**
  - **Description**: Audit all 35 controllers for missing FormRequest validation. Create FormRequest classes for endpoints lacking validation, focusing on user input (email, phone, location data).
  - **Acceptance Criteria**:
    - All controller methods accept a FormRequest class (type-hinted)
    - FormRequest classes have proper validation rules
    - Critical endpoints (auth, payments, user profile) have comprehensive validation
    - No controller methods use `$request->input()` without prior validation
  - **Verification**:
    - Grep for controller methods without FormRequest type hints
    - Review new FormRequest classes for completeness
    - Run tests to ensure validation doesn't break existing functionality
  - **Dependencies**: Task 1
  - **Files Likely Touched**:
    - `backend/app/Http/Controllers/Api/V1/*.php` (multiple controllers)
    - `backend/app/Http/Requests/Api/V1/**/*.php` (new FormRequest classes)
  - **Estimated Scope**: L (5-8 files)

- [ ] **Task 5: Add Database Indexes**
  - **Description**: Review existing migrations for missing indexes on common query columns (user_id, status, created_at). Create new migration to add indexes on rides, payments, notifications tables.
  - **Acceptance Criteria**:
    - New migration adds indexes on foreign keys and frequently queried columns
    - Indexes cover: `rides.user_id`, `rides.status`, `payments.user_id`, `payments.status`, `notifications.user_id`, `notifications.created_at`
    - Migration runs without errors
    - Query performance improves (explain plan shows index usage)
  - **Verification**:
    - Inspect migration file for index definitions
    - Run migration: `php -n artisan migrate`
    - Verify indexes exist: `php -n artisan db:show` or SQLite `.indexes` command
  - **Dependencies**: Task 1
  - **Files Likely Touched**:
    - `backend/database/migrations/XXXX_XX_XX_add_remaining_indexes.php` (new)
  - **Estimated Scope**: S (1-2 files)

- [ ] **Task 6: Consistent API Error Responses**
  - **Description**: Standardize error response format across all controllers using JSON:API format. Extend `ApiResponse` class with error helpers. Refactor controllers to use consistent error responses.
  - **Acceptance Criteria**:
    - All error responses follow JSON:API format: `{ "errors": [{ "status": "422", "title": "Validation Failed", "detail": "..." }] }`
    - `ApiResponse::error()` method supports JSON:API format
    - Validation errors, 404s, 500s, authorization errors all use consistent format
    - Existing tests still pass (error format changes may break tests)
  - **Verification**:
    - Review `ApiResponse` class for JSON:API support
    - Test error scenarios manually or via tests
    - Grep for inconsistent error responses (e.g., `response()->json(['message' => ...])`)
  - **Dependencies**: Task 1
  - **Files Likely Touched**:
    - `backend/app/Http/Responses/ApiResponse.php`
    - `backend/app/Http/Controllers/Api/V1/*.php` (multiple controllers)
  - **Estimated Scope**: M (3-5 files)

## Checkpoints

### Checkpoint: After Phase 0 (Task 1)
- [ ] All tests pass (392 tests, 0 errors)
- [ ] Database migrations run successfully
- [ ] Test database is portable (works on different machines)

### Checkpoint: After Phase 1 (Tasks 2-3)
- [ ] Rate limiting active on all routes
- [ ] No secrets in version control
- [ ] Tests still pass

### Checkpoint: After Phase 2 (Tasks 4-6)
- [ ] All controllers have input validation
- [ ] Database indexes added
- [ ] Error responses consistent across API
- [ ] Full test suite passes
- [ ] Performance baseline established

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| DB path fix breaks other environments | Medium | Use relative paths; test on multiple machines |
| Rate limiting too aggressive | Medium | Start with generous limits; monitor and adjust |
| Input validation breaks existing clients | High | Add validation incrementally; maintain backward compatibility |
| Error format change breaks frontend | High | Version API responses; provide migration guide |
| Missing indexes cause migration failures | Low | Test migration on clean database first |

## Open Questions
1. Should we implement API versioning (v1 → v2) for breaking changes?
2. Do we need to support older API clients during transition?
3. Should rate limits be configurable via admin settings?
4. Are there any third-party integrations that depend on current error format?

## Execution Notes
- **Task 1** must complete first to unblock test verification
- **Tasks 2 and 3** can run in parallel after Task 1
- **Tasks 4, 5, and 6** can run in parallel after Task 1
- Each task should be assigned to **builder-3** as per user instructions
- All changes must be committed with descriptive messages
- Test suite must pass after each task

## Estimated Total Scope
- **Phase 0**: XS (1-2 files)
- **Phase 1**: S-M (2-4 files each)
- **Phase 2**: M-L (3-8 files each)
- **Total**: ~15-25 files modified/created

## Success Criteria
- 392 tests, 0 errors
- All P0 and P1 issues resolved
- P2 issues addressed with new migrations and refactoring
- Code quality improved with consistent patterns
- Security posture hardened against common attacks