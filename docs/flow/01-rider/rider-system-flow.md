# Rider App — System Flow Document

**Version:** 1.0.0
**Updated:** 2026-07-02

---

## 1. Overview

Technical architecture of the Rider App — API calls, socket events, state management, and component interactions.

---

## 2. System Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| App.tsx | React Navigation 6 | Root navigator, auth state |
| AuthProvider | React Context | Login/logout/token management |
| useSocket | Socket.IO Client | Real-time ride tracking, chat |
| useNotifications | Expo Notifications | Push token registration |
| useNetworkStatus | NetInfo | Online/offline detection |
| API Client | Axios + custom | REST API calls with caching |

---

## 3. API Endpoints Used

### 3.1 Authentication
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| POST | `/auth/login` | LoginScreen submit | `{ user, token }` |
| POST | `/auth/register` | RegisterScreen submit | `{ user, token }` |
| POST | `/auth/logout` | ProfileScreen logout | `{ message }` |
| GET | `/auth/me` | App launch (token refresh) | `{ user }` |
| POST | `/auth/forgot-password` | ForgotPasswordScreen | `{ message }` |
| POST | `/auth/reset-password` | Reset password link | `{ message }` |

### 3.2 Rides
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/rides/` | HomeScreen mount, Activity tab | `{ data: Ride[] }` |
| POST | `/rides/` | BookRideScreen "Request Ride" | `{ ride }` |
| GET | `/rides/current` | RideTrackingScreen mount | `{ ride }` |
| GET | `/rides/{id}` | RideDetailScreen mount | `{ ride }` |
| POST | `/rides/{id}/cancel` | RideTrackingScreen "Cancel" | `{ ride }` |
| POST | `/rides/{id}/rate` | RideTrackingScreen rating submit | `{ rating }` |
| POST | `/rides/{id}/apply-promo` | BookRideScreen promo apply | `{ discount }` |
| GET | `/rides/{id}/receipt` | RideDetailScreen receipt | PDF download |

### 3.3 Payments
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/payments/` | PaymentScreen mount | `{ data: Payment[] }` |
| GET | `/payments/methods` | PaymentScreen mount | `{ methods }` |
| POST | `/payments/rides/{id}/pay` | PaymentScreen "Pay" | `{ payment }` |
| POST | `/payments/stripe/create-intent` | Stripe payment | `{ clientSecret }` |
| POST | `/payments/stripe/confirm` | Stripe confirmation | `{ payment }` |

### 3.4 Wallet
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/wallet/` | WalletScreen mount | `{ wallet }` |
| GET | `/wallet/transactions` | WalletScreen mount | `{ data: Transaction[] }` |
| POST | `/wallet/deposit` | WalletScreen deposit | `{ transaction }` |
| POST | `/wallet/withdraw` | WalletScreen withdraw | `{ transaction }` |

### 3.5 Food Delivery
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/food/restaurants` | RestaurantListScreen mount | `{ data: Restaurant[] }` |
| GET | `/food/restaurants/{id}/menu` | RestaurantMenuScreen mount | `{ data: MenuItem[] }` |
| POST | `/food/restaurants/{id}/order` | FoodCheckoutScreen submit | `{ order }` |
| GET | `/food/orders/{id}` | FoodOrderTrackingScreen mount | `{ order }` |
| POST | `/food/orders/{id}/cancel` | FoodOrderTrackingScreen cancel | `{ order }` |

### 3.6 Places
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/places/search?q={query}` | BookRideScreen search (debounced) | `{ results }` |
| GET | `/places/reverse?lat&lng` | HomeScreen reverse geocode | `{ address }` |

### 3.7 Other
| Method | Endpoint | Trigger | Response |
|--------|----------|---------|----------|
| GET | `/config` | App launch | `{ categories, payment_methods }` |
| GET | `/ratings/` | RideHistoryScreen | `{ data: Rating[] }` |
| POST | `/notifications/register-token` | App launch | `{ success }` |
| GET | `/promo-codes/` | WalletScreen | `{ data: PromoCode[] }` |
| GET | `/referrals/my-code` | ProfileScreen | `{ code }` |
| POST | `/sos/` | SOS trigger | `{ alert }` |

---

## 4. Socket.IO Events

### 4.1 Events Emitted by Rider
| Event | Payload | Trigger |
|-------|---------|---------|
| `rider:book-ride` | `{ rideId, pickup, dropoff, category }` | Ride request |
| `ride:cancel` | `{ rideId }` | Cancel ride |
| `chat:send` | `{ rideId, message }` | Send chat message |
| `chat:typing` | `{ rideId }` | Typing indicator |
| `chat:stop-typing` | `{ rideId }` | Stop typing |

### 4.2 Events Received by Rider
| Event | Payload | Effect |
|-------|---------|--------|
| `ride:accepted` | `{ rideId, driver }` | Show driver on map |
| `ride:arrived` | `{ rideId }` | Status: "Driver arrived" |
| `ride:started` | `{ rideId }` | Status: "In progress" |
| `ride:completed` | `{ rideId }` | Navigate to rating |
| `ride:cancelled` | `{ rideId, reason }` | Alert, navigate home |
| `ride:location` | `{ lat, lng }` | Move driver marker |
| `chat:message` | `{ message, sender }` | Display in chat |

---

## 5. Component Architecture

```
App.tsx
├── ErrorBoundary
├── ThemeProvider
├── AuthProvider
│   ├── AuthStack (not authenticated)
│   │   ├── LoginScreen
│   │   ├── RegisterScreen
│   │   └── ForgotPasswordScreen
│   └── MainStack (authenticated)
│       ├── MainScreen (BottomTabs)
│       │   ├── HomeScreen
│       │   │   ├── MapView (react-native-maps)
│       │   │   ├── SearchBar
│       │   │   ├── SavedPlaces
│       │   │   └── CategoryPicker
│       │   ├── ActivityScreen (RideHistory)
│       │   └── ProfileScreen
│       ├── BookRideScreen
│       │   ├── LocationSearch
│       │   ├── VehiclePicker
│       │   ├── FareEstimate
│       │   └── PaymentMethodPicker
│       ├── RideTrackingScreen
│       │   ├── MapView (driver tracking)
│       │   ├── DriverInfoCard
│       │   └── ChatButton
│       ├── PaymentScreen
│       │   ├── FareBreakdown
│       │   └── PaymentMethodPicker
│       ├── RideDetailScreen
│       ├── ChatScreen
│       ├── WalletScreen
│       ├── RestaurantListScreen
│       ├── RestaurantMenuScreen
│       ├── FoodCheckoutScreen
│       └── FoodOrderTrackingScreen
```

---

## 6. Data Flow Diagrams

### 6.1 Ride Booking Data Flow
```
User Input → BookRideScreen
    │
    ├──▶ GET /places/search (destination search)
    │    Response: { results: [{ name, address, lat, lng }] }
    │
    ├──▶ GET /rides/fare-estimate (fare calculation)
    │    Response: { fare, distance, duration, surge_multiplier }
    │
    ├──▶ POST /promo-codes/validate (optional)
    │    Response: { discount_amount, discount_type }
    │
    └──▶ POST /rides/ (create ride)
         Response: { ride: { id, status, ... } }
         → Navigate to RideTrackingScreen
```

### 6.2 Real-Time Tracking Data Flow
```
Socket.IO Connection
    │
    ├──▶ rider:book-ride (emit)
    │    → Server broadcasts to nearby drivers
    │
    ├──◀ ride:accepted (receive)
    │    → Update map: show driver marker
    │    → Update status: "Driver on the way"
    │
    ├──◀ ride:location (receive, continuous)
    │    → Animate driver marker on map
    │    → Update ETA
    │
    ├──◀ ride:arrived (receive)
    │    → Update status: "Driver has arrived"
    │    → Show call/message buttons
    │
    ├──◀ ride:started (receive)
    │    → Update status: "Ride in progress"
    │    → Show progress bar
    │
    └──◀ ride:completed (receive)
         → Navigate to PaymentScreen
```

---

## 7. Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|-------------|
| API responses | AsyncStorage | 5 minutes | On mutation |
| Place search results | AsyncStorage | 5 minutes | On new search |
| Fare estimates | No cache | - | Always fresh |
| User profile | React Context | Session | On logout |
| Auth token | SecureStore | 7 days | On logout |
| Ride history | AsyncStorage | 5 minutes | On pull-to-refresh |

---

## 8. Offline Behavior

| Scenario | Current Behavior | Ideal Behavior |
|----------|-----------------|----------------|
| No network on app launch | Error screen | Show cached data |
| No network during booking | "Network error" alert | Queue request |
| No network during tracking | Socket disconnect banner | Show last known location |
| No network during payment | "Payment Failed" | Queue payment |
| Socket disconnect mid-ride | Auto-reconnect with backoff | Show reconnection banner |

**Note:** The `api-client` package has `offlineQueue.ts` and `storageCache.ts` but they are NOT wired into the rider app. This is a significant gap.

---

## 9. Performance Considerations

| Area | Current | Concern | Recommendation |
|------|---------|---------|----------------|
| Map rendering | `react-native-maps` | Smooth on modern devices | Test on low-end devices |
| List rendering | FlatList | Good for ride history | Verify `getItemLayout` |
| Image loading | Direct URI | No caching | Add `Image` caching |
| API calls | Sequential | Slow on slow network | Parallel where possible |
| Socket reconnection | Exponential backoff | Good | Verify max retries |
| Bundle size | No code splitting | All screens loaded eagerly | Lazy load rarely-used screens |
