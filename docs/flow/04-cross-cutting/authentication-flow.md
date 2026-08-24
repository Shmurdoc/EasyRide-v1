# Authentication Flow — EasyRyde

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Authentication across all EasyRyde apps. Laravel Sanctum token-based auth with role-based access control (Spatie Permission), TOTP 2FA for admins, and social auth (Google, Apple).

---

## 2. Authentication Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT LAYER                        │
├──────────────┬──────────────┬────────────────────────┤
│  Rider App   │  Driver App  │  Admin App / Web       │
│              │              │                        │
│  SecureStore │  SecureStore │  localStorage          │
│  (token)     │  (token)     │  (token + user)        │
└──────┬───────┴──────┬───────┴────────────┬───────────┘
       │              │                    │
       └──────────────┼────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Laravel API     │
            │  /api/v1/auth/*  │
            └────────┬─────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  ┌─────────┐  ┌──────────┐  ┌──────────┐
  │ Sanctum │  │  Spatie  │  │  TOTP    │
  │ Tokens  │  │  RBAC    │  │  2FA     │
  └─────────┘  └──────────┘  └──────────┘
```

---

## 3. Auth Flows

### 3.1 Registration Flow

```
User opens RegisterScreen
    │
    ├──▶ Enter: name, email, phone, password, confirm_password
    │
    ├──▶ POST /auth/register
    │    { name, email, phone_number, password, password_confirmation }
    │
    ├──▶ Server validates (RegisterRequest):
    │    ├── name: required, string, max 255
    │    ├── email: required, email, unique:users
    │    ├── phone_number: required, string
    │    ├── password: required, min 8, confirmed
    │    └── password_confirmation: required, must match
    │
    ├──▶ Server creates user:
    │    ├── Hash password (bcrypt, 12 rounds)
    │    ├── Assign "rider" role (default)
    │    ├── Create Sanctum personal access token
    │    └── Create wallet with 0 balance
    │
    ├──▶ Response: { user, token }
    │
    ├──▶ Client stores token in SecureStore
    │
    └──▶ Navigate to HomeScreen
```

### 3.2 Login Flow

```
User opens LoginScreen
    │
    ├──▶ Enter email + password
    │
    ├──▶ POST /auth/login
    │    { email, password }
    │
    ├──▶ Server validates (LoginRequest):
    │    ├── email: required, email
    │    └── password: required
    │
    ├──▶ Server authenticates:
    │    ├── Find user by email
    │    ├── Check if account is locked (failed_attempts >= 5)
    │    │   └── Locked → 429 "Account locked. Try again in 15 minutes."
    │    ├── Verify password (Hash::check)
    │    │   └── Invalid → Increment failed_attempts
    │    │                If failed_attempts >= 5 → Lock account for 15 min
    │    │                Return 401 "Invalid credentials"
    │    ├── Reset failed_attempts on success
    │    ├── Create Sanctum token
    │    └── Return { user, token }
    │
    ├──▶ Client stores token in SecureStore
    │
    └──▶ Navigate to role-specific home screen
```

### 3.3 Token Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  Token Lifecycle                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Created: POST /auth/login or /auth/register        │
│  ├── Token stored in SecureStore (mobile)           │
│  │   or localStorage (web)                          │
│  ├── Token prefix: "er_"                            │
│  └── Expiration: 10,080 minutes (7 days)           │
│                                                      │
│  Used: Every API request                            │
│  ├── Header: Authorization: Bearer er_xxxxx         │
│  └── Sanctum validates token on each request        │
│                                                      │
│  Refreshed: On app launch                           │
│  ├── GET /auth/me (uses existing token)             │
│  ├── If valid → user data refreshed                 │
│  └── If invalid → redirect to login                 │
│                                                      │
│  Destroyed: POST /auth/logout                       │
│  ├── Server revokes token                           │
│  └── Client clears SecureStore/localStorage         │
│                                                      │
│  Auto-destroyed: On 401 response                    │
│  ├── Axios interceptor catches 401                  │
│  ├── Clears stored token                            │
│  └── Redirects to login screen                      │
│                                                      │
│  Expired: After 7 days                              │
│  ├── Next API call returns 401                      │
│  └── Same as auto-destroy flow                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3.4 Social Auth Flow

```
User taps "Continue with Google"
    │
    ├──▶ GET /auth/google/redirect
    │    → Redirects to Google OAuth consent screen
    │
    ├──▶ User approves access
    │
    ├──▶ GET /auth/google/callback
    │    → Backend receives authorization code
    │
    ├──▶ Backend exchanges code for tokens
    │
    ├──▶ Backend finds/creates user:
    │    ├── User exists → Login
    │    └── User doesn't exist → Register with Google data
    │
    ├──▶ Create Sanctum token
    │
    └──▶ Redirect to app with token
```

---

## 4. Role-Based Access Control

### 4.1 Roles

| Role | Description | Access |
|------|-------------|--------|
| `rider` | End consumer | Book rides, pay, chat, food delivery |
| `driver` | Approved driver | Accept rides, earn, deliver food |
| `admin` | Platform operator | Manage drivers/users/settings |
| `super-admin` | Highest privilege | Everything + manage admins |

### 4.2 Middleware

| Middleware | Applied To | Behavior |
|-----------|-----------|----------|
| `auth:sanctum` | All protected routes | Validates Sanctum token |
| `role:driver` | Driver-specific endpoints | Rejects non-driver users |
| `role:admin\|super-admin` | Admin endpoints | Rejects non-admin users |
| `admin.totp` | Sensitive admin ops | Requires X-Totp-Code header |
| `throttle:*` | Rate-limited endpoints | Blocks after threshold |

### 4.3 Endpoint Access Matrix

| Endpoint | Rider | Driver | Admin | Super Admin |
|----------|-------|--------|-------|-------------|
| POST /rides/ | YES | NO | NO | NO |
| POST /rides/{id}/driver-accept | NO | YES | NO | NO |
| POST /drivers/toggle-online | NO | YES | NO | NO |
| GET /admin/dashboard | NO | NO | YES | YES |
| POST /admin/drivers/{id}/approve | NO | NO | YES | YES |
| POST /admin/settings | NO | NO | YES | YES |
| POST /admin/totp/enable | NO | NO | YES | YES |

---

## 5. Account Security

### 5.1 Brute-Force Protection

```
Failed login attempt
    │
    ├──▶ Increment user.failed_attempts
    │
    ├──▶ If failed_attempts >= 5:
    │    ├── Set user.locked_until = now + 15 minutes
    │    └── Return 429 "Account locked"
    │
    └──▶ If failed_attempts < 5:
         └── Return 401 "Invalid credentials"

Successful login
    │
    └──▶ Reset user.failed_attempts = 0
         Reset user.locked_until = null
```

### 5.2 Password Hashing

- Algorithm: Bcrypt
- Cost: 12 rounds
- Auto-rehash on login if cost changes

### 5.3 TOTP 2FA (Admin Only)

- Library: Google2FA
- Secret storage: Encrypted in `users.totp_secret`
- Code reuse prevention: Redis key with 60s TTL
- Header: `X-Totp-Code`
- Required for: All admin write operations

---

## 6. Multi-Tenancy

```
TenantMiddleware
    │
    ├──▶ Extracts tenant_id from authenticated user
    │
    ├──▶ Sets tenant_id on request
    │
    └──▶ All queries scoped to tenant
         (via global scope or manual filtering)
```

---

## 7. Error Codes

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| INVALID_CREDENTIALS | 401 | Wrong email/password | "Invalid credentials" |
| ACCOUNT_LOCKED | 429 | Too many failed attempts | "Account locked. Try again in 15 minutes." |
| UNAUTHENTICATED | 401 | No/invalid token | "Please login again" |
| FORBIDDEN | 403 | Insufficient permissions | "Access denied" |
| TOTP_REQUIRED | 403 | TOTP code missing | "2FA verification required" |
| TOTP_INVALID | 403 | Wrong TOTP code | "Invalid 2FA code" |
| VALIDATION_ERROR | 422 | Input validation failed | Field-level errors |
| RATE_LIMITED | 429 | Too many requests | "Too many requests. Please wait." |

---

## 8. Security Considerations

1. **Token in SecureStore** — OS-level encryption on both iOS and Android
2. **No refresh tokens** — Single long-lived token (7 days), no rotation
3. **No certificate pinning** — MITM risk on production
4. **Demo credentials in source** — Hardcoded in LoginScreen (HIGH risk)
5. **No session management** — Can't see/revoke active sessions
6. **IP-unaware lockout** — Attacker can enumerate from different IPs
