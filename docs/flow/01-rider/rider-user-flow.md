# Rider App — User Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02
**Screens:** 16
**App:** `mobile/apps/rider`

---

## 1. Overview

The Rider App is the primary revenue-generating application. Riders book rides, order food, make payments, and communicate with drivers. Target market: Phalaborwa, Limpopo, South Africa.

---

## 2. Actors

| Actor | Role | Access Level |
|-------|------|-------------|
| Rider (authenticated) | Ride booker, food orderer | Full access to booking, payment, history |
| Guest (unauthenticated) | Potential rider | Login/Register only (guest mode unimplemented) |

---

## 3. Complete Screen Flow

### 3.1 Authentication Flow

```
┌──────────────────┐
│  App Launch       │
│  (Splash/Loading) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Role Selector    │────▶│  Login Screen     │
│  (Rider/Driver/   │     │  [Pre-filled:     │
│   Admin)          │     │   rider@easyryde  │
│                   │     │   .com]           │
│  [Rider] ────────▶│     │                  │
└──────────────────┘     │  Email: _________  │
                          │  Password: ______ │
                          │                   │
                          │  [Sign In]        │
                          │  [Forgot Password?]│
                          │  [Sign Up]        │
                          │  [Continue Guest] │ ← NO HANDLER
                          └────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌──────────┐  ┌──────────┐  ┌──────────┐
             │ Home     │  │ Register │  │ Forgot   │
             │ Screen   │  │ Screen   │  │ Password │
             │ (Auth'd) │  │          │  │ Screen   │
             └──────────┘  └──────────┘  └──────────┘
```

**Login Screen Details:**
- Email input (pre-filled with demo creds in dev)
- Password input (pre-filled with demo creds in dev)
- Sign In button → `POST /auth/login`
- "Continue as Guest" button → **NO HANDLER IMPLEMENTED** (click does nothing)
- "Forgot Password?" → ForgotPasswordScreen
- "Sign Up" → RegisterScreen
- Quick Demo Login (DEV only) → auto-fills + triggers login

**Validation Rules:**
| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Required, valid format | "Please fill in all fields" |
| Password | Required, min 1 char | "Please fill in all fields" |
| Credentials | Server validates | "Login Failed" with server message |

**Edge Cases:**
- Special characters in email: `'"; DROP TABLE--` → should be sanitized
- Extremely long input strings → no visible max length
- Concurrent login on multiple devices → token is user-specific, old token may still work
- Token refresh during active session → auto-refresh on app open

---

### 3.2 Home Screen (Map View)

```
┌──────────────────────────────────────────┐
│  HomeScreen                               │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │         Google Map View              │ │
│  │    (Current location marker)         │ │
│  │    (Saved places pins)              │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  "Where to?" search bar              │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Saved Places:                       │ │
│  │  🏠 Home    🏢 Work    ✈ Airport    │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Ride Categories:                    │ │
│  │  [Economy] [Standard] [Premium] [XL] │ │
│  └──────────────────────────────────────┘ │
│                                          │
├──────────────────────────────────────────┤
│  [🏠 Home]  [📋 Activity]  [👤 Profile] │
└──────────────────────────────────────────┘
```

**Data Loaded on Mount:**
- User location (Expo Location) → falls back to Phalaborwa center (-23.9, 29.46)
- Recent rides from `GET /rides/`
- Saved places (hardcoded in component)
- Ride categories from `GET /config`

**Actions:**
| Action | Trigger | Destination |
|--------|---------|-------------|
| Tap "Where to?" | Search bar tap | BookRideScreen |
| Tap saved place | Home/Work/Airport tap | BookRideScreen (pre-filled) |
| Tap ride category | Category card tap | Updates fare estimate |
| Tap Activity tab | Bottom tab | RideHistoryScreen |
| Tap Profile tab | Bottom tab | ProfileScreen |

---

### 3.3 Ride Booking Flow (BookRideScreen)

```
┌──────────────────────────────────────────┐
│  BookRideScreen                           │
├──────────────────────────────────────────┤
│  Step 1: Location Selection               │
│  ┌──────────────────────────────────────┐ │
│  │  Pickup: [Current Location] 📍       │ │
│  │  Dropoff: [Search destination...]    │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Search Results (API: /places/search)     │
│  ┌──────────────────────────────────────┐ │
│  │  Result 1: Place Name, Address       │ │
│  │  Result 2: Place Name, Address       │ │
│  │  Result 3: Place Name, Address       │ │
│  └──────────────────────────────────────┘ │
│                                          │
├──────────────────────────────────────────┤
│  Step 2: Vehicle Selection                │
│  ┌──────────────────────────────────────┐ │
│  │  ┌─────────┐ ┌─────────┐            │ │
│  │  │ Economy │ │ Standard│            │ │
│  │  │ R25 base│ │ R35 base│            │ │
│  │  │ R12/km  │ │ R15/km  │            │ │
│  │  └─────────┘ └─────────┘            │ │
│  │  ┌─────────┐ ┌─────────┐            │ │
│  │  │ Premium │ │   XL    │            │ │
│  │  │ R55 base│ │ R55 base│            │ │
│  │  │ R22/km  │ │ R22/km  │            │ │
│  │  └─────────┘ └─────────┘            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Fare Estimate: R45.00                   │
│  Distance: 2.3 km | ETA: 8 min          │
│                                          │
│  Promo Code: [EASY20] [Apply]            │
│                                          │
│  [Confirm Ride] ← disabled if no vehicle │
├──────────────────────────────────────────┤
│  Step 3: Payment Method                   │
│  ┌──────────────────────────────────────┐ │
│  │  ○ Cash                              │ │
│  │  ○ Wallet (Balance: R250.00)         │ │
│  │  ○ PayFast (EFT)                     │ │
│  │  ○ Ozow (Instant EFT)                │ │
│  │  ○ Stripe (Card)                     │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  [Request Ride]                           │
└──────────────────────────────────────────┘
```

**Booking State Machine:**
```
IDLE → SELECTING_LOCATION → SELECTING_VEHICLE → SELECTING_PAYMENT → REQUESTING → TRACKING
  │                                                                       │
  └───────────────────── [Back at any step] ◄─────────────────────────────┘
```

**API Calls During Booking:**
1. `GET /places/search?q={query}` — destination search (debounced 300ms, min 2 chars)
2. `GET /rides/fare-estimate?pickup&dropoff&category` — fare estimate
3. `POST /promo-codes/validate` — promo code validation (if applied)
4. `POST /rides/` — create ride request

**Validation Rules:**
| Field | Rule | Error Message |
|-------|------|---------------|
| Pickup | Required, valid lat/lng | "Pickup location required" |
| Dropoff | Required, different from pickup | "Dropoff must differ from pickup" |
| Vehicle | Required | Button disabled |
| Payment | Required | "Select payment method" |
| Promo | Optional, valid code | "Invalid promo code" |

**Edge Cases:**
- Same pickup and dropoff → should prevent booking (zero distance)
- Fare estimate API fails → falls back to base price from vehicle option
- Promo code hardcoded as "EASY20" with fixed R15 discount → no server validation visible
- Rapid destination changes → debounce handles, final selection wins
- Saved places generate random lat/lng offsets → `Math.random()` in code

---

### 3.4 Ride Tracking Flow (RideTrackingScreen)

```
┌──────────────────────────────────────────┐
│  RideTrackingScreen                       │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │                                      │ │
│  │         Google Map View              │ │
│  │  ┌────────────────────────────────┐  │ │
│  │  │ 📍 Pickup marker               │  │ │
│  │  │ 📍 Dropoff marker              │  │ │
│  │  │ 🚗 Driver marker (animated)    │  │ │
│  │  │ ═══ Route polyline             │  │ │
│  │  └────────────────────────────────┘  │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Status: "Searching for driver..."       │
│  OR "Driver is on the way"               │
│  OR "Driver has arrived"                 │
│  OR "Ride in progress"                   │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Driver Info:                        │ │
│  │  [Avatar] John D. ★4.8              │ │
│  │  ABC 123 GP • White Toyota Corolla   │ │
│  │                                      │ │
│  │  [📞 Call]  [💬 Message]            │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  [Cancel Ride] ← only before acceptance  │
├──────────────────────────────────────────┤
│  Ride States:                             │
│  searching → accepted → arrived →         │
│  in_progress → completed                  │
└──────────────────────────────────────────┘
```

**Real-Time Events (Socket.IO):**
| Event | Direction | Effect |
|-------|-----------|--------|
| `ride:accepted` | Server → Client | Driver marker appears, status updates |
| `ride:arrived` | Server → Client | Status: "Driver has arrived" |
| `ride:started` | Server → Client | Status: "Ride in progress", progress bar |
| `ride:completed` | Server → Client | Navigate to Rating |
| `ride:cancelled` | Server → Client | Alert, navigate to Home |
| `ride:location` | Server → Client | Driver marker moves on map |

**API Calls:**
1. `GET /rides/{rideId}` — ride details
2. `POST /rides/{rideId}/cancel` — cancel ride
3. `POST /rides/{rideId}/rate` — submit rating
4. `POST /rides/{rideId}/apply-promo` — apply promo code

**Edge Cases:**
- Socket disconnection during ride → reconnection banner, auto-retry
- Driver goes offline during ride → handle gracefully
- Multiple rapid state changes → state transitions must remain consistent
- Phone call during active ride → app handles interruption
- App backgrounded → location tracking continues
- Invalid rideId → error state with retry

---

### 3.5 Payment Flow (PaymentScreen)

```
┌──────────────────────────────────────────┐
│  PaymentScreen                            │
├──────────────────────────────────────────┤
│  Ride Summary:                            │
│  ┌──────────────────────────────────────┐ │
│  │  Pickup: 123 Main St                │ │
│  │  Dropoff: 456 Oak Ave               │ │
│  │  Distance: 2.3 km                   │ │
│  │  Duration: 12 min                   │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Fare Breakdown:                          │
│  ┌──────────────────────────────────────┐ │
│  │  Base fare:          R35.00         │ │
│  │  Distance (2.3km):   R27.60         │ │
│  │  Time (12min):       R36.00         │ │
│  │  Service fee:        R10.00         │ │
│  │  Surge (1.2x):       +R14.88        │ │
│  │  Discount (EASY20):  -R15.00        │ │
│  │  ──────────────────────────         │ │
│  │  Total:              R108.48        │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Payment Method:                          │
│  ┌──────────────────────────────────────┐ │
│  │  ○ Cash         ○ Wallet            │ │
│  │  ○ PayFast      ○ Ozow              │ │
│  │  ○ Stripe                          │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  [Pay R108.48]                            │
└──────────────────────────────────────────┘
```

**Payment Processing:**
| Method | Flow | Redirect? |
|--------|------|-----------|
| Cash | `POST /payments/rides/{ride}/pay` → Success | No |
| Wallet | `POST /payments/rides/{ride}/pay` → Deduct balance | No |
| PayFast | `POST /payments/stripe/create-intent` → Open browser | Yes |
| Ozow | `POST /payments/stripe/create-intent` → Open browser | Yes |
| Stripe | `POST /payments/stripe/create-intent` → Confirm | No |

**Edge Cases:**
- Insufficient wallet balance → error message
- Payment API failure → "Payment Failed" alert
- Double-tap on Pay button → single payment (idempotency key)
- Return from browser redirect → status checked
- Fare calculation: zero distance → service fee still applies
- Empty rideId in navigation → **BUG: `rideId: ''` passed from BookRideScreen**

---

### 3.6 Food Delivery Flow

```
┌──────────────────────────────────────────┐
│  RestaurantListScreen                     │
├──────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐ │
│  │  [Restaurant Image]                 │ │
│  │  Joe's Pizza                         │ │
│  │  ★4.2 • Italian • R50 min delivery  │ │
│  │  Min order: R50 | Delivery: R25      │ │
│  └──────────────────────────────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │  [Restaurant Image]                 │ │
│  │  Burger Palace                       │ │
│  │  ★4.5 • Fast Food • R30 min         │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  RestaurantMenuScreen                     │
├──────────────────────────────────────────┤
│  Menu Categories: [All] [Mains] [Sides]  │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  Margherita Pizza        R89.00     │ │
│  │  [Add to Cart +]                     │ │
│  ├──────────────────────────────────────┤ │
│  │  Pepperoni Pizza          R99.00     │ │
│  │  [Add to Cart +]                     │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Cart: 2 items | Total: R188.00          │
│  [View Cart →]                           │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  FoodCheckoutScreen                       │
├──────────────────────────────────────────┤
│  Order Summary:                           │
│  Margherita Pizza x1         R89.00      │
│  Pepperoni Pizza x1          R99.00      │
│  Delivery fee                R25.00      │
│  ───────────────────────────             │
│  Total:                     R213.00      │
│                                          │
│  Delivery Address: [Address input]       │
│  Payment: [Cash] [Wallet] [Stripe]       │
│                                          │
│  [Place Order]                            │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  FoodOrderTrackingScreen                  │
├──────────────────────────────────────────┤
│  Order #1234                             │
│  Status: Preparing...                    │
│                                          │
│  ┌──────────────────────────────────────┐ │
│  │  [Map with delivery tracking]        │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Estimated delivery: 35 min              │
└──────────────────────────────────────────┘
```

**Food Order API Calls:**
1. `GET /food/restaurants` — list restaurants
2. `GET /food/restaurants/{id}/menu` — restaurant menu
3. `POST /food/restaurants/{id}/order` — create order
4. `GET /food/orders/{id}` — track order
5. `POST /food/orders/{id}/cancel` — cancel order
6. `POST /food/orders/{id}/rate` — rate delivery

---

### 3.7 Other Screens

**RideHistoryScreen:** List of past rides with status, date, fare. Tap → RideDetailScreen.

**RideDetailScreen:** Full ride info, receipt, route map, rating, chat link.

**ChatScreen:** In-ride messaging with driver. Messages via Socket.IO `chat:send`/`chat:message`.

**WalletScreen:** Balance display, deposit/withdraw forms, transaction history.

**ProfileScreen:** User info, edit profile, logout.

**RegisterScreen:** Name, email, phone, password, confirm password → `POST /auth/register`.

**ForgotPasswordScreen:** Email input → `POST /auth/forgot-password` → email with reset link.

---

## 4. Navigation Structure

```
AuthStack (not authenticated)
├── Login
├── ForgotPassword
└── Register

MainStack (authenticated)
├── Main (BottomTabs)
│   ├── Home (map, ride booking)
│   ├── Activity (ride history)
│   └── Profile (account)
├── BookRide
├── RideTracking
├── Payment
├── RideHistory
├── RideDetail
├── Chat
├── Wallet
├── RestaurantList
├── RestaurantMenu
├── FoodCheckout
└── FoodOrderTracking
```

---

## 5. State Management

| State | Storage | Scope |
|-------|---------|-------|
| Auth (user, token) | React Context (`AuthProvider`) | Global |
| Theme (dark/light) | React Context (`ThemeProvider`) | Global |
| Socket connection | Custom hook (`useSocket`) | Global |
| Screen data | Local `useState` | Per-screen |
| Navigation | React Navigation | Global |
| API cache | AsyncStorage (5min TTL) | Global |
| Offline queue | AsyncStorage (in api-client) | Global (unused) |

---

## 6. Security Considerations

- Token stored in `expo-secure-store` (encrypted)
- Auto-logout on 401 response
- Role-based access: rider cannot access driver/admin endpoints
- Rate limiting on auth endpoints (throttle:auth-login)
- Rate limiting on ride creation (throttle:ride-create: 10/min)
- Rate limiting on ride cancellation (throttle:ride-cancel: 5/min)

---

## 7. Compliance (POPIA)

- User consent granted during registration
- Data export available via `GET /data/export`
- Account anonymization via `POST /data/anonymize`
- Data erasure via `DELETE /data/erasure`
- Location data collected only during active rides
- Payment data handled by PCI-compliant gateways (Stripe, PayFast, Ozow)
