# Rider App — Data Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

How data moves through the Rider App — from user input to server storage and back.

---

## 2. Data Sources

| Source | Type | Frequency | Volume |
|--------|------|-----------|--------|
| User input | Touch/keyboard | Per interaction | Small (text, taps) |
| GPS sensor | Expo Location | Per ride | ~50 bytes/update |
| REST API | HTTP JSON | Per action | 1-10 KB/response |
| Socket.IO | WebSocket | Real-time | 50-200 bytes/event |
| AsyncStorage | Local key-value | On read | 1-100 KB |
| SecureStore | Encrypted local | On auth | <1 KB |

---

## 3. Data Flow Diagrams

### 3.1 Authentication Data Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User Input  │────▶│  App State  │────▶│  API Call   │
│  (email/pw)  │     │  (useState) │     │  POST /auth │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  Server     │
                                         │  Validates  │
                                         │  Returns    │
                                         │  { user,    │
                                         │    token }  │
                                         └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  SecureStore │
                                         │  Token saved │
                                         └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  Context    │
                                         │  AuthProvider│
                                         │  user + token│
                                         └─────────────┘
```

### 3.2 Ride Booking Data Flow
```
┌──────────────┐
│  Destination  │──── "Where to?"
│  Search       │
└──────┬───────┘
       │
       ▼
┌──────────────┐    GET /places/search?q={query}
│  Debounce    │──── (300ms, min 2 chars)
│  (300ms)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Results     │──── User selects place
│  Display     │     { name, address, lat, lng }
└──────┬───────┘
       │
       ▼
┌──────────────┐    GET /rides/fare-estimate
│  Fare        │──── ?pickup={lat,lng}&dropoff={lat,lng}&category={cat}
│  Calculate   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Vehicle     │──── User selects category
│  Selection   │     (Economy/Standard/Premium/XL)
└──────┬───────┘
       │
       ▼
┌──────────────┐    POST /rides/
│  Create Ride │──── { pickup, dropoff, category, payment_method }
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Navigate to │
│  Tracking    │
└──────────────┘
```

### 3.3 Payment Data Flow
```
┌──────────────┐
│  Ride        │──── Ride completed
│  Complete    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Payment     │──── User selects method
│  Selection   │     (Cash/Wallet/PayFast/Ozow/Stripe)
└──────┬───────┘
       │
       ├── [Cash/Wallet] ──▶ POST /payments/rides/{id}/pay
       │                         │
       │                         ▼
       │                    ┌─────────────┐
       │                    │  Server     │
       │                    │  Process    │
       │                    │  Deduct     │
       │                    │  wallet/    │
       │                    │  record cash│
       │                    └──────┬──────┘
       │                           │
       │                           ▼
       │                    ┌─────────────┐
       │                    │  Success    │
       │                    │  Animation  │
       │                    └─────────────┘
       │
       ├── [Stripe] ──▶ POST /payments/stripe/create-intent
       │                     │
       │                     ▼
       │                ┌─────────────┐
       │                │  Client     │
       │                │  Secret     │
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐
       │                │  Stripe SDK │
       │                │  Confirm    │
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐
       │                │  POST       │
       │                │  /confirm   │
       │                └─────────────┘
       │
       └── [PayFast/Ozow] ──▶ Linking.openURL(redirect_url)
                                    │
                                    ▼
                               ┌─────────────┐
                               │  Browser    │
                               │  Payment    │
                               └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │  Return URL │
                               │  Check      │
                               │  status     │
                               └─────────────┘
```

---

## 4. Data Transformations

| Input | Transform | Output | Location |
|-------|-----------|--------|----------|
| Raw GPS coordinates | Format to `{lat, lng}` | API-compatible payload | App |
| Fare estimate response | Calculate distance from Haversine | Display: "2.3 km" | App |
| API ride object | Map to `RideState` type | Typed ride object | App |
| Socket event payload | Parse JSON, update state | Real-time map update | App |
| User profile | Store in React Context | Global access | App |
| Token | Encrypt + store in SecureStore | Secure persistence | Device |

---

## 5. Data Storage

### 5.1 Client-Side Storage

| Store | Purpose | Data | Encryption |
|-------|---------|------|-----------|
| SecureStore | Auth token | `er_xxxxx` (Sanctum token) | Yes (OS-level) |
| AsyncStorage | API cache | Ride history, wallet, config | No |
| AsyncStorage | Preferences | Theme, language | No |
| React Context | Active session | User object, token, auth state | No (in memory) |

### 5.2 Server-Side Storage

| Table | Purpose | Key Fields | Retention |
|-------|---------|------------|-----------|
| `users` | Rider accounts | id, name, email, phone, role | Until deletion |
| `rides` | Ride records | id, rider_id, driver_id, status, fare | Until deletion |
| `payments` | Payment records | id, ride_id, method, amount, status | Until deletion |
| `wallets` | Wallet balances | user_id, balance, currency | Until deletion |
| `wallet_transactions` | Transaction log | wallet_id, type, amount, reference | Until deletion |
| `food_orders` | Food delivery orders | id, restaurant_id, customer_id, status | Until deletion |
| `ratings` | Ride ratings | ride_id, rater_id, score, comment | Until deletion |
| `chat_messages` | In-ride chat | ride_id, sender_id, message | Until deletion |
| `consent_records` | POPIA consent | user_id, consent_type, granted_at | Permanent |

---

## 6. Data Validation

### 6.1 Client-Side Validation
| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Required, valid format | "Please fill in all fields" |
| Password | Required | "Please fill in all fields" |
| Destination search | Min 2 characters | No API call made |
| Vehicle selection | Required | Button disabled |
| Payment method | Required | "Select payment method" |
| Rating score | 1-5 stars | Required for submission |
| Chat message | Required, max 500 chars | "Message cannot be empty" |

### 6.2 Server-Side Validation (Form Requests)
| Endpoint | Request Class | Key Rules |
|----------|--------------|-----------|
| POST /auth/login | `LoginRequest` | email (required, email), password (required) |
| POST /rides/ | `RideCreateRequest` | pickup_lat/lng, dropoff_lat/lng, category |
| POST /rides/{id}/cancel | `RideCancelRequest` | cancellation_reason |
| POST /rides/{id}/rate | `RideRateRequest` | score (1-5), comment (nullable) |
| POST /payments/rides/{id}/pay | `ProcessPaymentRequest` | payment_method |
| POST /wallet/deposit | `WalletDepositRequest` | amount (min: 1) |
| POST /wallet/withdraw | `WalletWithdrawRequest` | amount (min: 1, max: balance) |
| POST /food/restaurants/{id}/order | `FoodOrderCreateRequest` | items[], delivery_address |

---

## 7. Data Privacy (POPIA)

| Data Type | Classification | Access Control | Retention |
|-----------|---------------|----------------|-----------|
| Name, email, phone | PII | Owner + Admin | Until deletion |
| GPS location | Sensitive PII | Owner + Driver (during ride) | Until ride completed |
| Payment method | Sensitive PII | Owner only | Until deletion |
| Ride history | Business data | Owner + Admin | Until deletion |
| Chat messages | Business data | Ride participants | Until ride completed |
| Device token (push) | Technical data | Server only | Until token invalidated |
| Consent records | Compliance data | Owner + Admin | Permanent |

---

## 8. Data Sync Patterns

| Pattern | Implementation | When |
|---------|---------------|------|
| Real-time push | Socket.IO | Ride tracking, chat, driver location |
| Pull (on-demand) | REST API GET | Ride history, wallet, profile |
| Pull (periodic) | Polling (not implemented) | N/A |
| Cache-first | AsyncStorage + 5min TTL | Ride history, config |
| Optimistic update | Not implemented | N/A |
| Offline queue | Not wired (exists in api-client) | N/A |
