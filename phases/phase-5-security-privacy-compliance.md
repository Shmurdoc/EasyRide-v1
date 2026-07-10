# Phase 5: Security, Privacy & Compliance

**Version:** 1.0.0
**Created:** 2026-07-08T20:30:00Z
**Status:** Approved
**Approved:** 2026-07-08T21:00:00Z
**Superpowers Phase:** 5 of 8 — Security, Privacy & Compliance (Mandatory)
**Prepared by:** opencode
**Depends on:** Phase 1 (v1.0.0), Phase 2 (v1.0.0), Phase 3 (v1.0.0), Phase 4 (v1.0.0 Approved), Planner/security-model.md, Planner/compliance-spec.md
**Sources:** Phase 4 security/compliance gaps (SG-01–SG-07, CG-01–CG-07), Planner/security-model.md, Planner/compliance-spec.md, security-and-hardening skill, threat-modeling skill (STRIDE)

---

## Summary

This document consolidates all security, privacy, and compliance requirements for EasyRyde into a single authoritative reference. It defines the STRIDE threat model, attack surfaces, security controls, compliance mapping (POPIA, FICA, PCI-DSS, SA Tax, SA Labour), incident response, and security testing strategy. **Every code decision must reference this document.**

---

## Table of Contents

1. [Trust Boundaries & Data Flow Diagram](#1-trust-boundaries--data-flow-diagram)
2. [STRIDE Threat Model](#2-stride-threat-model)
3. [Attack Surface Analysis](#3-attack-surface-analysis)
4. [Security Controls](#4-security-controls)
5. [Data Encryption & Privacy](#5-data-encryption--privacy)
6. [POPIA Compliance](#6-popia-compliance)
7. [FICA Compliance](#7-fica-compliance)
8. [PCI-DSS Compliance](#8-pci-dss-compliance)
9. [SA Tax Law Compliance](#9-sa-tax-law-compliance)
10. [SA Labour Law Compliance](#10-sa-labour-law-compliance)
11. [Incident Response Plan](#11-incident-response-plan)
12. [Security Testing Strategy](#12-security-testing-strategy)
13. [Phase 4 Security Gaps — Remediation Plan](#13-phase-4-security-gaps--remediation-plan)
14. [Compliance Verification Matrix](#14-compliance-verification-matrix)
15. [Sign-Off](#15-sign-off)

---

## 1. Trust Boundaries & Data Flow Diagram

### 1.1 System Data Flow

```
                    Trust Boundary: Internet
                    ==========================
                           |
                    [Rider App]  [Driver App]  [Admin Dashboard]
                    (React Native) (React Native) (React + TailwindCSS)
                           |
                      HTTPS/TLS 1.3
                           |
                    ==========================
                    Trust Boundary: DMZ
                    ==========================
                           |
                    (Cloudflare WAF/CDN)
                           |
                    [Nginx Reverse Proxy]
                    /       |        \
                   /        |         \
        [Laravel API]  [Socket.IO]  [Admin SPA]
        (port 8000)    (port 3001)  (port 80)
              |            |
              |      [Redis Adapter]
              |            |
              |       [Node.js Workers]
              |            |
              +------+-----+
                     |
                    ==========================
                    Trust Boundary: Internal
                    ==========================
                           |
              +------+-----+------+
              |      |            |
        [PostgreSQL] [Redis]  [Firebase]
        (port 5432)  (6379)   (FCM/APNs)
              |
              +-------> [PayFast] [Ozow]
                        (Payment Gateways)
                           |
                    ==========================
                    Trust Boundary: External Services
                    ==========================
                    [Nominatim/OSRM]  [Sentry]  [S3 Storage]
```

### 1.2 Trust Boundary Crossings

| Crossing | From | To | Protocol | Data Classification | Threats |
|----------|------|-----|----------|-------------------|---------|
| TB-1 | Rider/Driver App | Nginx | HTTPS/TLS 1.3 | PII + Location | Spoofing, Tampering, Injection |
| TB-2 | Nginx | Laravel API | HTTP (internal) | Authenticated requests | Tampering, Elevation |
| TB-3 | Nginx | Socket.IO | WSS | Real-time location, chat | Spoofing, Tampering, DoS |
| TB-4 | Laravel API | PostgreSQL | TCP (internal) | All data | Injection, Information Disclosure |
| TB-5 | Laravel API | Redis | TCP (internal) | Session, cache, queue | Information Disclosure |
| TB-6 | Laravel API | PayFast/Ozow | HTTPS | Payment tokens | Tampering, Repudiation |
| TB-7 | Laravel API | Nominatim | HTTP | Coordinates | SSRF, Information Disclosure |
| TB-8 | Laravel API | OSRM | HTTP | Coordinates | SSRF |
| TB-9 | Socket.IO | Firebase | HTTPS | Push tokens | Spoofing, Information Disclosure |
| TB-10 | Laravel API | Sentry | HTTPS | Error data | Information Disclosure |
| TB-11 | PHBIMH System | Laravel API | HTTPS | Ride/delivery orders | Spoofing, Tampering, Injection |

---

## 2. STRIDE Threat Model

### 2.1 Threat Worksheet: API Gateway (Laravel)

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T001 | Spoofing | Forged JWT/Sanctum tokens | Stolen signing key, weak APP_KEY | Medium | Critical | 15 | Sanctum token validation, bcrypt passwords | No device binding, no token rotation | Add device fingerprinting, implement 7-day token expiry + refresh, rotate APP_KEY quarterly | Open |
| T002 | Tampering | Modified API requests | MITM, proxy interception | Low | High | 8 | TLS 1.3, HSTS | No request signing for mobile | Certificate pinning for mobile apps, HMAC request signing for admin API | Open |
| T003 | Repudiation | Admin denies actions | No audit trail | Medium | High | 12 | Basic logging | No structured audit logs | Implement Spatie ActivityLog for all admin actions, immutable audit_logs table | Open |
| T004 | Info Disclosure | Verbose error messages | Triggering exceptions exposes stack traces | High | Medium | 12 | APP_DEBUG flag | No centralized error handling | Set APP_DEBUG=false in production, implement Sentry error boundaries, generic error responses | Open |
| T005 | DoS | API flooding | Botnet, script kiddies | Medium | High | 12 | None (Phase 4 SG-02) | No rate limiting at all | Implement Laravel throttle: 10/min auth, 60/min general, 120/min webhooks | Open |
| T006 | Elevation | IDOR — accessing other users' data | Manipulating resource IDs | Medium | Critical | 15 | Auth required, some policies | Missing policies (6 models), no ownership checks | Implement policies for all models, enforce ownership on every endpoint, use UUID opaque IDs | Open |

### 2.2 Threat Worksheet: Mobile Apps (Rider + Driver)

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T007 | Spoofing | Fake GPS location injection | Rooted device, spoofing app | High | High | 16 | None | No GPS validation | Server-side GPS plausibility checks, detect rooted/jailbroken devices, location consistency checks | Open |
| T008 | Tampering | Modified app binary | Decompile, patch, repackage | Medium | High | 12 | None | No code obfuscation | ProGuard/R8 obfuscation, SafetyNet/Play Integrity (Android), DeviceCheck (iOS), certificate pinning | Open |
| T009 | Info Disclosure | Token extraction from device | Physical access, malware | Medium | High | 12 | None | No secure storage enforcement | Use Keychain (iOS) / EncryptedSharedPreferences (Android), implement biometric lock for sensitive actions | Open |
| T010 | DoS | Battery drain via location polling | Malicious server response | Low | Medium | 6 | GPS interval optimization | No battery usage monitoring | Adaptive polling (15min idle, 10s active), respect battery saver mode, cap daily location updates | Open |
| T011 | Elevation | Rider accessing driver-only features | Decompiling app, calling API directly | Medium | High | 12 | Role-based middleware | Incomplete role checks on some endpoints | Enforce role middleware on ALL endpoints, validate role on every request server-side | Open |

### 2.3 Threat Worksheet: Socket.IO Server

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T012 | Spoofing | Impersonate rider/driver in real-time | Stolen token, session hijack | Medium | Critical | 15 | Token auth on connect | No token refresh validation on reconnect | Validate token on every reconnect, implement connection-level auth, reject expired tokens | Open |
| T013 | Tampering | Location data manipulation | Intercept WebSocket frames | Low | High | 8 | WSS encryption | No location data validation | Server-side GPS coordinate validation, reject implausible location jumps | Open |
| T014 | DoS | Socket flooding | Mass connection attempts | Medium | High | 12 | None | No connection rate limiting | Implement connection rate limiting per IP, max connections per user, Redis adapter for horizontal scaling | Open |
| T015 | Info Disclosure | Room data leakage | Joining unauthorized rooms | Medium | High | 12 | Room-based isolation | No room authorization check | Validate user belongs to room before allowing join, enforce ride ownership for location rooms | Open |

### 2.4 Threat Worksheet: Database (PostgreSQL)

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T016 | Spoofing | Unauthorized database access | Credential theft, misconfigured pg_hba.conf | Low | Critical | 10 | Password auth, network isolation | No connection pooling with TLS | Implement PgBouncer with TLS for cross-host, rotate DB credentials quarterly | Open |
| T017 | Tampering | Direct data modification | SQL injection, compromised app container | Low | Critical | 10 | Eloquent ORM parameterized queries | Raw DB::raw() calls exist | Audit all DB::raw/DB::statement calls, ban string concatenation in queries, use strict mode | Open |
| T018 | Info Disclosure | PII extraction | Unauthorized query, backup theft | Low | Critical | 10 | Network isolation | Backups not encrypted | Encrypt backups at rest, implement column-level encryption for PII fields, audit log all PII access | Open |

### 2.5 Threat Worksheet: Payment Gateways (PayFast/Ozow)

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T019 | Tampering | Webhook payload modification | Intercept callback, replay attack | Medium | Critical | 15 | None (sandbox defaults in code) | No webhook signature verification | Implement PayFast MD5+passphrase validation, Ozow HMAC-SHA256 verification, idempotent processing | Open |
| T020 | Repudiation | Payment dispute — no proof | Rider claims didn't pay | Medium | High | 12 | None | No payment receipt trail | Store payment gateway reference, transaction ID, full audit trail, generate PDF receipts | Open |
| T021 | Info Disclosure | Sandbox credentials in production | config/services.php has test keys | High | Critical | 20 | None | Hardcoded sandbox defaults | Remove all test values, require env vars for all payment credentials, validate on boot | Open |

### 2.6 Threat Worksheet: PHBIMH Integration

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk | Existing Controls | Gaps | Mitigations | Status |
|----|----------|--------|---------------|------------|--------|------|-------------------|------|-------------|--------|
| T022 | Spoofing | Forged integration requests | Impersonate PHBIMH system | Medium | Critical | 15 | None | No shared auth mechanism | Implement HMAC-signed webhooks, API key + IP whitelist for PHBIMH, mutual TLS | Open |
| T023 | Tampering | Modified ride/deivery orders | Intercept API calls between systems | Medium | High | 12 | None | No request signing | HMAC-SHA256 request signing, payload integrity verification, idempotency keys | Open |
| T024 | Elevation | PHBIMH accessing unauthorised EasyRyde data | Excessive API permissions | Medium | High | 12 | None | No API scope limitation | Scoped API keys for PHBIMH: ride:write, delivery:write, driver:read only — no user PII access | Open |
| T025 | DoS | PHBIMH traffic overload | Excessive requests from PHBIMH | Low | High | 8 | None | No integration rate limiting | Dedicated rate limit for integration endpoints: 100/min, circuit breaker on failures | Open |

---

## 3. Attack Surface Analysis

### 3.1 External Attack Surface

| Surface | Entry Points | Assets at Risk | Priority |
|---------|-------------|----------------|----------|
| **Rider Mobile App** | Login, ride request, payment, chat, SOS, location sharing | User PII, payment tokens, real-time location, ride history | P0 |
| **Driver Mobile App** | Login, accept ride, update location, chat, earnings, documents | Driver PII, KYC documents, bank details, real-time location | P0 |
| **Admin Dashboard** | Login, user management, ride management, KYC approval, reports, settings | All system data, user PII, payment data, system configuration | P0 |
| **Laravel API** | All REST endpoints (v1/auth/*, v1/rides/*, v1/payments/*, etc.) | All backend data | P0 |
| **Socket.IO Server** | WebSocket connections, room joins, location updates, chat messages | Real-time location, chat content, ride state | P0 |
| **Webhook Endpoints** | PayFast callbacks, Ozow callbacks, Firebase FCM | Payment state, notification delivery | P1 |
| **PHBIMH Integration API** | Ride delegation, driver sync, payment delegation | Ride data, driver data, payment data | P1 |

### 3.2 Internal Attack Surface

| Surface | Entry Points | Assets at Risk | Priority |
|---------|-------------|----------------|----------|
| **PostgreSQL** | Direct DB access (compromised container), SQL injection | All data at rest | P0 |
| **Redis** | Direct access (compromised container), cache poisoning | Session tokens, location cache, queue jobs | P0 |
| **Firebase** | Service account key (if leaked), FCM token spoofing | Push notification delivery, user device tokens | P1 |
| **File Storage (S3)** | Direct URL guessing, signed URL bypass | KYC documents, user uploads, ride evidence | P1 |
| **Sentry** | DSN exposure, error data leakage | Application errors, user context in errors | P2 |

---

## 4. Security Controls

### 4.1 Authentication

| Control | Implementation | Standard | Status |
|---------|---------------|----------|--------|
| Password hashing | bcrypt, cost factor 12 | Laravel default | ✅ Exists |
| Token type | Laravel Sanctum (SPA + Mobile) | Laravel Sanctum | ✅ Exists |
| Token expiry | 7 days (mobile), session (SPA) | Config: `sanctum.php` | ⚠️ Needs implementation |
| Token refresh | Extend by 7 days on refresh endpoint | Custom endpoint | ❌ Missing |
| Account lockout | 5 failed attempts → 15min lock | Redis-backed counter | ❌ Missing |
| Login rate limiting | 10 requests/minute per IP | Laravel throttle | ❌ Missing |
| OTP rate limiting | 3 attempts per 10 minutes | Redis-backed counter | ❌ Missing |
| 2FA (admin) | TOTP, 30s window | Authenticator app | ❌ Missing |
| Device binding | Device fingerprint on token metadata | Custom implementation | ❌ Missing |
| Session invalidation | Password change, suspension, force-logout | Sanctum token revocation | ⚠️ Partial |

### 4.2 Authorization (RBAC)

| Role | Permissions | Middleware | Status |
|------|-------------|-----------|--------|
| `super-admin` | All permissions, system settings, audit logs | `role:super-admin` | ⚠️ Needs Spatie config |
| `ops-admin` | User management, ride management, KYC approval | `role:ops-admin` | ⚠️ Needs Spatie config |
| `finance-admin` | Payment details, reports, refunds | `role:finance-admin` | ⚠️ Needs Spatie config |
| `support-admin` | Limited PII view, chat, disputes | `role:support-admin` | ⚠️ Needs Spatie config |
| `driver` | Accept rides, update location, view earnings, chat | `role:driver` | ⚠️ Needs Spatie config |
| `rider` | Request rides, view history, rate, payment, chat | `role:rider` | ⚠️ Needs Spatie config |

**Missing Policies (Phase 4 finding):**

| Policy | Models Covered | Priority |
|--------|---------------|----------|
| `DriverProfilePolicy` | approve, reject, view, update | P0 |
| `KycVerificationPolicy` | approve, reject, view | P0 |
| `IncidentReportPolicy` | report, view, assign, resolve | P0 |
| `ReferralCodePolicy` | view, deactivate | P1 |
| `DeliveryPolicy` | create, view, assign, complete | P0 |
| `FoodOrderPolicy` | create, view, assign, complete | P0 |
| `ScheduledRidePolicy` | create, view, cancel | P0 |

### 4.3 Rate Limiting

| Endpoint Group | Limit | Window | Implementation |
|----------------|-------|--------|----------------|
| Auth (login/register) | 10 requests | 1 minute | `throttle:10,1` |
| Password reset | 5 requests | 1 minute | `throttle:5,1` |
| OTP request | 3 requests | 10 minutes | Redis-backed |
| OTP verify | 5 requests | 10 minutes | Redis-backed |
| SOS alert | 5 requests | 1 minute | Redis-backed |
| General API | 60 requests | 1 minute | `throttle:60,1` |
| Webhook endpoints | 120 requests | 1 minute | IP-based |
| Socket.IO connections | 60 connections | 1 minute | Socket middleware |
| PHBIMH integration | 100 requests | 1 minute | Dedicated middleware |

### 4.4 Security Headers (Nginx)

```nginx
# TLS Configuration
ssl_protocols TLSv1.3;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "0" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.easyryde.co.za wss://socket.easyryde.co.za;" always;
add_header Permissions-Policy "geolocation=(self), microphone=(), camera=(), payment=(self)" always;
```

### 4.5 CORS Configuration

```php
// config/cors.php — PRODUCTION
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allowed_origins' => [
        env('ADMIN_DASHBOARD_URL', 'https://app.easyryde.co.za'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => true, // Required for Sanctum SPA auth
];
```

### 4.6 Input Validation

| Validation Layer | Implementation | Scope |
|-----------------|---------------|-------|
| API boundary | Laravel FormRequest classes | All write endpoints |
| Eloquent casts | Strict type casting on models | All model attributes |
| UUID validation | Regex/UUID library | All resource IDs in API |
| Coordinate validation | Range check (-90/90, -180/180) | All GPS coordinates |
| String length | Max length on all text fields | All string/text inputs |
| File uploads | Type + size validation | KYC docs (10MB, jpg/png/pdf), evidence (20MB, 5 files) |
| Enum validation | In-array check | All status/enum fields |

### 4.7 Webhook Security

| Provider | Verification Method | Implementation |
|----------|-------------------|----------------|
| PayFast | MD5 signature + passphrase + IP check | `PayFastWebhookController::verifySignature()` |
| Ozow | HMAC-SHA256 + site code validation | `OzowWebhookController::verifySignature()` |
| Firebase | Firebase Admin SDK verification | `Firebase::verifyIdToken()` |
| PHBIMH | HMAC-SHA256 + shared secret + timestamp | `PhbimhWebhookController::verifySignature()` |

### 4.8 File Upload Security

| Asset | Max Size | Allowed Types | Storage | Access |
|-------|----------|---------------|---------|--------|
| KYC documents | 10MB | jpg, jpeg, png, pdf | `storage/app/kyc/` (outside webroot) | Authenticated download endpoint |
| Incident evidence | 20MB per file, max 5 files | jpg, jpeg, png, pdf, mp4 | `storage/app/incidents/` | Authenticated download endpoint |
| Profile photos | 5MB | jpg, jpeg, png | `storage/app/profiles/` | Authenticated + signed URLs |
| Food delivery photos | 10MB | jpg, jpeg, png | `storage/app/deliveries/` | Authenticated |

**Security measures:**
- Store outside public webroot (`storage/app/`)
- Access via signed URLs (expiry: 1 hour) or authenticated download endpoints
- Validate file type by MIME type + magic bytes (not just extension)
- Virus scanning recommended (ClamAV integration) before storage

---

## 5. Data Encryption & Privacy

### 5.1 Encryption at Rest

| Field | Table | Type | Encryption | Notes |
|-------|-------|------|------------|-------|
| `email` | users | string | AES-256 (Laravel `encrypted` cast) | Cannot use in WHERE — need `email_hash` for lookups |
| `phone_number` | users | string | AES-256 (Laravel `encrypted` cast) | Cannot use in WHERE — need `phone_hash` for lookups |
| `id_number` | driver_profiles | string | AES-256 (Laravel `encrypted` cast) | Never exposed in API responses |
| `license_number` | driver_profiles | string | AES-256 (Laravel `encrypted` cast) | Never exposed in API responses |
| `document_number` | kyc_verifications | string | AES-256 (Laravel `encrypted` cast) | Never exposed in API responses |
| `bank_account_number` | bank_accounts | string | AES-256 (Laravel `encrypted` cast) | Finance admin view only |
| `bank_branch_code` | bank_accounts | string | AES-256 (Laravel `encrypted` cast) | Finance admin view only |
| `last_four` | payment_methods | string | Plain (partial — only last 4) | Safe to store |

### 5.2 Encryption in Transit

| Connection | Protocol | Certificate | Notes |
|-----------|----------|-------------|-------|
| App → API | TLS 1.3 | Let's Encrypt (auto-renew) | HSTS enforced |
| App → Socket.IO | WSS (TLS 1.3) | Same cert via Nginx proxy | Certificate pinning on mobile |
| API → PostgreSQL | TCP + TLS (cross-host) | Self-signed or CA | PgBouncer with TLS |
| API → Redis | TCP | Password auth | Internal network only |
| API → PayFast | HTTPS | PayFast's cert | Webhook signature verification |
| API → Ozow | HTTPS | Ozow's cert | Webhook signature verification |
| API → Nominatim | HTTP | N/A | Public API, no sensitive data sent |
| API → OSRM | HTTP | N/A | Public API, no sensitive data sent |
| API → Sentry | HTTPS | Sentry's cert | Error data only, no PII |
| PHBIMH ↔ EasyRyde | HTTPS + HMAC | Mutual TLS recommended | Signed payloads |

### 5.3 Data Anonymisation

| Data Type | Anonymisation Method | Trigger | Timeline |
|-----------|---------------------|---------|----------|
| Deleted user profiles | Replace name with "Deleted User", null email/phone | Account deletion request | 30 days soft delete → anonymise |
| GPS locations (old) | Aggregate to heatmaps, discard individual points | Scheduled job | 90 days |
| Chat messages (old) | Delete entirely | Scheduled job | 1 year |
| Ride PII (old) | Anonymise rider/driver names, keep ride metrics | Scheduled job | 5 years |
| KYC documents | Securely delete files + metadata | Driver account closure + 5 years | 5 years after closure |
| Audit logs | Archive to cold storage | Scheduled job | 5 years |

---

## 6. POPIA Compliance

### 6.1 Consent Management

| Requirement | Implementation | Acceptance Criteria | Status |
|-------------|---------------|---------------------|--------|
| Explicit consent before collecting PI | Registration flow: checkbox with plain-language explanation | Consent recorded with timestamp + version + IP + user_agent | ❌ Missing |
| Consent withdrawal | In-app settings: "Withdraw consent" button | On withdrawal: stop processing, begin 30-day anonymisation | ❌ Missing |
| Consent versioning | Each event: user_id, consent_version, timestamp, IP | Versions documented in compliance repo | ❌ Missing |
| Minors (under 18) | Age gate at registration | If <18: guardian consent form required. Reject if unverified | ❌ Missing |

### 6.2 Data Subject Rights

| Right | Endpoint | SLA | Implementation |
|-------|----------|-----|---------------|
| Access | `GET /api/v1/account/data-export` | 72 hours | Returns JSON with all PII: profile, ride history, payment history, communications |
| Rectification | `PUT /api/v1/account/profile` | Immediate | User self-service for name, email, phone. Ride history via support ticket |
| Erasure | `POST /api/v1/account/erasure` | 30 days | Self-service. Financial records anonymised. Re-auth before deletion |
| Portability | `GET /api/v1/account/data-export?format=json` | 72 hours | Machine-readable JSON. All user-generated data |
| Object | `PUT /api/v1/account/consent` | Immediate | Opt-out marketing. Opt-out analytics sharing. Record objection |

### 6.3 Data Retention

| Data Category | Retention | Rationale | Enforcement |
|---------------|-----------|-----------|-------------|
| Rider profile | 5 years after last activity | POPIA + business | Scheduled anonymisation job |
| Driver profile | 5 years after last activity | FICA (5-year requirement) | Scheduled anonymisation job |
| Ride records | 5 years | Tax records + dispute resolution | Scheduled PII anonymisation |
| Payment transactions | 7 years | SARS tax requirement | Retain (no PII — tokenised) |
| Chat messages | 1 year | Dispute resolution | Scheduled deletion job |
| GPS location data | 90 days | Operational need | Scheduled aggregation job |
| Driver documents | 5 years after account closure | FICA requirement | Scheduled secure deletion |
| Audit logs | 5 years | POPIA + business | Archive to cold storage |
| Session tokens | Expiry + 30 days | Security | Scheduled deletion |
| Marketing preferences | Until consent withdrawn or 5 years inactive | POPIA | Scheduled deletion |

### 6.4 Breach Notification

| Requirement | Implementation | SLA |
|-------------|---------------|-----|
| Detection | Sentry alerting + intrusion detection + anomaly detection | Immediate |
| Regulator notification | Email to inforeg@justice.gov.za with: nature, categories, number affected, remediation | 72 hours from awareness |
| Subject notification | Direct email + SMS to affected users if harm likely | 72 hours from awareness |
| Documentation | Record: date discovered, nature, affected data, root cause, remediation, notification logs | Maintained 5 years |

### 6.5 Information Officer

| Role | Responsibility | Contact |
|------|---------------|---------|
| POPIA Information Officer | Register with SA Information Regulator, monitor compliance, handle data subject requests, act as Regulator contact | info@easyryde.co.za |
| Published on | Privacy policy page, in-app settings | — |

---

## 7. FICA Compliance

### 7.1 Identity Verification — Drivers

| Requirement | Implementation | Acceptance Criteria | Status |
|-------------|---------------|---------------------|--------|
| Verify identity | SA ID book/card (both sides) or passport | Document uploaded, admin reviewed, verified against Home Affairs (third-party) | ❌ Missing |
| Proof of address | Utility bill or bank statement (last 3 months) | Document uploaded, address matches ID, admin verified | ❌ Missing |
| Face verification | Live selfie compared to ID photo | Automated liveness detection. Manual admin review if match <80% | ❌ Missing |
| Beneficial ownership | If account operated for another: collect beneficial owner details | Same identity verification process as primary driver | ❌ Missing |
| Risk rating | Each driver: low/medium/high | Based on: ride volume, payment patterns, disputes. Enhanced due diligence for high-risk | ❌ Missing |

### 7.2 Document Retention

| Requirement | Implementation | Enforcement |
|-------------|---------------|-------------|
| Retain FICA documents 5 years | After account closure: retain ID, proof of address, verification records | Scheduled job, encrypted storage |
| Document expiry monitoring | Track license expiry, send reminder 30 days before | Automated notification |
| Deactivate if expired >7 days | Driver cannot accept rides until renewed | Automated status check |
| Periodic re-verification | Every 12 months: re-verify ID, proof of address, face | Scheduled job, trigger on risk change |

### 7.3 Transaction Monitoring

| Requirement | Implementation | Threshold |
|-------------|---------------|-----------|
| Reportable transactions | Monitor cash transactions > R24,999.99 | Report to FIC within 2 business days |
| Suspicious transactions | Flag patterns: rapid ride churn, payment cycling, refund abuse | Report to FIC |
| Record keeping | All transaction records retained 5 years | Reconstructable per request |

### 7.4 Admin FICA Workflow

| Feature | Acceptance Criteria |
|---------|---------------------|
| Driver FICA checklist | Admin sees per-driver FICA status: documents received, verified, risk rating, next review date. Traffic-light indicator |
| FICA deficiency tracking | If documents missing or expired: driver flagged, cannot accept rides until resolved. Admin notification |
| FICA compliance report | Exportable report: all drivers with FICA status, document expiry dates, last verification date, risk rating |

---

## 8. PCI-DSS Compliance

### 8.1 Cardholder Data Protection

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Never store full PAN | All card data handled by PayFast/Ozow. Our servers never see or store raw PAN. Only token + last 4 digits stored | ⚠️ Verify PayFast/Ozow config |
| Tokenisation | PayFast/Ozow handle card entry. Store only token + last 4 digits | ⚠️ Verify implementation |
| Card data transmission | All card data transmitted over TLS 1.3. PayFast/Ozow handles PCI-DSS scope | ✅ Inherited via SAQ-A |
| Mask PAN in storage | Only last 4 digits stored. Example: `************4242` | ⚠️ Verify implementation |
| 3D Secure | Enable for card-not-present transactions | ❌ Missing |

### 8.2 Access Control

| Requirement | Implementation |
|-------------|---------------|
| Need-to-know access | Only `finance-admin` role can view payment details (last 4 digits, token). Developers: never. Support: masked view only |
| Unique user IDs | Every admin account is unique. No shared accounts. Enforced via Sanctum |
| Physical security | Production servers: encrypted disks, access logged. Stripe/PayFast Dashboard: restricted to 2 named finance staff |

### 8.3 SAQ-A Self-Assessment

| Requirement | Verification |
|-------------|-------------|
| Card data is tokenised (never stored by EasyRyde) | Verify PayFast/Ozow handle all card data |
| No PAN stored in electronic or paper format | Audit codebase + database for any card data fields |
| Card data processed only by PCI-compliant third parties | Verify PayFast/Ozow PCI-DSS compliance certificates |
| All external connections use TLS 1.2+ | Nginx config audit |
| SAQ A form completed and signed annually | Document management |

---

## 9. SA Tax Law Compliance

### 9.1 VAT

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| VAT registration (if annual revenue >R1M) | Register with SARS, calculate 15% VAT on platform fee | ❌ Pre-launch |
| VAT on platform fee | Platform fee (20% of ride fare) is taxable supply. VAT = (platform fee × 15/115) | ❌ Missing |
| VAT on delivery fee | Food delivery fee: standard-rated 15% VAT | ❌ Missing |
| Input VAT recovery | Claim on: cloud infrastructure, marketing, professional services | ❌ Pre-launch |
| VAT invoices | Tax invoice for all platform fees (R50+): EasyRyde VAT number, date, amount, VAT amount, total | ❌ Missing |

### 9.2 Digital Receipts

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Receipt for every transaction | Every ride and delivery: PDF + email + in-app. Includes: EasyRyde details, date, amount, VAT breakdown | ❌ Missing |
| Receipt retention | 7 years (SARS requirement). Accessible through account history | ❌ Missing |
| Driver income record | Weekly earnings statement: gross earnings, platform fees, net pay | ❌ Missing |

### 9.3 Driver Tax

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Driver classification | Independent contractors (not employees). Written ToS. No PAYE deducted | ⚠️ ToS exists, verify classification |
| Tax guidance | In-app: "You are responsible for declaring earnings to SARS. Provisional tax may apply if annual earnings > R20,000" | ❌ Missing |
| Annual earnings report | By 31 May each year: provide each driver with annual earnings statement | ❌ Missing |

---

## 10. SA Labour Law Compliance

### 10.1 Driver Classification

| Requirement | Implementation | Verification |
|-------------|---------------|-------------|
| Independent contractor status | Written ToS: driver sets hours, uses own vehicle, no exclusivity, no guaranteed earnings | Legal review annually |
| No employer obligations | No PAYE, UIF, SDL, pension. No annual/sick leave. No company equipment | ToS + operational compliance |
| Control test compliance | Platform does NOT control: when driver works, routes, other work. Platform DOES control: safety, quality, payment | Quarterly audit |
| Legal review | Contractor classification reviewed by SA labour lawyer annually | Updated based on case law (Uber SA rulings) |

### 10.2 Fair Practices

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Fair cancellation | Both parties cancel with reasonable notice. No penalty for circumstances outside control | ⚠️ Phase 3 workflows define this |
| Transparent earnings | Full fare breakdown per ride. No hidden deductions. Platform fee clear | ❌ Missing in driver app |
| Dispute resolution | Submit dispute → admin reviews 24h → written decision → appeal option | ❌ Missing workflow |
| Non-discrimination | Dispatch: proximity + rating only. No race/gender/location discrimination. Audited quarterly | ⚠️ Algorithm audit needed |
| Deactivation policy | Written reasons. 7-day notice (except safety). Appeal process | ❌ Missing policy |
| Working hours notification | After 12h online: notification. Auto-offline after 14h (with override) | ❌ Missing |

---

## 11. Incident Response Plan

### 11.1 Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0 — Critical** | Data breach, system compromise, payment fraud, safety threat | 15 minutes | CEO + CISO + Legal |
| **P1 — High** | Service outage, authentication bypass, PII exposure | 1 hour | CISO + Tech Lead |
| **P2 — Medium** | Partial outage, performance degradation, suspicious activity | 4 hours | Tech Lead |
| **P3 — Low** | Minor bug, cosmetic issue, non-urgent security hardening | 24 hours | Team Lead |

### 11.2 Incident Response Flow

```
Security Event Detected
    ↓
Sentry Alert / Log Anomaly / User Report / External Notification
    ↓
Triage (15 min for P0, 1h for P1)
    ↓
Classify Severity (P0/P1/P2/P3)
    ↓
┌─────────────────────────────────────────────────┐
│ P0/P1: Activate Incident Commander              │
│ - Assemble response team                        │
│ - Open war room (Slack/Teams)                   │
│ - Begin incident timeline documentation         │
└─────────────────────────────────────────────────┘
    ↓
Containment
    ↓
├── Revoke compromised tokens
├── Suspend affected user accounts
├── Rotate compromised secrets (API keys, passwords)
├── Block malicious IPs
├── Isolate affected services
└── Preserve evidence (logs, database snapshots)
    ↓
Eradication
    ↓
├── Identify root cause
├── Patch vulnerability
├── Update security controls
└── Verify no persistence mechanism
    ↓
Recovery
    ↓
├── Restore from clean backups (if needed)
├── Verify system integrity
├── Resume services
└── Monitor for recurrence
    ↓
Notification (if data breach)
    ↓
├── POPIA: Notify Regulator within 72 hours
├── POPIA: Notify affected subjects if harm likely
├── FICA: Report suspicious transactions to FIC
├── PCI-DSS: Notify card brands if card data involved
└── Document all notifications with timestamps
    ↓
Post-Incident Review (within 7 days)
    ↓
├── Root cause analysis
├── Action items to prevent recurrence
├── Update incident response playbook
├── Update threat model
└── Lessons learned documentation
```

### 11.3 Breach Notification Templates

**Regulator Notification (POPIA):**
```
To: inforeg@justice.gov.za
Subject: Data Breach Notification — EasyRyde (Pty) Ltd

1. Nature of breach: [description]
2. Categories of data subjects: [riders/drivers/admins]
3. Categories of personal information: [PII types]
4. Approximate number of affected subjects: [number]
5. Likely consequences: [impact assessment]
6. Measures taken/proposed: [remediation]
7. Contact details: [Information Officer]
8. Date breach occurred: [date]
9. Date breach discovered: [date]
```

**Subject Notification (POPIA):**
```
Subject: Important Security Notice — EasyRyde

Dear [User],

We are writing to inform you of a security incident that may have affected your personal information.

What happened: [description]
What information was involved: [data types]
What we are doing: [remediation steps]
What you can do: [protective actions]

Contact: info@easyryde.co.za | 012 XXX XXXX
```

---

## 12. Security Testing Strategy

### 12.1 Automated Security Testing

| Test Type | Tool | Frequency | Scope |
|-----------|------|-----------|-------|
| SAST (Static Analysis) | Larastan (PHPStan for Laravel) | Every PR | All PHP code |
| SAST (JavaScript) | ESLint security plugins | Every PR | All JS/TS code |
| Dependency audit | `composer audit` / `npm audit` | Every build | All dependencies |
| DAST (Dynamic Analysis) | OWASP ZAP | Weekly | All API endpoints |
| Container scanning | Trivy | Every build | All Docker images |
| Secret scanning | GitLeaks | Every commit | Git history |
| License compliance | `composer licenses` | Every build | All dependencies |

### 12.2 Manual Security Testing

| Test Type | Scope | Frequency | Owner |
|-----------|-------|-----------|-------|
| Penetration testing | Full application | Annually + after major changes | External firm |
| Code review (security focus) | Auth, payment, data access | Every PR touching security-critical code | Security Lead |
| Configuration review | Nginx, PostgreSQL, Redis, Docker | Monthly | Tech Lead |
| Social engineering test | Admin accounts | Quarterly | External firm |

### 12.3 Security Test Cases

| Category | Test Case | Expected Result |
|----------|-----------|-----------------|
| **Auth** | Login with wrong password 5 times | Account locked for 15 minutes |
| **Auth** | Use expired Sanctum token | 401 Unauthorized |
| **Auth** | Access admin endpoint with rider token | 403 Forbidden |
| **Auth** | SQL injection in login email field | Input rejected, no DB error |
| **Auth** | XSS in profile name field | Input sanitized, no script execution |
| **API** | Access another user's ride data | 403 Forbidden |
| **API** | Upload 11MB KYC document | 413 Request Entity Too Large |
| **API** | Upload .exe file as KYC document | 422 Validation Error |
| **API** | POST to read-only endpoint | 405 Method Not Allowed |
| **Payment** | Webhook with invalid signature | 401 Unauthorized, no state change |
| **Payment** | Replay old webhook | Idempotent — no duplicate processing |
| **Socket** | Connect with expired token | Connection rejected |
| **Socket** | Join ride room you don't belong to | Room join rejected |
| **Data** | Query encrypted PII field with WHERE | Query returns no results (encrypted data) |
| **Integration** | PHBIMH request without HMAC signature | 401 Unauthorized |
| **Integration** | PHBIMH request with expired timestamp | 401 Unauthorized |

---

## 13. Phase 4 Security Gaps — Remediation Plan

### 13.1 Critical (P0) — Resolve Before Any Code

| ID | Gap | Remediation | Effort | Owner | Deadline |
|----|-----|-------------|--------|-------|----------|
| SG-01 | Firebase service account key in git | 1. Rotate key in Google Cloud Console. 2. Add to .gitignore. 3. Purge from git history with BFG. 4. Load from env var. | 2h | DevOps | Before Phase 6 |
| C-05 | Ride type enum misalignment | Decision: Phase 2 enum (standard/premium/minivan/pets/delivery) is authoritative. Update Phase 1 to match. | 0.5h | Architect | Before Phase 6 |

### 13.2 High (P1) — Resolve Before Phase 6 (Code Gatekeeper)

| ID | Gap | Remediation | Effort | Owner |
|----|-----|-------------|--------|-------|
| SG-02 | No rate limiting | Implement Laravel throttle middleware on all endpoint groups (see §4.3) | 4h | Backend |
| SG-03 | No RBAC | Configure Spatie roles + permissions (see §4.2), create missing policies (7 policies) | 8h | Backend |
| SG-04 | No CSRF protection | Enable Sanctum SPA CSRF on admin routes, verify `supports_credentials` | 2h | Backend |
| SG-05 | No input validation | Create FormRequest classes for all write endpoints (est. 25+ classes) | 16h | Backend |
| SG-06 | Debug info exposed | Set APP_DEBUG=false in production, implement Sentry error boundaries | 2h | DevOps |
| SG-07 | Missing HSTS | Add HSTS header to Nginx config (see §4.4) | 0.5h | DevOps |
| CG-01 | No POPIA consent capture | Implement consent capture flow during registration, populate consent_records | 8h | Backend + Mobile |
| CG-02 | No data subject request workflow | Implement admin panel for data export/deletion with 72h SLA tracking | 12h | Backend + Admin |
| CG-03 | No breach notification | Create breach notification playbook + automated alerting (see §11.3) | 4h | Security |
| CG-04 | No PCI-DSS SAQ-A | Verify PayFast/Ozow handle all card data, complete SAQ-A checklist | 4h | Security |
| CG-05 | No FICA verification | Implement FICA document collection + verification in KYC flow | 16h | Backend + Admin |
| CG-06 | No SARS tax reporting | Implement monthly tax statement generation for drivers | 8h | Backend |
| CG-07 | No data retention enforcement | Implement scheduled artisan jobs for data purging (see §6.3) | 8h | Backend |
| MF-01–MF-32 | 32 missing fields | Add columns to migrations (see Phase 4 §1.1) | 8h | Backend |
| MV-01–MV-15 | 15 missing validations | Add validation rules to FormRequest classes (see Phase 4 §1.2) | 4h | Backend |
| MW-01–MW-18 | 18 missing workflows | Implement missing workflows (see Phase 4 §2.1) | 24h | Backend + Mobile |
| ME-01–ME-20 | 20 missing edge cases | Add edge case handling (see Phase 4 §2.2) | 16h | Backend + Mobile |
| DT-01–DT-07 | 7 missing tables | Create migrations for: scheduled_rides, bank_accounts, user_documents, notification_templates, promo_code_redemptions, referral_redemptions, ride_feedback | 8h | Backend |
| DI-01–DI-10 | 10 missing indexes | Add indexes to migrations (see Phase 4 §6.2) | 2h | Backend |

### 13.3 Effort Summary

| Priority | Items | Estimated Effort |
|----------|-------|-----------------|
| P0 (Critical) | 2 items | 2.5h |
| P1 (High) | 19 categories | ~162h |
| **Total** | **21 categories** | **~164.5h** |

---

## 14. Compliance Verification Matrix

| ID | Requirement | Test Method | Frequency | Owner |
|----|-------------|-------------|-----------|-------|
| POPIA-01–04 | Consent management | Manual audit + automated check of consent_records | Quarterly | PM |
| POPIA-05–09 | Data subject rights | Automated test of data export/deletion endpoints + manual process review | Per sprint + annually | Tech Lead |
| POPIA-10–14 | Data protection | Automated encryption check + manual access control audit | Monthly | Tech Lead |
| POPIA-15–18 | Breach notification | Tabletop exercise + documented playbook test | Quarterly | Info Officer |
| FICA-01–05 | Driver verification | Automated doc validation + manual admin review audit | Per driver + monthly audit | Admin team |
| FICA-09–11 | Transaction monitoring | Automated flagging + manual review of flagged transactions | Daily (auto) + weekly (review) | Finance Admin |
| PCI-01–05 | Card data protection | SAQ A self-assessment + quarterly scan | Annually + quarterly | Tech Lead |
| PCI-12–15 | Security monitoring | Incident response drill + vulnerability scan | Quarterly + weekly | Tech Lead |
| TAX-01–05 | VAT compliance | Automated VAT calculation tests + quarterly review | Per transaction (auto) + quarterly (review) | Finance Admin |
| LAB-01–04 | Contractor classification | Legal review + documentation audit | Annually | Legal counsel |

---

## 15. Sign-Off

| Role | Name | Approved | Date | Notes |
|------|------|----------|------|-------|
| Lead Architect | _____________ | ☐ | ________ | |
| Security Engineer | _____________ | ☐ | ________ | |
| Compliance Officer | _____________ | ☐ | ________ | |
| Privacy Officer | _____________ | ☐ | ________ | |
| QA Lead | _____________ | ☐ | ________ | |

**Approval Criteria:**
- [ ] All trust boundaries documented with mitigations
- [ ] All 25 STRIDE threats documented with risk scores and remediations
- [ ] All security controls defined with implementation details
- [ ] All encryption requirements specified (8 PII fields)
- [ ] POPIA compliance requirements mapped to implementation
- [ ] FICA compliance requirements mapped to implementation
- [ ] PCI-DSS SAQ-A requirements verified
- [ ] SA Tax compliance requirements mapped
- [ ] SA Labour Law compliance requirements mapped
- [ ] Incident response plan documented with templates
- [ ] Security testing strategy defined
- [ ] Phase 4 remediation plan with effort estimates

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-08T20:30:00Z | Initial creation — STRIDE threat model (25 threats), 11 trust boundary crossings, 7 security control domains, 5 compliance frameworks, incident response plan, security testing strategy, Phase 4 remediation plan (~164.5h effort) |
