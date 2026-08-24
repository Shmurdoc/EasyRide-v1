# EasyRyde — Authentication & Consent Flows

> **Segment**: 03-WORKFLOWS · **Status**: VERIFIED 2026-08-14  
> **Deep drill**: `../../docs/flow/04-cross-cutting/authentication-flow.md`

---

## 1. Auth Stack

| Flow | Endpoints | Throttle | Notes |
|---|---|---|---|
| Register | `POST /auth/register` | 5/min | creates rider (default role); token returned |
| Login | `POST /auth/login` | 5/min/IP | `failed_attempts` + `locked_until` lockout |
| Logout | `POST /auth/logout` | — | revokes Sanctum token |
| Me | `GET /auth/me` | — | used by socket-server auth validation (60s cache) |
| Forgot/reset | `POST /auth/forgot-password`, `/reset-password` | 3/min | email via `EmailService` |
| Social | `GET /auth/{provider}/redirect\|callback` | 5/min | google/facebook/phone-style providers |

## 2. Token Model

- **Sanctum personal access tokens**, prefix `er_`, default TTL 10080 min (7 days) — `config/sanctum.php`.
- Stored SecureStore (`auth_token`) on device; sent `Authorization: Bearer`.
- `RevokeExpiredTokensJob` (daily 04:00) prunes expired + stale >90 days.
- Socket-server validates token via `/auth/me` every 55s; token invalidation broadcast on `auth:token:invalidate` channel (tombstone `INVALID` 30s).

## 3. Mobile App Gate (per app)

```
App start → AuthProvider reads SecureStore token
  token? → refresh user (GET /auth/me) → MainStack
  no token → AuthStack (Login/Register)
ConsentScreen gate: required consent types granted? (GET /consent/) → block until grant
Push registration: POST /notifications/register-token after login
Socket connect: join user:{id}, driver:{id} (drivers), admin room (admins)
```

## 4. Consent (POPIA)

| Type (seed) | Purpose | API |
|---|---|---|
| privacy_policy | data processing notice | `POST /consent/grant` (type+version) |
| location_tracking | live location use | `GET /consent/`, `/history` |
| marketing | promotions | `POST /consent/revoke` |

- `UserConsentService::hasAllRequiredConsents` gates app use; `hasConsent(type)` gates location features.
- Each grant records ip_address + user_agent + version (auditable).

## 5. Admin 2FA (TOTP)

1. Admin enables: `POST /admin/totp/enable` → secret → QR.
2. Every subsequent admin API call must pass `X-Totp-Code` when `totp_enabled` (middleware `admin.totp`).
3. `POST /admin/totp/verify` challenges; `disable` requires `admin.totp` + role.
- `HasTotp` trait on User; tests cover `Traits/HasTotpTest`.

## 6. Security Properties

| Property | Where |
|---|---|
| Brute force | throttles + lockout fields |
| Token theft | TTL, prefix, revoke, TOTP for admins |
| Session fixation | Sanctum stateless; `EnsureFrontendRequestsAreStateful` for cookies |
| Webhook vs user auth | webhooks use IP whitelist, NOT bearer tokens |
| PII in auth | password bcrypt-12; email/phone hashed for lookup |

## References

- Failure paths: `FAILURE-MODES.md` (F-AU-*) · Threat model: `../05-SECURITY/THREAT-MODEL.md`
- POPIA detail: `../05-SECURITY/POPIA-GDPR.md` · RBAC: `../05-SECURITY/RBAC-MATRIX.md`