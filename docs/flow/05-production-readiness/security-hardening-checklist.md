# Security Hardening Checklist — EasyRyde

**Version:** 1.0.0
**Date:** 2026-07-02
**Status:** Pre-launch security audit
**Auditor:** CEO/CTO (Brutal Assessment)

---

## 1. Executive Summary

**Security Grade: F**

The system has 24 security issues: 4 critical, 10 high, 10 medium. The most dangerous: demo credentials in source code, no refresh token rotation, no certificate pinning, and hardcoded fare calculation. An attacker with basic skills could exploit these within minutes.

---

## 2. CRITICAL Findings (Fix Immediately)

### SEC-CRIT-001: Demo Credentials in Source Code
- **Location:** `01-rider/rider-user-flow.md:38-43`
- **Issue:** LoginScreen has pre-filled demo credentials (`rider@easyryde.com`)
- **CVSS:** 9.8 (Critical)
- **Impact:** Anyone can see and use demo credentials. Complete authentication bypass.
- **Fix:**
  1. Remove ALL hardcoded credentials from source code
  2. Use environment variables for test credentials
  3. Implement feature flags to disable demo mode in production
  4. Add CI check: `grep -r "easyryde.com" --include="*.tsx" --include="*.ts"`
- **Deadline:** Before launch
- **Verification:** Search codebase for any email/password strings

### SEC-CRIT-002: No Refresh Token Rotation
- **Location:** `04-cross-cutting/authentication-flow.md:278`
- **Issue:** Single long-lived token (7 days) with no rotation
- **CVSS:** 9.1 (Critical)
- **Impact:** Stolen token = 7 days of access. No way to revoke. Session hijacking trivial.
- **Fix:**
  1. Implement refresh token rotation
  2. Access token: 15-minute expiry
  3. Refresh token: 30-day expiry, rotated on use
  4. Store refresh tokens in httpOnly cookies (web) or SecureStore (mobile)
  5. Implement token family tracking (detect reuse)
- **Deadline:** Before launch
- **Verification:** Test token rotation, test revocation

### SEC-CRIT-003: No Certificate Pinning
- **Location:** `04-cross-cutting/authentication-flow.md:278`
- **Issue:** No certificate pinning on mobile apps
- **CVSS:** 8.5 (High)
- **Impact:** MITM attack can intercept tokens, payment data, location data
- **Fix:**
  1. Install `expo-ssl-pinning`
  2. Pin SHA-256 hash of production certificate
  3. Implement backup pins
  4. Handle pin mismatch with user-friendly error
- **Deadline:** Before launch
- **Verification:** Test with Charles Proxy, verify MITM blocked

### SEC-CRIT-004: Hardcoded Fare Calculation
- **Location:** `04-cross-cutting/payment-flow.md:294-298`
- **Issue:** `calculateFinalFare()` returns hardcoded `50.0`
- **CVSS:** 9.8 (Critical)
- **Impact:** Every ride charges R50 instead of actual fare. Financial ruin.
- **Fix:**
  1. Implement actual fare calculation
  2. Add unit tests for fare calculation
  3. Add integration tests with OSRM
  4. Monitor for hardcoded values in code review
- **Deadline:** Before launch
- **Verification:** Test 100 different routes, verify correct fares

---

## 3. HIGH Findings (Fix Within 1 Week)

### SEC-HIGH-001: No Circuit Breaker for External Services
- **Location:** `01-rider/rider-error-flow.md:264`
- **Issue:** Failed APIs keep being called. No circuit breaker.
- **CVSS:** 7.5 (High)
- **Impact:** Cascading failures when PayFast/Stripe is down. System hangs.
- **Fix:**
  1. Install `laravel-circuit-breaker` or implement custom
  2. 3 failures → open circuit → half-open after 30s
  3. Log circuit state changes
  4. Alert when circuit opens
- **Deadline:** Week 1

### SEC-HIGH-002: No Rate Limiting on Socket.IO
- **Location:** `04-cross-cutting/realtime-communication-flow.md:121-129`
- **Issue:** Location updates unrestricted. Chat: 30/min. Events: 60/min.
- **CVSS:** 7.0 (High)
- **Impact:** DoS via location flood. Spam via chat.
- **Fix:**
  1. Rate limit all Socket.IO events per connection
  2. Location: 12/min (every 5s)
  3. Chat: 10/min
  4. Events: 30/min
  5. Disconnect abusers
- **Deadline:** Week 1

### SEC-HIGH-003: SQL Injection Risk in Place Search
- **Location:** `01-rider/rider-user-flow.md:196`
- **Issue:** `'"; DROP TABLE--` edge case mentioned but not handled
- **CVSS:** 8.0 (High)
- **Impact:** Database compromise via search input
- **Fix:**
  1. Verify all queries use parameterized statements
  2. Add input validation at API boundary
  3. Sanitize search queries
  4. Add WAF rules for SQL patterns
- **Deadline:** Week 1

### SEC-HIGH-004: No IP-Based Rate Limiting
- **Location:** `04-cross-cutting/authentication-flow.md:281`
- **Issue:** Attacker can brute-force from different IPs
- **CVSS:** 7.0 (High)
- **Impact:** Account takeover via distributed brute force
- **Fix:**
  1. Rate limit by IP + email combination
  2. Use Redis for IP tracking
  3. Block IPs with >10 failed attempts
  4. Implement CAPTCHA after 3 failures
- **Deadline:** Week 1

### SEC-HIGH-005: No Session Management
- **Location:** `04-cross-cutting/authentication-flow.md:280`
- **Issue:** Can't see or revoke active sessions
- **CVSS:** 7.0 (High)
- **Impact:** Stolen token can't be revoked. No visibility into active sessions.
- **Fix:**
  1. Store session data (device, IP, timestamp)
  2. Add sessions screen in mobile app
  3. Add "Revoke All Sessions" endpoint
  4. Notify on new device login
- **Deadline:** Week 1

### SEC-HIGH-006: No Webhook Signature Verification for PayFast
- **Location:** `04-cross-cutting/payment-flow.md:154`
- **Issue:** PayFast ITN signature verification mentioned but not verified implemented
- **CVSS:** 8.0 (High)
- **Impact:** Attacker can fake payment confirmations
- **Fix:**
  1. Verify MD5 signature on every PayFast ITN
  2. Verify IP whitelist from PayFast
  3. Log verification failures
  4. Add monitoring for webhook failures
- **Deadline:** Week 1

### SEC-HIGH-007: No CORS Configuration Visible
- **Location:** `00-system-overview\system-architecture-flow.md:260-296`
- **Issue:** CORS configuration not documented. Risk of wildcard origins.
- **CVSS:** 6.5 (High)
- **Impact:** Cross-origin attacks, data theft
- **Fix:**
  1. Configure CORS to allow only known origins
  2. Never use `*` in production
  3. Document CORS policy
  4. Test with curl from different origins
- **Deadline:** Week 1

### SEC-HIGH-008: No Security Headers on Mobile
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** Certificate pinning missing, no mention of mobile security headers
- **CVSS:** 6.5 (High)
- **Impact:** MITM, data interception
- **Fix:**
  1. Implement certificate pinning
  2. Add network security config (Android)
  3. Add App Transport Security (iOS)
  4. Disable backup of sensitive data
- **Deadline:** Week 1

### SEC-HIGH-009: No Input Validation on Socket.IO Events
- **Location:** `04-cross-cutting/realtime-communication-flow.md:63-88`
- **Issue:** Socket events accept arbitrary payloads without validation
- **CVSS:** 7.5 (High)
- **Impact:** Injection attacks, data corruption
- **Fix:**
  1. Validate all Socket.IO event payloads with Zod/Joi
  2. Sanitize all string inputs
  3. Rate limit per event type
  4. Log invalid events
- **Deadline:** Week 1

### SEC-HIGH-010: No Logging of Security Events
- **Location:** Multiple files
- **Issue:** No audit trail for security-sensitive operations
- **CVSS:** 6.5 (High)
- **Impact:** Can't detect or investigate breaches
- **Fix:**
  1. Log all auth events (login, logout, failed attempts)
  2. Log all payment events
  3. Log all admin actions (already exists)
  4. Log all permission changes
  5. Send to centralized logging (Sentry)
- **Deadline:** Week 1

---

## 4. MEDIUM Findings (Fix Within 1 Month)

### SEC-MED-001: No Password Complexity Requirements
- **Location:** `04-cross-cutting/authentication-flow.md:61`
- **Issue:** Only `min 8` password requirement
- **Fix:** Require uppercase, lowercase, number, special char. Check against breached password list.

### SEC-MED-002: No Account Enumeration Prevention
- **Location:** `04-cross-cutting/authentication-flow.md:263`
- **Issue:** Different error messages for "invalid credentials" vs "account locked"
- **Fix:** Use generic "Invalid credentials" for all auth failures.

### SEC-MED-003: No CSRF Protection on Web Dashboard
- **Location:** `00-system-overview\system-architecture-flow.md:81`
- **Issue:** Web dashboard uses localStorage for tokens, no CSRF protection
- **Fix:** Implement CSRF tokens or use httpOnly cookies.

### SEC-MED-004: No Content Security Policy on Web
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** CSP not documented
- **Fix:** Implement strict CSP: `default-src 'self'; script-src 'self'`

### SEC-MED-005: No HSTS Header
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** HSTS not documented
- **Fix:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### SEC-MED-006: No X-Content-Type-Options
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** MIME sniffing protection not documented
- **Fix:** Add `X-Content-Type-Options: nosniff`

### SEC-MED-007: No X-Frame-Options
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** Clickjacking protection not documented
- **Fix:** Add `X-Frame-Options: DENY`

### SEC-MED-008: No Referrer-Policy
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** Referrer leakage not prevented
- **Fix:** Add `Referrer-Policy: strict-origin-when-cross-origin`

### SEC-MED-009: No Permissions-Policy
- **Location:** `00-system-overview\system-architecture-flow.md:268`
- **Issue:** Feature policy not set
- **Fix:** Add `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

### SEC-MED-010: No npm audit in CI
- **Location:** Multiple
- **Issue:** No automated dependency vulnerability scanning
- **Fix:** Add `npm audit --audit-level=high` to CI pipeline

---

## 5. Security Headers Checklist

### Nginx Configuration

```nginx
# Security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss://socket.easyryde.co.za https://api.easyryde.co.za" always;
add_header X-Permitted-Cross-Domain-Policies "none" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
```

### Mobile Security Config

```xml
<!-- Android: network_security_config.xml -->
<network-security-config>
    <domain-config>
        <domain includeSubdomains="true">api.easyryde.co.za</domain>
        <pin-set expiration="2027-01-01">
            <pin digest="SHA-256">BASE64_ENCODED_PIN_HERE</pin>
            <pin digest="SHA-256">BACKUP_PIN_HERE</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

```swift
// iOS: Info.plist
NSAppTransportSecurity
NSAllowsArbitraryLoads = false
NSPinnedDomains
  api.easyryde.co.za
    NSIncludesSubdomains = true
    NSPinnedLeafIdentities = [certificate-data]
```

---

## 6. Authentication Security

| Check | Status | Fix |
|-------|--------|-----|
| Passwords hashed with bcrypt | ✅ | None |
| Salt rounds >= 12 | ✅ | None |
| Token expiry <= 1 hour | ❌ | Implement refresh tokens |
| Token rotation on use | ❌ | Implement rotation |
| Session management | ❌ | Add session tracking |
| Brute-force protection | ✅ (partial) | Add IP-based limiting |
| Password reset expiry | Unknown | Verify 1 hour max |
| Email verification | Unknown | Implement if missing |
| 2FA for all users | ❌ (admin only) | Consider for all users |
| Password breach check | ❌ | Integrate with HaveIBeenPwned |

---

## 7. Authorization Security

| Check | Status | Fix |
|-------|--------|-----|
| RBAC on all endpoints | ✅ | None |
| Resource ownership check | Unknown | Verify on all endpoints |
| IDOR protection | Unknown | Test with different user IDs |
| Privilege escalation | Unknown | Test admin endpoints as rider |
| Tenant isolation | Documented, untested | Test multi-tenant isolation |
| API versioning | ✅ (`/api/v1/`) | None |

---

## 8. Data Protection Security

| Check | Status | Fix |
|-------|--------|-----|
| PII encrypted at rest | ✅ (encrypted fields) | None |
| HTTPS everywhere | ✅ | None |
| No secrets in code | ❌ (demo creds) | Remove all secrets |
| No secrets in git history | Unknown | Scan git history |
| Sensitive data in logs | Unknown | Audit logging practices |
| PCI compliance | Partial (Stripe) | Verify PayFast/Ozow |
| Data retention policy | Not implemented | Implement retention |
| Right to erasure | Implemented | Test thoroughly |

---

## 9. Infrastructure Security

| Check | Status | Fix |
|-------|--------|-----|
| Docker images from trusted source | Unknown | Verify base images |
| Container not running as root | Unknown | Verify Dockerfile |
| Database not exposed to internet | Unknown | Verify firewall |
| Redis not exposed to internet | Unknown | Verify firewall |
| SSH key-based auth only | Unknown | Verify server config |
| Regular security updates | Unknown | Set up auto-updates |
| Backup encryption | Unknown | Verify backups |
| Disaster recovery plan | Not implemented | Create runbook |

---

## 10. OWASP Top 10 2021 Mapping

| # | Vulnerability | Status | Evidence |
|---|--------------|--------|----------|
| A01 | Broken Access Control | PARTIAL | RBAC exists, IDOR untested |
| A02 | Cryptographic Failures | PARTIAL | HTTPS, but no cert pinning |
| A03 | Injection | PARTIAL | Parameterized queries, but search untested |
| A04 | Insecure Design | YES | Demo creds, no refresh rotation |
| A05 | Security Misconfiguration | YES | No security headers documented |
| A06 | Vulnerable Components | UNKNOWN | No npm audit in CI |
| A07 | Auth Failures | PARTIAL | Brute-force protection exists, but IP-based missing |
| A08 | Data Integrity Failures | PARTIAL | Webhook signatures not verified |
| A09 | Logging Failures | YES | No security event logging |
| A10 | SSRF | LOW | No user-controlled URLs visible |

---

## 11. Security Testing Plan

### 11.1 Automated Testing

```bash
# Dependency scanning
npm audit --audit-level=high
composer audit

# SAST (Static Analysis)
npm run lint
phpstan analyse

# Container scanning
trivy image easyryde-backend:latest
trivy image easyryde-socket:latest

# Secret scanning
trufflehog filesystem --directory=. --fail
gitleaks detect --source="."
```

### 11.2 Manual Testing

| Test | Method | Expected Result |
|------|--------|-----------------|
| SQL Injection | Inject SQL in all inputs | No database errors |
| XSS | Inject `<script>` in all inputs | No script execution |
| IDOR | Access other user's resources | 403 Forbidden |
| Privilege Escalation | Access admin endpoints as rider | 403 Forbidden |
| CSRF | Submit forms without token | 403 Forbidden |
| MITM | Intercept with Charles Proxy | Certificate pinning blocks |
| Brute Force | 100 login attempts | Account locked after 5 |
| Token Theft | Use stolen token | Refresh rotation invalidates |

---

## 12. Security Monitoring

| Event | Alert | Channel |
|-------|-------|---------|
| Failed login (5+) | Account lockout | Sentry + Email |
| Failed login (10+ per IP) | IP block | Sentry + Email |
| Webhook signature failure | Potential fraud | Sentry + SMS |
| Admin action | Audit log | Database |
| Payment anomaly | Financial review | Sentry + Email |
| Permission change | Security review | Sentry + Email |
| Data export | Compliance check | Sentry + Email |

---

## 13. Compliance Checklist

### POPIA

- [ ] Privacy policy published
- [ ] Cookie consent banner (web)
- [ ] Data processing agreement with all third parties
- [ ] Data breach notification process defined
- [ ] Data Protection Officer appointed (if required)
- [ ] Data retention policy documented
- [ ] Right to erasure tested
- [ ] Data export tested

### FICA

- [ ] KYC verification for drivers (ID, license, proof of address)
- [ ] KYC verification for riders (for wallet functionality)
- [ ] Transaction monitoring system
- [ ] Suspicious activity reporting process
- [ ] Record keeping (5 years minimum)

### PCI-DSS

- [ ] No card data stored on backend (✅)
- [ ] SSL/TLS everywhere (✅)
- [ ] Security headers configured (❌)
- [ ] Regular vulnerability scans
- [ ] Penetration testing annually

---

## 14. Remediation Timeline

| Phase | Timeframe | Items |
|-------|-----------|-------|
| **Phase 1: Critical** | Before launch | SEC-CRIT-001 to 004 |
| **Phase 2: High** | Week 1 | SEC-HIGH-001 to 010 |
| **Phase 3: Medium** | Month 1 | SEC-MED-001 to 010 |
| **Phase 4: Compliance** | Month 1-2 | POPIA, FICA, PCI items |
| **Phase 5: Hardening** | Month 2-3 | Advanced security measures |

**Total estimated effort:** 30-40 developer days
