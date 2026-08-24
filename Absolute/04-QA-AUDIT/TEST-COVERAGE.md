# EasyRyde — Test Coverage Map

> **Segment**: 04-QA-AUDIT · **Status**: VERIFIED 2026-08-14 (counts from `backend/tests/`, `mobile/**/__tests__`)  
> **Linked**: `../08-TESTING/TEST-STRATEGY.md`, `MOBILE-TESTS.md`, `API-TESTS.md`

---

## 1. Backend (PHPUnit, PostgreSQL `easyryde_test`)

| Suite | Files | Coverage (domains) |
|---|---|---|
| Feature | 49 | admin (2), auth (2), chat, config, consent (2), db-flow (2), retention, data-rights, delivery, driver, food admin, food delivery (2), health (2), incidents (2), integration, kyc, notifications, payments (3), peak hours, places, pool (2), promos (2), ratings, referrals, reporting, rides (4), scheduled (2), sos, surge zones, users (2), wallet, webhooks |
| Unit | 38 | services: cash reconciliation, delivery, driver, email, escrow, fare (2), food (2), payment, payout, promo, push, rating, referral, refund, matching (3), ride, sms, stripe (2), surge, wallet; jobs (5); middleware (3); payment gateways (2 + router); HasTotp trait |
| Security | 3 | SQLi/XSS/access-control; server-side fare integrity; wallet-confirm security, rate limiting |
| Load | 0 (empty dir — k6 lives in `load-tests/`) | k6: 12 scenarios incl. security forgery |

**Known truth**: AGENTS.md says 433 tests/974 assertions; TASK-QA-002 measured 556/~1119 (486 feature + 70 unit). **Refreshed count after latest commits**: 90 files on disk — run the suite to get the live number (QA §3 of README.md).

## 2. Mobile

| App | Jest files | Coverage highlights |
|---|---|---|
| rider | 23 | all 21 screens + mocks/test-utils |
| driver | 14 | all 12 screens + setup |
| admin (Expo) | ~24 | screens + `adminApi` + 7 hooks |
| shared | 14 | apiClient, businessThemes, foodDelivery, i18n, mapUtils, offlineQueue, ThemeContext, useActiveRide/Auth/NetworkStatus/Notifications/RideStore/Socket, utils |
| theme | ~3 | BusinessIdentity, BusinessThemeContext, Colors |

**E2E**: Detox 7 files (rider login/smoke/bookRide/rides; driver login/smoke/goOnline; root smokes) · Maestro 6+ flows (auth, ride-booking, driver login) · `web/` Playwright suites.

## 3. Coverage Gaps (highest value first)

| Gap | Why it matters | Fix route |
|---|---|---|
| Payment gateway integration (live ITN/Ozow/Stripe calls) | money path integrity | sandbox contracts + webhook replay tests (k6 has forgery only) |
| Socket-server test suite thin (`npm test` exists but small) | dispatch correctness | extend coverage in `socket-server/test` |
| Load suite never run against prod | NFR-101..105 evidence | schedule k6 run post-deploy |
| Mobile: no golden screenshots, no a11y checks | visual regression + NFR-604 | Roborazzi/Robolectric or device screenshots |
| OpenAPI parity check in CI | contract drift | add `openapi diff` step |
| Fuzzing beyond 10 SQLi/XSS payloads | edge robustness | expand payload corpus |

## 4. How to Read Coverage Zustand (avoid false confidence)

- Feature tests hit controllers with seeded roles (per AGENTS.md test-setup pattern).
- Services tested in isolation miss orchestration bugs → covered by `IntegrationTest` + `DatabaseFlowTest`.
- Client tests mock `api` — they prove rendering, not I/O; e2e (Maestro/Detox) prove I/O on emulator.

## References

- Strategy & pyramid: `../08-TESTING/TEST-STRATEGY.md` · Evidence reports: `../08-TESTING/TASK-QA-002-REPORT.md` · Bugs: `CRITICAL-BUGS.md`