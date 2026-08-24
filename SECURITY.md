# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, report it privately:

- **Email:** security@easyryde.co.za
- **Subject line:** `[SECURITY] <brief description>`
- **Include:** Steps to reproduce, affected endpoint/file, potential impact

Do **not** open public GitHub issues for security vulnerabilities.

We will acknowledge within 24 hours and provide a remediation timeline within 72 hours.

---

## Security Practices

### Authentication & Authorization

| Mechanism | Implementation |
|-----------|---------------|
| **User authentication** | Laravel Sanctum token-based auth |
| **Password hashing** | bcrypt via Laravel `hashed` cast on User model |
| **Rate limiting** | 5 login attempts/minute per IP; account lockout after 5 failures for 15 minutes |
| **Admin 2FA** | TOTP required for admin/super-admin sensitive operations |
| **Role-based access** | `role:admin\|super-admin`, `role:driver`, `role:rider` middleware on routes |
| **Policy classes** | Per-model authorization policies (RidePolicy, PaymentPolicy, WalletPolicy) |
| **Tenant isolation** | All queries scoped by `tenant_id`; cross-tenant access blocked |

### Data Protection

| Measure | Details |
|---------|---------|
| **PII encryption** | `EncryptsPii` trait on User model; email and phone encrypted at rest |
| **Hash columns** | Phone number and email have hash columns for lookups without decryption |
| **Session encryption** | `SESSION_ENCRYPT=true` in production |
| **Database** | PostgreSQL with encrypted connections; WAL archiving for point-in-time recovery |
| **File uploads** | KYC documents stored in `private` disk; MIME type and size validation enforced |

### Payment Security

| Control | Implementation |
|---------|---------------|
| **Webhook verification** | HMAC-SHA256 signature verification on PayFast ITN, Ozow, Stripe, and partner webhooks |
| **Webhook IP allowlisting** | PayFast (197.97.128.0/17), Ozow (published IPs), Stripe (published IPs) |
| **Idempotency** | Idempotency key on payments; unique constraint on `(ride_id, payment_method, status)` |
| **Double-charge prevention** | Wallet confirmation only via gateway webhooks (self-confirm endpoint removed) |
| **Fare integrity** | Server-side GPS-based fare calculation; client-submitted distance/duration rejected |
| **Velocity checks** | Rapid payment attempts blocked; fare deviation capped at ±20% |
| **Escrow** | Driver earnings held for 24 hours; manual payout blocked on disputed rides |

### Socket.IO Security

| Control | Implementation |
|---------|---------------|
| **Ride ownership** | All socket events validate sender is participant of the ride |
| **Per-event rate limits** | `join:ride` (10/min), `chat:send` (30/min), `ride:send-location` (30/min), etc. |
| **Input validation** | Type checks, string lengths, coordinate bounds, numeric validation on all payloads |
| **Audit logging** | Authorization failures logged with `[SECURITY]` prefix |
| **Ride state tracking** | Redis-based `ride:info:{rideId}` hash tracks participants and status |

### Infrastructure Security

| Control | Implementation |
|---------|---------------|
| **HTTPS** | Force HTTPS middleware; HSTS header (max-age=31536000; includeSubDomains; preload) |
| **Security headers** | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection: 1; mode=block |
| **CORS** | Restricted to known frontend origins; credentials mode enabled |
| **Secrets management** | `.env` files excluded from git; pre-commit hook blocks secret commits; CI secret scanner |
| **Firewall** | Only ports 80, 443, 22 open in production |
| **Redis** | Password authentication required; not exposed to public network |
| **Rate limiting** | Global 60/min per IP; per-endpoint limits on sensitive operations |

### Monitoring & Logging

| System | Coverage |
|--------|----------|
| **Sentry** | Backend + all 3 mobile apps; alert on new errors, >10 occurrences/hour, crash rate >0.1% |
| **Wallet audit log** | All balance modifications logged to `storage/logs/wallet-audit.log` (365-day retention) |
| **Admin audit log** | Admin actions logged with IP, user agent, and timestamp |
| **Security events** | Socket.IO authorization failures, webhook signature failures, TOTP attempts |
| **Structured logging** | All API responses logged with method, path, status, duration, user_id, trace_id |

---

## Compliance (POPIA)

EasyRyde processes personal information subject to the **Protection of Personal Information Act (POPIA)** of South Africa.

### Data Processing Principles

1. **Lawfulness** — Personal data processed only for specified, explicitly defined purposes (ride service, food delivery, payments).
2. **Minimization** — Only data necessary for the service is collected. No excessive profiling.
3. **Purpose limitation** — Data collected for ride-hailing is not repurposed without consent.
4. **Accuracy** — Users can update their profile data via the app. Admin can correct via the admin panel.
5. **Storage limitation** — Data retained only as long as necessary. KYC documents reviewed annually. Wallet transactions retained per financial regulations.
6. **Integrity & confidentiality** — PII encrypted at rest. Access controlled by RBAC and tenant isolation.
7. **Accountability** — Admin audit logging tracks all data access and modifications.

### User Rights

| Right | Implementation |
|-------|---------------|
| **Right to access** | Users can request data export via support channel |
| **Right to rectification** | Users can edit profile via the app |
| **Right to erasure** | Account deletion requests processed within 30 days; data anonymized in transaction history |
| **Right to object** | Users can opt out of marketing communications |
| **Right to data portability** | Data export available in JSON format on request |

### Data Inventory

| Data Category | Examples | Storage | Retention |
|--------------|----------|---------|-----------|
| **Identity** | Name, email, phone | PostgreSQL (encrypted) | Account lifetime |
| **Location** | GPS coordinates, ride routes | PostgreSQL (PostGIS) | 90 days |
| **Payment** | Card tokens, wallet balances | PostgreSQL (encrypted) | 7 years (financial) |
| **KYC** | SA ID, driver's license | Private disk (encrypted) | Account lifetime |
| **Usage** | Ride history, ratings | PostgreSQL | 2 years |
| **Communications** | Chat messages | Redis (temporary) / PostgreSQL | 30 days |

### Third-Party Processors

| Processor | Purpose | Data Shared | Location |
|-----------|---------|-------------|----------|
| **Stripe** | Card payments | Payment amounts, card tokens | USA (PCI DSS compliant) |
| **PayFast** | EFT payments | Payment amounts, reference IDs | South Africa |
| **Ozow** | Instant EFT | Payment amounts, reference IDs | South Africa |
| **Google Maps** | Geocoding, routing | Coordinates, addresses | USA |
| **Firebase** | Push notifications | Device tokens | USA |
| **Twilio** | SMS | Phone numbers | USA |
| **SendGrid** | Email | Email addresses | USA |
| **Sentry** | Error tracking | Error reports (no PII) | USA |

---

## Security Hardening Checklist

Before production deployment, verify all items:

```
SECRETS:
□ APP_KEY generated (base64: prefix)
□ DB_PASSWORD is 32+ characters
□ REDIS_PASSWORD is set
□ STRIPE_SECRET_KEY is live key
□ PAYFAST credentials are production
□ OZOW credentials are production
□ TWILIO credentials are production
□ GOOGLE_MAPS_API_KEY has billing enabled
□ No secrets in git history

APPLICATION:
□ APP_DEBUG=false in production
□ SESSION_ENCRYPT=true
□ Rate limiting on all endpoints
□ Webhook IP allowlisting active
□ CORS locked to production domains
□ Security headers present
□ Input validation on all endpoints
□ Authorization policies on all controllers

DATABASE:
□ All migrations run
□ PostGIS extension enabled
□ CHECK constraints on monetary columns
□ Automated backups configured
□ WAL archiving enabled

MONITORING:
□ Sentry capturing errors
□ Wallet audit log configured
□ Admin audit logging active
□ Health check endpoint verified
□ Uptime monitoring configured
```

---

*Last reviewed: 2026-07-19*
