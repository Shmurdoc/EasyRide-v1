# EasyRyde — CEO CYCLE ORCHESTRATION PLAN

**Date:** 2026-07-19
**Status:** ACTIVE
**Orchestrator:** CEO/Production Lead
**Directive:** NO GAPS. NO SHORTCUTS. PRODUCTION OR NOTHING.

---

## SITUATION REPORT

### What's Done
- ✅ Security audit completed (7 critical, 12 high, 8 medium, 5 low)
- ✅ C-01 (secrets), C-02 (wallet self-confirm), C-04 (fare manipulation), C-06 (socket auth) — FIXED & REVIEWED
- ✅ Socket server authorization, rate limiting, input validation — PASS
- ✅ Wallet concurrency, ride concurrency — PASS
- ✅ Audit logging infrastructure — PASS
- ✅ Production push plan created (28-day roadmap)
- ✅ APK fix plan created (root cause analysis complete)
- ✅ Design implementation plan created (PHBIMH system defined)
- ✅ Mobile testing guide created (conventions, coverage targets)

### What's NOT Done (BLOCKING PRODUCTION)
| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| **C-03** | Webhook IP bypass via `APP_ENV !== 'production'` | CRITICAL | ✅ FIXED |
| **C-05** | TOTP 2FA bypass — enable/disable routes lack `admin.totp` middleware | CRITICAL | ✅ FIXED |
| **C-07** | Mass assignment — `role` in User `$fillable` | CRITICAL | ✅ FIXED |
| **H-04** | PII leakage — raw User model in API responses | HIGH | ✅ FIXED |
| **H-05** | LIKE wildcard injection in admin search | HIGH | ✅ FIXED |
| **H-07** | Rate limit bypass via User-Agent rotation | HIGH | ✅ FIXED |
| **H-11** | No amount upper bound in wallet service | HIGH | ⬜ TODO |
| **H-12** | Socket auth token cached 60s after logout | HIGH | ✅ FIXED |
| **M-01-M-08** | Medium findings | MEDIUM | ⬜ TODO |

### Environment State
- PHP/Composer: **NOT INSTALLED** (requires sudo)
- Docker: **NOT INSTALLED** (requires sudo)
- Node.js 20.20.2: ✅ Available via NVM
- npm 10.8.2: ✅ Available
- Mobile test runner: ⚠️ node_modules exist, test deps pending
- Backend tests: ~65% coverage (need 80%)
- Socket server tests: ✅ 9/9 passing
- APK builds: FAILING (root cause identified)

### BLOCKER: Cycle 2 Requires Sudo Password
System package installation (PHP, Composer, Docker) requires `sudo` which needs a password.
**Action required from user:** Provide sudo password or manually install:
```bash
sudo apt-get install -y php8.2-cli php8.2-mbstring php8.2-xml php8.2-curl php8.2-pgsql php8.2-redis php8.2-intl php8.2-gd php8.2-zip php8.2-bcmath unzip composer docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

---

## CYCLE 1 — SECURITY COMPLETION (CRITICAL)

### C-03: Webhook IP Bypass
**File:** `backend/config/webhook_ips.php:30`
**Current:** `'bypass_in_local' => env('APP_ENV') !== 'production'`
**Problem:** Any `APP_ENV` value that isn't exactly `'production'` bypasses ALL webhook IP checks
**Fix:**
```php
'bypass_in_local' => env('APP_WEBHOOK_BYPASS', false),
```
- Change to explicit opt-in (`APP_WEBHOOK_BYPASS=true`) instead of env-name-based bypass
- Default to `false` (blocking) in all environments
- Update `.env.example` with `APP_WEBHOOK_BYPASS=false`

### C-05: TOTP 2FA Bypass
**File:** `backend/routes/api.php:261-265`
**Current:** TOTP enable/verify/disable routes use `role:admin|super-admin` middleware ONLY
**Problem:** Admin can enable TOTP without verifying current code, or disable 2FA entirely without TOTP verification
**Fix:**
- `totp/enable`: Keep as-is (admin must verify via `TotpController::verify` before marking enabled)
- `totp/disable`: Add `admin.totp` middleware so current TOTP code is required
- Update `AdminTotpMiddleware` to also apply on TOTP management routes when TOTP is already enabled

### C-07: Mass Assignment Role Escalation
**File:** `backend/app/Models/User.php:26-32`
**Current:** `$fillable` includes `'role'`, `'is_active'`, `'is_approved'`
**Problem:** If any Form Request ever adds `role` to allowed fields, privilege escalation occurs
**Fix:**
```php
protected $fillable = [
    'tenant_id', 'name', 'email', 'password', 'phone_number',
    // REMOVED: 'role', 'is_active', 'is_approved'
    'email_verified_at', 'kyc_verified_at', 'anonymized_at',
];
protected $guarded = ['role', 'is_active', 'is_approved', 'is_online', 'is_kyc_verified'];
```
- Roles must ONLY be assigned through explicit admin methods
- Audit all `User::create()` and `$user->update()` calls

### H-04: PII Leakage
**Fix:** Create `UserResource` for all API responses. Never return raw Eloquent models.

### H-05: LIKE Wildcard Injection
**Fix:** Escape LIKE wildcards: `$v = addcslashes($v, '%_')`

### H-07: Rate Limit Bypass
**Fix:** Remove User-Agent from rate limit key. Use IP only for unauthenticated.

### H-11: No Amount Upper Bound
**Fix:** Add defense-in-depth validation in `WalletService` layer.

### H-12: Socket Token Cache After Logout
**Fix:** Call `authService.invalidateToken()` on logout. Add Redis pub/sub for token invalidation.

### Deliverables
- [x] All critical fixes implemented (C-03, C-05, C-07)
- [x] All high fixes implemented (H-04, H-05, H-07, H-12)
- [ ] Security reviewer verifies all fixes
- [x] CHANGELOG.md updated
- [ ] No regressions in existing passing fixes

---

## CYCLE 2 — ENVIRONMENT SETUP

### Tasks
1. **Verify PHP 8.2+ installation** — `php -v`, install if missing
2. **Verify Composer** — `composer --version`, install if missing
3. **Verify Docker** — `docker --version` and `docker compose version`
4. **Start backend services** — `docker compose up -d` (PostgreSQL, Redis, backend)
5. **Run migrations** — `docker compose exec backend php artisan migrate --force`
6. **Seed test data** — `docker compose exec backend php artisan db:seed`
7. **Install mobile test dependencies** — `cd mobile && npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo msw`
8. **Configure Jest** — Ensure each app has `jest.config.js`
9. **Run backend test suite** — Verify current ~65% coverage
10. **Run socket server tests** — `cd socket-server && npm test`

### Deliverables
- [ ] PHP 8.2+ running
- [ ] Docker services running
- [ ] Database migrated and seeded
- [ ] Mobile test runner configured
- [ ] Backend tests passing
- [ ] Socket tests passing

---

## CYCLE 3 — BUSINESS ISOLATION

### Tasks
1. **Create `BusinessIdentity` type** in `packages/shared/src/types/business.ts`
2. **Create `BusinessThemeContext`** in `packages/shared/src/theme/BusinessThemeContext.tsx`
3. **Add business profile API endpoints** — GET/POST business profile, logo upload
4. **Create `business_profiles` database migration**
5. **Implement per-business theme wrapping** in all business-facing screens
6. **Business owner admin UI** — Theme/color/logo settings
7. **Restaurant detail screen** wraps in `BusinessThemeProvider`
8. **Test each business renders with its own gradient**

### Deliverables
- [ ] BusinessIdentity type defined
- [ ] BusinessThemeContext created and exported
- [ ] Business profile CRUD API
- [ ] Database migration for business_profiles
- [ ] Restaurant screens use business themes
- [ ] Each business feels like its own app

---

## CYCLE 4 — DESIGN APPLICATION

### Tasks
1. **Update shared theme constants** — COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, TYPOGRAPHY
2. **Install Poppins fonts** in all 3 apps
3. **Update all StyleSheet.create** — Dark → Light (#F2F4F1, #FFFFFF, #E5EAE4)
4. **Update StatusBar** — light-content → dark-content
5. **Update LinearGradient** — Orange → Green (#0B3B2A, #0A7C4E)
6. **Update bottom nav** — Light theme with blur backdrop, green active
7. **Update all buttons** — Green primary, outlined secondary
8. **Update all cards** — White bg, subtle shadows, 18px radius
9. **Update typography** — Poppins for headings, Inter for body
10. **Apply to all 46 screens** across rider (22), driver (14), admin (12)
11. **Test responsive design** — All screen sizes

### Deliverables
- [ ] PHBIMH colors applied to all screens
- [ ] Poppins + Inter fonts loading correctly
- [ ] Bottom nav with blur backdrop
- [ ] No hardcoded dark colors remaining
- [ ] All buttons, cards, headers match PHBIMH
- [ ] Responsive on small/medium/large screens

---

## CYCLE 5 — APK BUILD & DEVICE TESTING

### Tasks
1. **Fix build environment** — Kill Gradle daemons, clear Metro cache
2. **Fix driver app** — expo-task-manager dependency
3. **Build rider APK** — `npx expo run:android --variant release`
4. **Build driver APK** — Same
5. **Build admin APK** — Same
6. **Verify APK contains JS bundle** — `unzip -l | grep index.android.bundle`
7. **Install on physical devices** — NO Expo Go
8. **Test rider app** — Login, book ride, track, pay, rate
9. **Test driver app** — Login, go online, accept ride, navigate, complete
10. **Test admin app** — Login, dashboard, manage drivers, settings
11. **Test edge cases** — Network loss, background/foreground, low battery
12. **Test all screen sizes** — Small phone, large phone, tablet

### Deliverables
- [ ] 3 working release APKs
- [ ] All apps launch without crash
- [ ] All core flows tested on device
- [ ] Edge cases tested
- [ ] All screen sizes accommodated

---

## CYCLE 6 — QA CYCLE

### Tasks
1. **Run full backend test suite** — Target 80% coverage
2. **Run full mobile test suite** — Target 70% coverage
3. **Test all 170+ API endpoints**
4. **Test ride lifecycle** — Complete happy path + all failure paths
5. **Test payment flows** — Cash, wallet, PayFast, Ozow, Stripe
6. **Test food delivery** — Order, prep, pickup, deliver
7. **Test wallet system** — Deposit, pay, refund, concurrent access
8. **Test Socket.IO** — Real-time tracking, chat, reconnection
9. **Test rate limiting** — Verify all limits enforced
10. **Test security** — Auth bypass attempts, IDOR, injection
11. **Fish for bugs** — Try to break everything
12. **Performance check** — API response times, memory usage

### Deliverables
- [ ] Backend tests ≥ 80% coverage
- [ ] Mobile tests ≥ 70% coverage
- [ ] All API endpoints tested
- [ ] All business flows tested
- [ ] Security re-scan clean
- [ ] Performance within targets

---

## CYCLE 7 — FINAL REVIEW

### Tasks
1. **Security re-scan** — Verify all critical/high/medium fixed
2. **Code review** — All changes reviewed
3. **Performance audit** — API p95 < 500ms
4. **Design verification** — Every screen matches PHBIMH
5. **Production readiness checklist** — All items checked
6. **GO/NO-GO decision**

### Deliverables
- [ ] Security: All findings resolved
- [ ] Code: All reviewed and approved
- [ ] Performance: Within targets
- [ ] Design: PHBIMH applied everywhere
- [ ] Production: READY

---

## EXECUTION STRATEGY

### Parallel Execution Model
```
CYCLE 1 (Security)  ←── STARTS NOW
CYCLE 2 (Env Setup) ←── STARTS NOW (parallel)

After C1+C2 complete:
CYCLE 3 (Business Isolation) ←── STARTS
CYCLE 4 (Design Application) ←── STARTS (parallel with C3)

After C3+C4 complete:
CYCLE 5 (APK Build & Device Testing) ←── STARTS

After C5 complete:
CYCLE 6 (QA Cycle) ←── STARTS

After C6 complete:
CYCLE 7 (Final Review) ←── STARTS
```

### Team Assignments

| Team Member | Cycle 1 | Cycle 2 | Cycle 3 | Cycle 4 | Cycle 5 | Cycle 6 | Cycle 7 |
|------------|---------|---------|---------|---------|---------|---------|---------|
| **Debugger** | Fix C-03, C-05, C-07 | — | — | — | — | — | — |
| **Security Reviewer** | Verify all fixes | — | — | — | — | Re-scan | Final audit |
| **DevOps Engineer** | — | Install deps, Docker | — | — | Build APKs | — | — |
| **Backend Builder** | — | Run tests | Business API | — | — | API tests | — |
| **Mobile Builder** | — | Configure tests | BusinessTheme | Apply PHBIMH | Install & test | Mobile tests | — |
| **QA Engineer** | — | — | — | — | Device testing | Full QA | — |

---

## CRITICAL PATH

```
SECURITY (C1) ──┐
                ├──► BUSINESS ISOLATION (C3) ──┐
ENV SETUP (C2) ─┘                              ├──► APK BUILD (C5) ──► QA (C6) ──► REVIEW (C7)
                                               │
                DESIGN APPLICATION (C4) ───────┘
```

**BLOCKERS:**
- C1 MUST complete before C3 (security before new features)
- C2 MUST complete before C5 (environment before builds)
- C3+C4 MUST complete before C5 (design before APK)
- C5 MUST complete before C6 (APK before QA)
- C6 MUST complete before C7 (QA before final review)

---

*This plan is a living document. Update as work progresses. Every checkbox must be checked before GO decision.*
