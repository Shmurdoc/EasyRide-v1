# EasyRyde — Threat Model (STRIDE per Component)

> **Segment**: 05-SECURITY · **Status**: REFRESHED 2026-08-14 (v1 CRIT-01 PCI + CRIT-03 promo-validation findings are FIXED)  
> **Latest audit**: `AUDIT-2026-07-30.md` (28 findings, 4 critical — all criticals fixed) · **Linked**: `PCI-DSS.md`, `POPIA-GDPR.md`, `RBAC-MATRIX.md`, `INCIDENT-RESPONSE.md`

---

## 1. Trust Boundaries

```
[Device apps] → (TLS) → [Nginx] → [Laravel API] → [PostgreSQL]
                              ↘ → [Redis] (cache/queue/broadcast)
                              ↘ → [Socket-server] → rooms
[Gateways (PayFast/Ozow/Stripe/Twilio/PHBIMH)] → webhooks → Laravel (IP whitelist + signatures)
[Admin panel] → (TLS + TOTP) → Laravel admin routes
```

Boundaries that matter: **device→API** (bearer auth), **webhook→API** (IP+HMAC), **socket handshake** (Sanctum validation), **client-supplied geometry/fares** (server recompute), **admin** (role + TOTP).

## 2. STRIDE Matrix

| Component | S (spoof) | T (tamper) | R (repud) | I (info disc) | D (DoS) | E (escalation) |
|---|---|---|---|---|---|---|
| Auth | token forgery → Sanctum bearer + `auth/me` validation | token in logs → hidden fields; TLS | lockout audit | PII → hashes + encryption | 5/min throttles | role middleware + TOTP |
| Ride create | fake driver/rider pairing → ownership checks in `RideController` | **client-submitted fare/geometry → server recompute** (`server_calculated_*`, `fare_calculation_log`) | status history actor | route privacy → room auth (RideChannel) | `ride-create` 5/min + concurrent lock | driver actions gated `role:driver` |
| Payments | forged gateway callbacks → **IP whitelist + signature (PayFast ITN, Ozow, Stripe, partner HMAC)** | double-spend → `idempotency_key` unique, escrow guards, `PaymentAlreadyHeldException` | webhook_events log | PAN/CVV → never stored (PCI) | `payments` 10/min | refund admin-only |
| Wallet | cross-user confirm → ownership checks (`WalletController` + tests) | drift → `balance_snapshot` + reconcile job | tx ledger (before/after) | balance privacy | `wallet-*` 5/min | withdraw driver-only |
| Socket | spoofed driver location → `authorize.js` ride participant + token revalidation 55s | spoofing flags (`is_spoofed`, battery/heading) in `ride_location_logs` | socket logs | geo PII → rooms only | rate limit 60/min + event dedup 10s | admin events role-gated |
| Admin | stolen admin session → **TOTP** | destructive ops → audit log (old/new/ip/ua) | audit trail | reports PII → role + TLS | `api` 60/min | super-admin scope |
| Webhooks B2B | fake partner → `webhook.ip:partner` + HMAC | order forgery → signature | WebhookEvent | — | `api` limiter | — |

## 3. Top Open Threats (by risk)

| # | Threat | Status | Mitigation |
|---|---|---|---|
| T-01 | Mobile client API base fallback `http://127.0.0.1:8000/api` shipped (HIGH-007) | OPEN | EXPO_PUBLIC_API_URL must be set per build; release builds verify non-local base |
| T-02 | Fare fallback R50 on route-service failure could undercharge | OPEN (H-001) | explicit failure + cap (B-203) |
| T-03 | No alerting when job/queue health degrades | OPEN (M-006) | Grafana alert rules + runbooks |
| T-04 | OSRM route service single point (no fallback) | OPEN | OSRM HA or fallback provider |
| T-06 | **Fake-trip money laundering** — rider+driver fabricate rides (promo codes / cash fares) to convert wallet credit to cash | OPEN | collusion detection (B-406), fraud settings, wallet-proof cargo (F-PR-01) |
| T-07 | **Cancel-after-pickup** — driver takes rider then cancels (no consequence today — fees never charged) | OPEN | R1 fine (B-404), pending-debt accrual |
| T-08 | **Near-destination cancellation** — cancels 100 m from dropoff to force cash/off-platform handshake | OPEN | R2 fine w/ admin-editable radius (`fraud_near_dropoff_radius_km`) |
| T-09 | **Pair collusion** — same rider/driver repeatedly cancel (R3) | OPEN | advisory flag + admin review (B-406) |
| T-10 | **Employee-fleet insider** — EasyRyde staff driver abuses privileges | OPEN | `fleet_type` requires approved KYC; per-vertical pool isolation (B-407/B-408); drivers list review (F-PL-02) |
| T-11 | **Phantom parcel** — accept, mark picked up, never deliver, claim `failed` | OPEN | POD gate + failed-confirm window (F-PR-02/03) |
| T-12 | **POD forgery** | OPEN | photo required to complete; admin evidence view; EXIF check optional |

## 4. Verification Notes (how each control is proven)

| Control | Proof |
|---|---|
| Webhook IP checks | `webhook.ip:partner` on `partner/order|status` routes; `config/webhook_ips.php` |
| Server-side fare | `SecurityFixTest` — driver-submitted distance/duration ignored; `fare_calculation_log` |
| Rate limits | named limiters in `bootstrap/app.php` + `AppServiceProvider` |
| Input sanitize | `InputSanitizationMiddleware` on api group |
| Headers | `SecurityHeadersMiddleware` + nginx (HSTS, CSP, DENY) |
| PII at rest | `EncryptsPii` trait + `text` columns; email_hash unique |
| TOTP | `HasTotp` trait + `AdminTotpMiddleware` + `Traits/HasTotpTest` |
| Socket auth | token validation via `/auth/me`, 60s cache, 55s revalidate, invalidate channel |

## 5. Attack Simulation Inventory (load-tests/security)

`auth-bypass.js` (401s) · `csrf-tests.js` (missing origin) · `rate-limit-bypass.js` (100 r/s) · `sql-injection.js` (10 payloads) · `webhook-forgery.js` (unsigned/malformed) · `xss-injection.js` (10 payloads) — all single-VU rejection tests.

## References

- Full 28-finding audit: `AUDIT-2026-07-30.md` · PCI posture: `PCI-DSS.md` · POPIA: `POPIA-GDPR.md` · Roles: `RBAC-MATRIX.md` · Runbooks: `../09-OPS/RUNBOOKS.md`