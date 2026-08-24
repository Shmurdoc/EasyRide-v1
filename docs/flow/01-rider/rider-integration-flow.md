# Rider App — Integration Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Third-party service integrations used by the Rider App.

---

## 2. Integration Map

| Service | Purpose | Protocol | Authentication |
|---------|---------|----------|----------------|
| Google Maps (Places) | Destination search | REST API | API Key |
| Google Maps (Display) | Map rendering | SDK | API Key |
| PayFast | EFT payment | Redirect + ITN | Merchant ID/Key |
| Ozow | Instant EFT | Redirect + Webhook | Site Code/API Key |
| Stripe | Card payment | Payment Intent | Secret Key |
| Firebase (FCM) | Push notifications | HTTP v1 | Service Account |
| OSRM | Route calculation | REST API | None (free) |
| Nominatim | Geocoding | REST API | None (free) |
| Socket.IO | Real-time | WebSocket | Sanctum token |

---

## 3. Integration Flows

### 3.1 Google Maps Places Search

**Trigger:** User types in destination search bar
**Debounce:** 300ms
**Min chars:** 2

```
Rider App ──▶ GET /api/v1/places/search?q={query}
                    │
                    ▼
             Backend API
                    │
                    ▼
             Nominatim (OSM) ──▶ GET https://nominatim.openstreetmap.org/search
                    │                    ?q={query}
                    │                    &format=json
                    │                    &countrycodes=za
                    │                    &limit=5
                    │
                    ▼
             Response: [{ name, address, lat, lng }]
                    │
                    ▼
             Rider App displays results
```

**Note:** The backend uses Nominatim (OpenStreetMap) instead of Google Places API. This is free but less accurate.

**Error Handling:**
- Nominatim down → empty results, no error shown
- Rate limited (1 req/sec) → debounced requests help
- No results → "No places found" message

### 3.2 Google Maps Route Display

**Trigger:** Fare estimate request or ride tracking

```
Backend API ──▶ GET https://router.project-osrm.org/route/v1/driving/
                    {pickup_lng},{pickup_lat};{dropoff_lng},{dropoff_lat}
                    ?overview=full
                    &geometries=polyline
                    &steps=true
                    │
                    ▼
             Response: {
               distance: meters,
               duration: seconds,
               geometry: encoded_polyline
             }
                    │
                    ▼
             Backend calculates fare using distance/duration
             Returns polyline to client for map display
```

**Fallback:** If OSRM fails, Haversine straight-line distance is used.

### 3.3 PayFast Payment Redirect

**Trigger:** User selects PayFast payment method

```
Rider App ──▶ POST /api/v1/payments/stripe/create-intent
                    │  (misleading name - handles PayFast too)
                    ▼
             Backend generates PayFast URL
                    │
                    ▼
             Linking.openURL(payfast_url)
                    │
                    ▼
             ┌─────────────────────────────┐
             │  PayFast Payment Page        │
             │  (user completes EFT)        │
             └──────────────┬──────────────┘
                            │
                            ▼
             GET /api/v1/webhooks/payfast/return
                    │
                    ▼
             Rider App checks payment status
                    │
                    ▼
             Show success/failure message
```

**Webhook (server-side):**
```
PayFast ──▶ POST /api/v1/webhooks/payfast
             │  (ITN - Instant Transaction Notification)
             ▼
          Backend verifies MD5 signature
          Updates payment status
          Credits rider wallet
```

### 3.4 Ozow Payment Redirect

**Trigger:** User selects Ozow payment method

```
Rider App ──▶ POST /api/v1/payments/stripe/create-intent
                    │
                    ▼
             Backend generates Ozow payment request
             (HMAC-SHA256 signed)
                    │
                    ▼
             Linking.openURL(ozow_url)
                    │
                    ▼
             ┌─────────────────────────────┐
             │  Ozow Payment Page           │
             │  (user completes instant EFT)│
             └──────────────┬──────────────┘
                            │
                            ▼
             GET /api/v1/webhooks/ozow/return
                    │
                    ▼
             Rider App checks payment status
```

### 3.5 Stripe Card Payment

**Trigger:** User selects Stripe payment method

```
Rider App ──▶ POST /api/v1/payments/stripe/create-intent
                    │
                    ▼
             Backend creates Stripe PaymentIntent
             Returns client_secret
                    │
                    ▼
             Stripe SDK confirms payment
             (card details never touch backend)
                    │
                    ▼
             Rider App ──▶ POST /api/v1/payments/stripe/confirm
                    │
                    ▼
             Backend verifies with Stripe
             Updates payment status
```

### 3.6 Push Notifications (FCM)

**Trigger:** App launch, ride events

```
Rider App ──▶ Expo Notifications.getExpoPushTokenAsync()
                    │
                    ▼
             POST /api/v1/notifications/register-token
             { token, platform: "android"|"ios" }
                    │
                    ▼
             Backend stores in push_tokens table

--- Later, on ride events ---

Backend ──▶ FCM HTTP v1 API
             POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
             {
               message: {
                 token: "expo_push_token",
                 notification: { title, body },
                 data: { rideId, type }
               }
             }
                    │
                    ▼
             FCM delivers to device
             Rider App receives notification
```

---

## 4. Webhooks

| Event | Source | Target | Payload |
|-------|--------|--------|---------|
| PayFast ITN | PayFast servers | Backend `/webhooks/payfast` | Payment status, amount, signature |
| PayFast Return | Browser redirect | Backend `/webhooks/payfast/return` | Payment ID |
| Ozow webhook | Ozow servers | Backend `/webhooks/ozow` | Payment status, reference |
| Ozow Return | Browser redirect | Backend `/webhooks/ozow/return` | Payment ID |
| Stripe webhook | Stripe servers | Backend `/webhooks/stripe` | PaymentIntent events |

---

## 5. API Keys & Secrets

| Key | Service | Storage | Rotation |
|-----|---------|---------|----------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps | `.env` (client-side) | Manual |
| `STRIPE_SECRET_KEY` | Stripe | `.env` (server-side) | Manual |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `.env` (server-side) | Manual |
| `PAYFAST_MERCHANT_ID` | PayFast | `.env` (server-side) | Manual |
| `PAYFAST_MERCHANT_KEY` | PayFast | `.env` (server-side) | Manual |
| `PAYFAST_PASSPHRASE` | PayFast | `.env` (server-side) | Manual |
| `OZOW_SITE_CODE` | Ozow | `.env` (server-side) | Manual |
| `OZOW_API_KEY` | Ozow | `.env` (server-side) | Manual |
| `OZOW_PRIVATE_KEY` | Ozow | `.env` (server-side) | Manual |
| `FCM_SERVICE_ACCOUNT_PATH` | Firebase | `.env` (server-side) | Annual |

**Risk:** Google Maps API key is in client-side `.env` — visible in app bundle.

---

## 6. Rate Limits

| Service | Limit | Window | Throttle Action |
|---------|-------|--------|-----------------|
| Backend: ride-create | 10 | 1 minute | 429 Too Many Requests |
| Backend: ride-cancel | 5 | 1 minute | 429 Too Many Requests |
| Backend: payments | 10 | 1 minute | 429 Too Many Requests |
| Backend: wallet-deposit | 5 | 1 minute | 429 Too Many Requests |
| Backend: wallet-withdraw | 3 | 1 minute | 429 Too Many Requests |
| Backend: global | 60 | 1 minute | 429 Too Many Requests |
| Nominatim (OSM) | 1 | 1 second | Rate limit (free tier) |
| Google Maps | ~28,500 | 1 month | Quota exceeded |
| Socket.IO | 60 events | 1 minute | Event dropped |

---

## 7. Fallback Strategies

| Failure Scenario | Primary | Fallback | User Impact |
|------------------|---------|----------|-------------|
| Nominatim down | Places search | Empty results | Can't search destinations |
| OSRM down | Route calculation | Haversine estimate | Less accurate fare |
| Google Maps down | Map display | No map | Critical - app unusable |
| PayFast down | EFT payment | Use cash/wallet/Stripe | Payment option lost |
| Ozow down | Instant EFT | Use cash/wallet/Stripe | Payment option lost |
| Stripe down | Card payment | Use cash/wallet/EFT | Payment option lost |
| FCM down | Push notifications | In-app only | Delayed notifications |
| Socket.IO down | Real-time tracking | Polling fallback | Delayed tracking updates |
| Backend API down | All features | Error screen | Complete outage |

---

## 8. Monitoring

| Service | Health Check | Frequency | Alert |
|---------|-------------|-----------|-------|
| Backend API | `GET /health` | Every 30s | Sentry |
| Socket.IO | `GET /health` | Every 30s | Connection count |
| PayFast | ITN received | Per transaction | Sentry |
| Ozow | Webhook received | Per transaction | Sentry |
| Stripe | Webhook received | Per transaction | Sentry |
| FCM | Token registration | Per app launch | Log failure |
