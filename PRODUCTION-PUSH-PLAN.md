# EASYRYDE PRODUCTION PUSH PLAN
## Brute Force Readiness Assessment & Execution Blueprint

**Date:** 2026-07-19
**Status:** ACTIVE
**Severity:** CRITICAL — Multiple P0 blockers identified
**Target:** Production-ready ride-hailing platform for Phalaborwa, Limpopo

---

## EXECUTIVE VERDICT

**EasyRyde is NOT production-ready.** It has a solid foundation (41 models, 50 services, 170+ routes, 3 mobile apps) but critical gaps that will cause crashes, security breaches, data loss, and user abandonment if deployed as-is.

### Current State Scorecard

| Area | Score | Status | Verdict |
|------|-------|--------|---------|
| Backend API | 75% | Routes exist, controllers implemented | Needs security hardening |
| Backend Tests | 65% | 33 feature + 29 unit + 1 security | Missing 40% of critical paths |
| Mobile Tests | 0% | Zero unit tests across all 3 apps | CRITICAL — launch blocker |
| Design System | 0% | PHBIMH not applied, apps use dark theme | CRITICAL — brand mismatch |
| Business Isolation | 0% | No per-business theming | CRITICAL — PHBIMH requirement |
| Release APK | FAILING | Multiple build log failures | CRITICAL — cannot ship |
| Security | 30% | Basic tests exist, no hardening | CRITICAL — will be exploited |
| Payment Integrity | 50% | Services exist, no idempotency proofs | HIGH — financial risk |
| Real-time | 60% | Socket.io exists, no load testing | HIGH — GPS tracking unproven |
| Monitoring | 10% | Docker exists, no observability | HIGH — flying blind in prod |

### P0 BLOCKERS (Cannot launch without fixing)

1. **Release APK crashes on launch** — No working APK exists
2. **Zero mobile unit tests** — Any regression ships silently
3. **PHBIMH design not applied** — Apps look nothing like the brand
4. **No webhook signature verification** — Payment fraud inevitable
5. **No idempotency on payment processing** — Double charges guaranteed
6. **No rate limiting on driver location updates** — DoS vector
7. **No CORS lockdown** — API wide open to browser attacks
8. **No webhook IP allowlisting** — PayFast/Ozow spoofing possible

---

## PHASE 1: SECURITY HARDENING (Days 1-5)
**Priority:** P0 — NON-NEGOTIABLE
**Owner:** Security Engineer + Backend Lead

### 1.1 OWASP Top 10 — Complete Audit & Fix

| OWASP | Current Risk | Remediation | Effort |
|-------|-------------|-------------|--------|
| **A01 Broken Access Control** | Role checks exist but IDOR gaps in ride/payment endpoints | Policy classes on every controller method; authorization middleware on all admin routes | 2 days |
| **A02 Cryptographic Failures** | `SESSION_ENCRYPT=false` in .env.example | Enable session encryption; verify all encrypted model columns use `text` type; rotate APP_KEY on deploy | 4 hrs |
| **A03 Injection** | SQL injection tests pass (Laravel Eloquent) | Add parameterized queries for raw DB calls; run static analysis at PHPStan level 8 | 1 day |
| **A04 Insecure Design** | Webhook routes have no IP allowlisting | Implement `VerifyWebhookOrigin` middleware for PayFast, Ozow, Stripe, Twilio, Partner webhooks | 1 day |
| **A05 Security Misconfiguration** | `.env.example` has `APP_DEBUG=false` but no security headers middleware | Add `SecurityHeaders` middleware: HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff | 4 hrs |
| **A06 Vulnerable Components** | `composer audit` not run | Run `composer audit`, fix all critical/high advisories; lock file versions | 4 hrs |
| **A07 Auth Failures** | Login rate limit exists (5/min) but no account lockout | Add account lockout after 5 failed attempts per 15min; add CAPTCHA after 3rd failure | 1 day |
| **A08 Data Integrity** | No webhook signature verification on PayFast/Ozow | Implement HMAC-SHA256 verification on all payment webhooks; verify Stripe `whsec_` signature | 4 hrs |
| **A09 Logging Failures** | Basic Laravel logging | Add structured logging with trace_id; log all auth events, payment events, admin actions to dedicated channels | 1 day |
| **A10 SSRF** | Google Maps API calls could be SSRF'd | Validate all external URLs against allowlist; never pass user input directly to HTTP clients | 4 hrs |

### 1.2 Payment Fraud Prevention

```
CRITICAL VULNERABILITIES TO FIX:
```

| Vulnerability | Impact | Fix |
|--------------|--------|-----|
| **Double charge** | Rider pays twice for same ride | Add idempotency_key to Payment model; unique constraint on (ride_id, payment_method, status); check before processing |
| **Webhook replay** | Attacker replays old PayFast/Ozow webhook | Verify timestamp within 5min window; track processed webhook IDs in `webhook_events` table |
| **Negative amount** | Rider requests negative refund | Validate all monetary amounts > 0; add CHECK constraints at DB level |
| **Race condition** | Two concurrent wallet payments overdraft | Use Redis atomic lock per wallet_id during transaction; wrap in DB transaction with SELECT FOR UPDATE |
| **Escrow bypass** | Driver gets paid before 24h window | Add scheduled job to enforce escrow hold; reject manual payout requests on disputed rides |
| **Refund abuse** | Rider gets full refund after completing ride | Enforce refund window: 2min = full, 2-10min = 50%, >10min = 0%; require admin approval for >R500 |

### 1.3 Auth Bypass Prevention

```php
// MUST implement on every controller:

// 1. Authorization Policies (already have some, expand to all)
// RidePolicy — rider can only see/cancel their own rides
// PaymentPolicy — user can only see their own payments
// WalletPolicy — user can only operate on their own wallet

// 2. Route-level middleware verification
// Verify every protected route has auth:sanctum
// Verify every admin route has role:admin|super-admin AND admin.totp
// Verify driver-only routes have role:driver

// 3. Input validation
// Every FormRequest must validate AND authorize
// No raw $request->input() without validation
```

### 1.4 Security Headers Implementation

Create `app/Http/Middleware/SecurityHeaders.php`:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### 1.5 Webhook IP Allowlisting

```php
// PayFast: Allow only 197.97.128.0/17
// Ozow: Allow only published Ozow IPs
// Stripe: Allow only Stripe webhook IPs (publish at stripe.com/files/ips/ips_webhooks.json)
// Twilio: Allow only Twilio IP ranges
```

### 1.6 Rate Limiting Overhaul

| Endpoint Group | Current Limit | Required Limit | Burst |
|---------------|--------------|----------------|-------|
| `auth/login` | 5/min | 5/min + lockout | 3 in 10s |
| `auth/register` | 10/min | 3/min (strict) | 2 in 10s |
| `rides` (create) | throttle:ride-create | 2/min per user | 1 in 5s |
| `drivers/location` | throttle:driver-location | 1/sec per driver | 3 in 5s |
| `payments` | throttle:payments | 3/min per user | 1 in 5s |
| `webhooks/*` | throttle:api | 100/min per IP | 20 in 10s |
| `admin/*` | throttle:api | 30/min per admin | 10 in 10s |

---

## PHASE 2: MOBILE APP TESTING (Days 3-12)
**Priority:** P0 — LAUNCH BLOCKER
**Owner:** QA Lead + Mobile Team

### 2.1 Test Infrastructure Setup

```bash
# Install dependencies
cd mobile
npm install --save-dev @testing-library/react-native @testing-library/jest-native
npm install --save-dev jest-expo
npm install --save-dev msw  # API mocking

# Configure Jest for each app
# Each app needs jest.config.js with:
# - preset: jest-expo
# - setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect']
# - moduleNameMapper for @easyryde/shared
```

### 2.2 Rider App Unit Tests (21 screens → 40+ test files)

| Screen | Test Cases | Priority |
|--------|-----------|----------|
| **LoginScreen** | Form renders; email validation; password validation; submit calls API; error state displays; loading state shows spinner; navigation to register works; navigation to forgot password works | P0 |
| **RegisterScreen** | All fields render; name/email/phone/password validation; password confirmation mismatch; submit creates account; error state for duplicate email; phone format validation | P0 |
| **HomeScreen** | Greeting displays correctly based on time; search bar renders; quick action tiles render; map loads with current location; promo carousel displays | P0 |
| **BookRideScreen** | Pickup/destination inputs; fare estimate displays; vehicle category selection; payment method selection; request ride button disabled without destination; surge multiplier displays | P0 |
| **RideTrackingScreen** | Driver info displays; ETA updates; cancel button shows within 2min window; driver location on map updates; status badge shows correct state | P0 |
| **PaymentScreen** | All payment methods listed; wallet balance shows; cash selected by default; card selection opens Stripe; payment confirmation dialog | P0 |
| **RideHistoryScreen** | List renders; empty state displays; pagination loads more; pull-to-refresh works; tap navigates to detail | P1 |
| **WalletScreen** | Balance displays; transaction list renders; top-up button works; insufficient balance warning | P1 |
| **RatingScreen** | Star rating component; comment input; submit validates minimum 1 star; success state shows; cannot rate twice | P1 |
| **ChatScreen** | Message list renders; send button disabled when empty; messages auto-scroll to bottom; keyboard pushes content up | P1 |
| **ProfileScreen** | User info displays; edit mode toggles; logout confirms; settings sections render | P1 |
| **PromoCodeScreen** | Input field validates; apply button works; invalid code shows error; discount displays on fare | P1 |
| **NotificationScreen** | List renders; unread badge shows count; tap marks as read; empty state shows | P2 |
| **RestaurantListScreen** | List renders; search filters; category chips work; empty state shows | P2 |
| **RestaurantMenuScreen** | Menu items render; add to cart works; quantity adjusts; cart badge updates | P2 |
| **FoodCheckoutScreen** | Order summary shows; delivery address validates; payment method selects; place order calls API | P2 |
| **FoodOrderTrackingScreen** | Status timeline renders; driver info shows; ETA displays | P2 |
| **ConsentScreen** | Consent checkboxes render; required consent blocks proceed; accept saves consent | P1 |
| **ForgotPasswordScreen** | Email input validates; submit sends reset; success message shows | P0 |
| **SupportScreen** | FAQ items render; contact options display | P2 |
| **RideDetailScreen** | All ride info displays; receipt generates; map shows route | P1 |

### 2.3 Driver App Unit Tests (13 screens → 25+ test files)

| Screen | Test Cases | Priority |
|--------|-----------|----------|
| **LoginScreen** | Same as rider login tests | P0 |
| **DashboardScreen** | Online/offline toggle renders; today's earnings card; recent trips list; earnings summary | P0 |
| **RideRequestsScreen** | Incoming requests render; accept/decline buttons work; request timeout countdown; no requests empty state | P0 |
| **ActiveRideScreen** | Navigation to pickup; rider info card; arrived button; chat button; SOS button; navigation to destination | P0 |
| **EarningsScreen** | Daily/weekly/monthly toggle; earnings chart; payout button; withdrawal history | P1 |
| **TripHistoryScreen** | List renders; filter by date; detail navigation; pagination | P1 |
| **ProfileScreen** | Driver info; vehicle info; documents section; online hours display | P1 |
| **ChatScreen** | Same as rider chat tests | P1 |
| **FoodDeliveryScreen** | Available orders list; accept food order; status update buttons | P2 |
| **FoodOrderDetailScreen** | Order details; pickup/dropoff addresses; item list; status actions | P2 |
| **DocumentsScreen** | Document upload; expiry warnings; renewal reminders | P1 |
| **SupportScreen** | FAQ items; contact options | P2 |
| **ConsentScreen** | Same as rider consent | P1 |

### 2.4 Admin App Unit Tests (12 screens → 20+ test files)

| Screen | Test Cases | Priority |
|--------|-----------|----------|
| **LoginScreen** | Admin login; role verification; TOTP required | P0 |
| **AdminDashboardScreen** | KPI cards render; revenue chart; ride count; driver count; activity feed; pull-to-refresh | P0 |
| **RidesScreen** | Ride list renders; status filter; date filter; search; tap to detail; pagination | P0 |
| **DriversScreen** | Driver list renders; approval status filter; approve/reject buttons; tap to detail | P0 |
| **UsersScreen** | User list renders; search; role filter; tap to detail; pagination | P1 |
| **SettingsScreen** | Pricing settings load; save changes; validation errors; audit log entry on save | P1 |
| **SurgePricingScreen** | Current surge config displays; multiplier editor; time windows; save | P1 |
| **SurgeZonesScreen** | Zone list renders; create zone; edit zone; toggle active | P2 |
| **PeakHoursScreen** | Peak hours list; create peak hour; edit; toggle | P2 |
| **RideDetailScreen** | Full ride info; driver/rider details; payment status; dispute button; refund button | P0 |
| **DriverDetailScreen** | Driver profile; documents; earnings; approval status; suspend button | P1 |
| **UserDetailScreen** | User profile; ride history; wallet balance; account actions | P1 |

### 2.5 Shared Package Tests

| Module | Test Cases |
|--------|-----------|
| **api-client** | Token refresh interceptor; 401 logout; request retry; base URL config; timeout handling |
| **auth** | Login flow; logout flow; token persistence; biometric auth; session expiry |
| **constants** | VEHICLE_TYPES has all categories; PAYMENT_METHODS has all methods; RIDE_STATUS_LABELS covers all statuses |
| **theme** | ThemeContext provides colors; useTheme returns valid theme; COLORS object has all required keys |
| **utils/formatters** | Currency formatting (ZAR); distance formatting (km); time formatting; phone number formatting |
| **utils/validators** | Email validation; phone validation (+27 format); password strength; name validation |

### 2.6 Integration Tests (Mobile)

```
mobile/__tests__/integration/
├── auth-flow.test.tsx           # Login → token → me → logout
├── ride-lifecycle.test.tsx      # Request → match → track → complete → rate
├── payment-flow.test.tsx        # Select method → pay → confirm → receipt
├── offline-recovery.test.tsx    # Offline → queue → online → flush
├── socket-reconnection.test.tsx # Disconnect → retry → reconnect
└── navigation.test.tsx          # Tab navigation, stack push/pop
```

### 2.7 Test Execution Command

```bash
# Run all mobile tests
cd mobile && npx jest --coverage --forceExit

# Per app
cd mobile/apps/rider && npx jest --coverage
cd mobile/apps/driver && npx jest --coverage
cd mobile/apps/admin && npx jest --coverage

# Target: 70% line coverage minimum before launch
```

---

## PHASE 3: DESIGN APPLICATION (Days 5-15)
**Priority:** P0 — CRITICAL
**Owner:** Designer + Frontend Lead

### 3.1 PHBIMH Design System Analysis

The PHBIMH design at `/home/madoc-hp/Documents/index.html` defines:

**Color System:**
```css
--ink: #0F1713          /* Primary text */
--ink2: #44514A         /* Secondary text */
--mut: #8A978F          /* Muted text */
--bg: #F2F4F1           /* Page background */
--card: #FFFFFF          /* Card background */
--line: #E5EAE4          /* Borders */
--green: #0A7C4E         /* PRIMARY BRAND */
--green-l: #12A86B       /* Light green */
--green-d: #0B3B2A       /* Dark green */
--amber: #F5A524         /* Warning/accent */
--red: #E5484D           /* Error/danger */
--blue: #2E6BF0          /* Info */
--purple: #7C3AED        /* Purple accent */
--teal: #0E9488          /* Teal accent */
```

**Typography:**
- Headers: Poppins (500, 600, 700, 800)
- Body: Inter (400, 500, 600, 700)

**Key Design Patterns:**
- Rounded cards (18-28px radius)
- Glass morphism headers (backdrop-filter: blur)
- Gradient backgrounds on hero sections
- Dot pattern overlays on colored sections
- Bottom navigation with center floating button
- Slide-in drawer navigation
- Sheet modals (bottom sheet pattern)
- Chip-based filtering
- Status badges (pill-shaped)

### 3.2 Current Mobile Theme MISMATCH

**Current (WRONG):**
```typescript
// Dark theme - completely wrong
colors: {
  bg: '#121212',
  surface: '#1c1c1e',
  primary: '#FFAD7A',  // Orange — wrong
  text: '#FFFFFF',
}
```

**Required (PHBIMH):**
```typescript
// Light green theme — must match PHBIMH
colors: {
  bg: '#F2F4F1',           // Light gray-green
  card: '#FFFFFF',          // White cards
  primary: '#0A7C4E',       // Brand green
  primaryLight: '#12A86B',
  primaryDark: '#0B3B2A',
  text: '#0F1713',          // Dark ink
  textSecondary: '#44514A',
  muted: '#8A978F',
  border: '#E5EAE4',
  amber: '#F5A524',
  red: '#E5484D',
  blue: '#2E6BF0',
}
```

### 3.3 Theme Override Implementation

**Step 1:** Update `mobile/packages/shared/src/constants/index.ts` — Replace COLORS with PHBIMH values

**Step 2:** Update all 3 app `App.tsx` files:
- Rider: Change `contentStyle: { backgroundColor: '#F2F4F1' }` and nav theme to light
- Driver: Same
- Admin: Same

**Step 3:** Update every screen component to use theme colors instead of hardcoded `#121212`, `#1c1c1e`, `#FFAD7A`

### 3.4 Per-App Design Mapping

| PHBIMH Element | Rider App | Driver App | Admin App |
|---------------|-----------|------------|-----------|
| **Splash** | Green gradient + EasyRyde logo | Green gradient + driver icon | Red gradient + admin shield |
| **Header** | Frosted glass bar | Frosted glass bar | Solid green bar |
| **Bottom Nav** | 5 tabs + center button | 6 tabs | 5 tabs + hamburger |
| **Cards** | White, 18px radius, subtle shadow | Same | Same |
| **Buttons** | Green primary, outlined secondary | Same | Same |
| **Status Badges** | Colored pills (green/amber/red) | Same | Same |
| **Map** | Green pins, dark car markers | Same | N/A |
| **Drawer** | Dark green background | Same | N/A |

### 3.5 Screen-by-Screen Design Audit

For each of the 46 mobile screens, verify:
- [ ] Background color matches PHBIMH `--bg` (#F2F4F1)
- [ ] Card backgrounds match PHBIMH `--card` (#FFFFFF)
- [ ] Primary buttons use PHBIMH `--green` (#0A7C4E)
- [ ] Text colors use PHBIMH `--ink` (#0F1713) and `--ink2` (#44514A)
- [ ] Headers use Poppins font family
- [ ] Body text uses Inter font family
- [ ] Border radius matches PHBIMH patterns (18-28px)
- [ ] Shadows match PHBIMH `--sh-sm` / `--sh-md`
- [ ] Status indicators use correct colors
- [ ] No hardcoded colors outside theme

---

## PHASE 4: BUSINESS ISOLATION (Days 10-18)
**Priority:** P0 — PHBIMH REQUIREMENT
**Owner:** Backend Lead + Designer

### 4.1 Architecture: Multi-Tenant Business Identity

Each registered business (restaurant, lodge, service) must feel like its own app within EasyRyde. This requires:

**Database Schema:**
```sql
-- New table: business_profiles
CREATE TABLE business_profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0A7C4E',  -- HEX color
    secondary_color VARCHAR(7) DEFAULT '#12A86B',
    accent_color VARCHAR(7) DEFAULT '#F5A524',
    dark_mode BOOLEAN DEFAULT false,
    custom_fonts JSONB DEFAULT '{}',
    tagline TEXT,
    description TEXT,
    category VARCHAR(50),
    verified BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for fast lookup
CREATE INDEX idx_business_profiles_slug ON business_profiles(slug);
CREATE INDEX idx_business_profiles_tenant ON business_profiles(tenant_id);
```

### 4.2 API Endpoints for Business Identity

```
GET  /api/v1/business/{slug}           — Public business profile
GET  /api/v1/business/{slug}/menu      — Restaurant menu (if applicable)
GET  /api/v1/business/{slug}/reviews   — Business reviews
POST /api/v1/admin/business/profile    — Update business profile (owner)
POST /api/v1/admin/business/logo       — Upload logo
POST /api/v1/admin/business/cover      — Upload cover image
```

### 4.3 Mobile: Dynamic Theme Per Business

```typescript
// When user opens a business (restaurant, lodge, etc.), load their brand colors:

interface BusinessTheme {
  primary: string;      // Business primary color
  secondary: string;    // Business secondary color
  accent: string;       // Business accent color
  logo: string;         // Business logo URL
  cover: string;        // Business cover URL
  name: string;         // Business name
  darkMode: boolean;    // Business preference
}

// RestaurantDetailScreen loads business theme:
const { data: business } = useQuery(['business', slug], fetchBusiness);
const businessTheme = business ? {
  primary: business.primary_color,
  secondary: business.secondary_color,
  // ...
} : defaultTheme;

// Apply to header, buttons, accents for that screen only
```

### 4.4 Business Identity Components

| Component | Behavior |
|-----------|----------|
| **BusinessHeader** | Renders business logo, name, verified badge, cover image gradient |
| **BusinessCard** | Card with business colors as accent; logo as icon |
| **BusinessButton** | Button uses business primary color |
| **BusinessBadge** | Category pill with business colors |
| **BusinessNav** | If business has own app-like nav, render custom tab bar |

### 4.5 Phalaborwa-In-My-Hand (PHBIMH) Integration

```
CRITICAL: PHBIMH is the umbrella brand. Each business operates under it.

Flow:
1. User opens EasyRyde → sees PHBIMH branding
2. User browses businesses → each shows its own colors/logo
3. User opens Cajori Restaurant → Cajori red theme applied
4. User opens Baobab Kitchen → Baobab brown theme applied
5. User opens Kruger Gate Hotel → Hotel blue theme applied
6. User returns to home → PHBIMH green theme restored
```

---

## PHASE 5: RELEASE APK FIXES (Days 1-8)
**Priority:** P0 — CANNOT SHIP WITHOUT
**Owner:** Release Engineer

### 5.1 Root Cause Analysis

Multiple build log files indicate repeated failures:
- `rider_build.log`, `rider_build2.log`, `rider_clean_build.log`
- `driver_build.log`, `driver_build2.log`
- `admin_build.log` through `admin_build_v6.log`
- `metro_err.log`, `metro-err.log`
- `emu_err.log`, `emu2_err.log`

**Common failure modes to investigate:**

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Metro bundler fails | Missing dependencies, circular imports | `npx expo install --fix`; check import cycles |
| Android build fails | Wrong SDK version, missing `google-services.json` | Verify `compileSdkVersion=34`, `targetSdkVersion=34` |
| APK crashes on launch | Missing native module, unhandled JS error | Check Logcat; add crashlytics; fix null pointer |
| Maps crash | Missing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Set env var before build; verify AndroidManifest.xml |
| White screen on launch | JS bundle not embedded | Use `npx expo run:android --variant release` |
| Metro cross-contamination | Debug Metro connected to release build | Kill Metro before release build; use `--no-dev` flag |

### 5.2 Build Procedure (Fixed)

```bash
# Rider App
cd mobile/apps/rider

# 1. Clean
rm -rf android/app/build
rm -rf node_modules/.cache

# 2. Install dependencies
npm install

# 3. Set environment
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_REAL_KEY"
export EXPO_PUBLIC_API_URL="https://api.easyryde.co.za"
export EXPO_PUBLIC_SOCKET_URL="https://socket.easyryde.co.za"

# 4. Prebuild
npx expo prebuild --platform android --clean

# 5. Verify AndroidManifest.xml has API key
grep "API_KEY" android/app/src/main/AndroidManifest.xml

# 6. Build release APK
cd android && ./gradlew assembleRelease

# 7. Verify APK exists
ls -la app/build/outputs/apk/release/

# 8. Test on device/emulator
adb install app/build/outputs/apk/release/app-release.apk

# 9. Verify correct app loads (Logcat)
adb logcat | grep -i "easyryde\|error\|crash"
```

### 5.3 Crash-on-Launch Debug Checklist

```
□ Run with debug build first — does it crash?
□ Check Logcat for: "FATAL EXCEPTION" or "ReactNativeJS" errors
□ Verify google-services.json is real (not placeholder)
□ Verify EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is set
□ Verify no Metro bundler dependency (build with --no-dev)
□ Verify JS bundle is embedded (not fetching from Metro)
□ Test with `npx expo start --dev-client` first
□ If maps crash: remove maps temporarily, test without
□ Check ProGuard/R8 rules don't strip React Native classes
□ Verify minimum SDK version (API 24+)
```

### 5.4 APK Signing

```properties
# android/app/build.gradle
signingConfigs {
    release {
        storeFile file(MY_RELEASE_STORE_FILE)
        storePassword MY_RELEASE_STORE_PASSWORD
        keyAlias MY_RELEASE_KEY_ALIAS
        keyPassword MY_RELEASE_KEY_PASSWORD
    }
}
```

### 5.5 EAS Build Configuration

```json
// mobile/apps/rider/eas.json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## PHASE 6: DATABASE FLOW TESTING (Days 8-14)
**Priority:** P0 — CRITICAL PATH
**Owner:** QA Lead + Backend Team

### 6.1 Ride Lifecycle — Complete Flow Test

```
HAPPY PATH:
1. Rider requests ride → status: searching
2. System finds nearby driver → broadcast via Socket.io
3. Driver accepts → status: accepted
4. Driver navigates to pickup → status: driver_en_route
5. Driver arrives → status: arrived
6. Rider enters car → status: in_progress
7. Ride completes → status: completed
8. Payment processed → payment: completed
9. Rider rates driver → rating saved
10. Driver earnings updated → wallet credited

FAILURE PATHS:
- No driver available → status: cancelled (timeout after 5min)
- Driver cancels → refund to rider, status: cancelled
- Rider cancels within 2min → full refund
- Rider cancels after 2min → cancellation fee charged
- Driver no-show → full refund, driver flagged
- Payment fails → ride uncompleted, retry payment
- App crash mid-ride → state restored from server on reopen
- Network loss during ride → location queued, sent on reconnect
- Double payment attempt → idempotency key prevents double charge
```

### 6.2 Payment Flow Test Matrix

| Payment Method | Init | Processing | Success | Failure | Refund |
|---------------|------|------------|---------|---------|--------|
| **Cash** | Driver marks paid | Platform fee deducted | Driver wallet debited | N/A | Admin refund |
| **Wallet** | Balance checked | Atomic deduction | Payment recorded | Insufficient balance | Wallet credit |
| **PayFast** | URL generated | Webhook received | Payment confirmed | Webhook timeout | Gateway refund |
| **Ozow** | Redirect created | Webhook received | Payment confirmed | Webhook timeout | Gateway refund |
| **Stripe** | Intent created | 3DS or direct | Payment confirmed | Card declined | Stripe refund |

### 6.3 Wallet System Test

```
CRITICAL TESTS:
- Deposit increases balance atomically
- Payment decreases balance atomically
- Concurrent deposits don't corrupt balance
- Concurrent payment + deposit don't corrupt
- Withdrawal requires admin approval
- Withdrawal amount <= balance
- Transaction history records all operations
- Refund adds back to wallet
- Platform fee correctly deducted from driver wallet
- Balance never goes negative (CHECK constraint)
```

### 6.4 Food Order Lifecycle

```
1. Rider browses restaurant → menu loads
2. Rider adds items to cart → cart persists
3. Rider places order → status: pending
4. Restaurant accepts → status: preparing
5. Driver assigned → status: ready_for_pickup
6. Driver picks up → status: in_transit
7. Driver delivers → status: delivered
8. Rider rates → rating saved
9. Payment processed → driver + restaurant paid
```

### 6.5 Database Integrity Constraints

```sql
-- Add these if missing:
ALTER TABLE rides ADD CONSTRAINT chk_fare_positive CHECK (total_fare >= 0);
ALTER TABLE payments ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);
ALTER TABLE wallet_transactions ADD CONSTRAINT chk_balance_non_negative CHECK (balance_after >= 0);
ALTER TABLE ratings ADD CONSTRAINT chk_score_range CHECK (score BETWEEN 1 AND 5);
ALTER TABLE promo_codes ADD CONSTRAINT chk_discount_positive CHECK (value > 0);
```

---

## PHASE 7: API ENDPOINT TESTING (Days 10-18)
**Priority:** P0 — 170+ ENDPOINTS
**Owner:** QA Lead

### 7.1 Test Coverage Target

| Endpoint Group | Routes | Feature Tests Needed | Current | Gap |
|---------------|--------|---------------------|---------|-----|
| Auth | 8 | 15 | 7 | 8 |
| Rides | 13 | 25 | 12 | 13 |
| Drivers | 10 | 18 | 3 | 15 |
| Payments | 10 | 20 | 4 | 16 |
| Wallet | 5 | 10 | 3 | 7 |
| Ratings | 4 | 6 | 3 | 3 |
| Promo Codes | 5 | 8 | 3 | 5 |
| Deliveries | 5 | 8 | 2 | 6 |
| Food | 10 | 15 | 2 | 13 |
| Notifications | 6 | 8 | 2 | 6 |
| Admin | 30 | 40 | 5 | 35 |
| Scheduled Rides | 3 | 5 | 1 | 4 |
| Referrals | 3 | 5 | 2 | 3 |
| SOS | 4 | 6 | 2 | 4 |
| Chat | 4 | 6 | 1 | 5 |
| KYC | 4 | 6 | 2 | 4 |
| Incidents | 5 | 8 | 2 | 6 |
| Consent | 4 | 6 | 2 | 4 |
| Data Rights | 3 | 5 | 2 | 3 |
| Reporting | 5 | 8 | 2 | 6 |
| Config | 3 | 4 | 2 | 2 |
| Inspector | 4 | 4 | 1 | 3 |
| Pool | 5 | 8 | 2 | 6 |
| **TOTAL** | **~170** | **~250** | **~65** | **~185** |

### 7.2 Critical Path Tests (Must-pass before launch)

```php
// RIDE FLOW (5 tests)
test_rider_can_request_ride_with_valid_data()
test_driver_can_accept_ride()
test_driver_can_complete_ride()
test_rider_can_rate_completed_ride()
test_rider_cannot_rate_incomplete_ride()

// PAYMENT FLOW (5 tests)
test_wallet_payment_succeeds_with_sufficient_balance()
test_wallet_payment_fails_with_insufficient_balance()
test_cash_payment_marks_ride_as_paid()
test_payfast_webhook_updates_payment_status()
test_stripe_webhook_updates_payment_status()

// AUTH FLOW (3 tests)
test_register_creates_user_with_rider_role()
test_login_returns_sanctum_token()
test_unauthenticated_request_returns_401()

// ADMIN FLOW (3 tests)
test_admin_can_approve_driver()
test_admin_can_update_pricing_settings()
test_admin_can_view_dashboard_metrics()

// SECURITY (3 tests)
test_rider_cannot_access_admin_endpoints()
test_driver_cannot_access_other_drivers_rides()
test_rate_limiting_blocks_excessive_requests()
```

### 7.3 Test Execution

```bash
# Full backend test suite
docker compose exec backend php vendor/bin/phpunit --configuration phpunit.xml

# Specific test
docker compose exec backend php vendor/bin/phpunit --filter test_rider_can_request_ride

# Coverage report
docker compose exec backend php vendor/bin/phpunit --coverage-html coverage/

# Target: 80% line coverage, 70% branch coverage
```

---

## PHASE 8: GRAPHICS/RESPONSE/READABILITY MONITORING (Days 12-20)
**Priority:** P1 — OPERATIONAL
**Owner:** DevOps + Backend Lead

### 8.1 Response Quality Monitoring

```php
// Add to every API response:
// 1. Response time tracking
// 2. Response size tracking
// 3. Error rate tracking
// 4. Response format validation

// Middleware: ResponseMonitor
class ResponseMonitor
{
    public function handle($request, Closure $next)
    {
        $start = microtime(true);
        $response = $next($request);
        $duration = microtime(true) - $start;

        // Log to structured logger
        Log::channel('api')->info('API Response', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'duration_ms' => round($duration * 1000, 2),
            'size_bytes' => strlen($response->getContent()),
            'user_id' => $request->user()?->id,
            'trace_id' => $request->header('X-Trace-Id'),
        ]);

        // Add response headers
        $response->headers->set('X-Response-Time', round($duration * 1000, 2) . 'ms');
        $response->headers->set('X-Request-Id', Str::uuid());

        return $response;
    }
}
```

### 8.2 Graphics/Media Monitoring

```
TRACK:
- Image upload success/failure rate
- Image processing time
- Storage usage (local + S3)
- Broken image URLs
- Image CDN hit rate
- Thumbnail generation success rate

ALERT ON:
- Image processing > 5 seconds
- Storage usage > 80%
- Broken image rate > 5%
```

### 8.3 Readability Checks (Mobile)

```
VERIFY ON ALL SCREENS:
- Font size minimum 12px (mobile accessibility)
- Contrast ratio >= 4.5:1 (WCAG AA)
- Touch targets >= 44x44px
- Text not truncated without ellipsis
- Error messages are human-readable
- Loading states exist for all async operations
- Empty states exist for all list views
```

### 8.4 API Response Format Standardization

```php
// Every endpoint must return:
{
    "success": true|false,
    "data": { ... },           // Payload (when success)
    "message": "string",       // Human-readable message
    "errors": { ... },         // Validation errors (when fail)
    "meta": {                  // Pagination metadata
        "current_page": 1,
        "last_page": 5,
        "per_page": 15,
        "total": 72
    },
    "trace_id": "uuid"         // For debugging
}
```

---

## PHASE 9: PERFORMANCE OPTIMIZATION (Days 15-22)
**Priority:** P1 — USER EXPERIENCE
**Owner:** Backend Lead + Mobile Lead

### 9.1 Backend Performance

| Metric | Current | Target | How |
|--------|---------|--------|-----|
| API response p50 | Unknown | < 200ms | Query optimization, eager loading |
| API response p95 | Unknown | < 500ms | Indexes, caching, connection pooling |
| API response p99 | Unknown | < 1000ms | Background jobs for heavy ops |
| Database query time | Unknown | < 50ms | Add indexes, EXPLAIN ANALYZE |
| Queue job processing | Unknown | < 5s | Horizon monitoring, worker scaling |

### 9.2 Database Indexes to Add

```sql
-- Rides (most queried)
CREATE INDEX idx_rides_rider_status ON rides(rider_id, status);
CREATE INDEX idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX idx_rides_status_created ON rides(status, created_at DESC);
CREATE INDEX idx_rides_category ON rides(category);

-- Payments
CREATE INDEX idx_payments_ride_id ON payments(ride_id);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- Wallet
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Driver location (PostGIS)
CREATE INDEX idx_driver_profiles_location ON driver_profiles USING GIST (current_location);
CREATE INDEX idx_driver_profiles_online ON driver_profiles(is_online) WHERE is_online = true;

-- Food orders
CREATE INDEX idx_food_orders_rider_status ON food_orders(rider_id, status);
CREATE INDEX idx_food_orders_restaurant ON food_orders(restaurant_id, status);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

### 9.3 Caching Strategy

```php
// Cache these aggressively:
// 1. Vehicle types + fare rates → Cache for 1 hour
// 2. Business profiles → Cache for 30 minutes
// 3. Restaurant menus → Cache for 15 minutes
// 4. System settings → Cache forever (clear on update)
// 5. Nearby drivers → Cache for 5 seconds (Redis geo)
// 6. Surge pricing → Cache for 1 minute (Redis)

// Invalidate on:
// - Admin updates settings
// - Business updates profile
// - Restaurant updates menu
```

### 9.4 Mobile Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Cold start | < 2s | Lazy load screens, optimize bundle |
| Screen transition | < 300ms | Use native driver animations |
| Map marker update | < 100ms | Throttle location updates |
| API response render | < 200ms | Optimistic UI updates |
| Bundle size (rider) | < 8MB | Tree shaking, code splitting |
| Bundle size (driver) | < 6MB | Same |
| Memory usage | < 150MB | Profile and fix leaks |
| FPS (map scroll) | > 55 | Use InteractionManager |

### 9.5 Load Test Scenarios

```javascript
// k6 load tests
// 1. Normal load: 50 concurrent ride requests
// 2. Peak load: 200 concurrent (Friday evening)
// 3. Spike: 500 concurrent (event at stadium)
// 4. Sustained: 100 concurrent for 30 minutes
// 5. Location stream: 500 drivers updating every 5s

// Thresholds:
// - API p95 < 500ms
// - WebSocket latency < 200ms
// - Error rate < 1%
// - No data corruption under load
```

---

## PHASE 10: PRODUCTION DEPLOYMENT READINESS (Days 20-28)
**Priority:** P0 — MUST DO
**Owner:** Release Engineer + DevOps

### 10.1 Pre-Deployment Checklist

```
SECRETS:
□ APP_KEY generated (base64: prefix)
□ DB_PASSWORD is strong (32+ chars)
□ REDIS_PASSWORD is set
□ STRIPE_SECRET_KEY is live key (sk_live_...)
□ PAYFAST_MERCHANT_ID and MERCHANT_KEY are production
□ OZOW_SITE_CODE and API_KEY are production
□ TWILIO_SID and AUTH_TOKEN are production
□ SENDGRID_API_KEY is production
□ SENTRY_DSN is production project
□ FIREBASE service account is real
□ GOOGLE_MAPS_API_KEY is production (billing enabled)

INFRASTRUCTURE:
□ DNS A records: api.easyryde.co.za, socket.easyryde.co.za
□ SSL certificates provisioned (certbot auto)
□ Docker Compose production config ready
□ PostgreSQL with PostGIS extension
□ Redis with password authentication
□ Nginx reverse proxy configured
□ Firewall rules: only ports 80, 443, 22 open
□ Server has 4GB+ RAM, 2+ CPU cores
□ Disk space > 50GB free
□ Backup cron job configured

DATABASE:
□ All migrations run: php artisan migrate --force
□ PostGIS extension enabled
□ Initial data seeded
□ Admin user created
□ Database backups verified
□ WAL archiving enabled

APPLICATION:
□ APP_DEBUG=false
□ LOG_LEVEL=warning
□ SESSION_DRIVER=redis
□ QUEUE_CONNECTION=redis
□ CACHE_STORE=redis
□ All tests passing
□ No PHP errors in logs
□ No deprecation warnings
```

### 10.2 Monitoring Setup

```
ERROR TRACKING:
- Sentry: Backend + Mobile (all 3 apps)
- Alert on: new error type, >10 occurrences/hour, crash rate >0.1%

APPLICATION MONITORING:
- Grafana dashboards:
  - API response times (p50, p95, p99)
  - Error rates by endpoint
  - Database query performance
  - Queue job processing time
  - Active connections
  - Memory/CPU usage

BUSINESS METRICS:
- Rides per hour
- Revenue per hour
- Active drivers
- Active riders
- Payment success rate
- Average ride duration
- Cancellation rate
- Rating distribution

UPTIME:
- Health check endpoint: GET /api/v1/health
- External uptime monitor (Pingdom/UptimeRobot)
- Alert if downtime > 1 minute
```

### 10.3 Backup & Disaster Recovery

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/easyryde/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U easyryde easyryde | gzip > $BACKUP_DIR/db.sql.gz

# Application backup
tar -czf $BACKUP_DIR/storage.tar.gz /var/www/storage

# Retention: 7 daily, 4 weekly, 12 monthly
# Offsite: Copy to S3
aws s3 sync $BACKUP_DIR s3://easyryde-backups/$(date +%Y-%m-%d)/
```

### 10.4 Rollback Procedure

```
IF DEPLOYMENT FAILS:
1. docker compose -f docker-compose.prod.yml down
2. Restore database from backup
3. docker compose -f docker-compose.prod.blue.yml up -d  (previous version)
4. Verify health check
5. Notify team

IF APP CRASHES IN PRODUCTION:
1. Identify error in Sentry
2. If hotfix possible: push fix, rebuild, deploy
3. If not: rollback to previous version
4. Post-mortem within 24 hours
```

### 10.5 Deployment Commands

```bash
# Deploy to production
cd /opt/easyryde

# Pull latest code
git pull origin main

# Backend
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail 50

# Database migrations
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Clear caches
docker compose -f docker-compose.prod.yml exec backend php artisan config:cache
docker compose -f docker-compose.prod.yml exec backend php artisan route:cache
docker compose -f docker-compose.prod.yml exec backend php artisan view:cache

# Restart queue workers
docker compose -f docker-compose.prod.yml restart queue

# Mobile apps
cd mobile/apps/rider && eas build --platform android --profile production
cd mobile/apps/driver && eas build --platform android --profile production
cd mobile/apps/admin && eas build --platform android --profile production
```

---

## EXECUTION TIMELINE

```
WEEK 1 (Days 1-7):
├── Day 1-3: Security hardening (Phase 1)
├── Day 1-5: Release APK fix (Phase 5)
├── Day 3-7: Mobile test infrastructure (Phase 2 start)
└── Day 5-7: PHBIMH theme constants (Phase 3 start)

WEEK 2 (Days 8-14):
├── Day 8-12: Mobile unit tests - Rider (Phase 2)
├── Day 8-14: Database flow tests (Phase 6)
├── Day 10-14: Business isolation schema (Phase 4)
└── Day 12-14: Response monitoring (Phase 8)

WEEK 3 (Days 15-21):
├── Day 15-18: Mobile unit tests - Driver + Admin (Phase 2)
├── Day 15-18: API endpoint tests (Phase 7)
├── Day 15-20: Design application - all screens (Phase 3)
├── Day 15-22: Performance optimization (Phase 9)
└── Day 18-21: Business isolation mobile integration (Phase 4)

WEEK 4 (Days 22-28):
├── Day 22-25: E2E tests (Detox)
├── Day 22-25: Load testing (k6)
├── Day 25-28: Production deployment (Phase 10)
├── Day 25-28: App Store submission
└── Day 28: GO/NO-GO DECISION
```

---

## GO/NO-GO CRITERIA

### MUST PASS (P0 — Launch Blockers)

| # | Criterion | Current | Required |
|---|-----------|---------|----------|
| 1 | Release APK installs without crash | FAILING | PASS |
| 2 | All 3 apps load without white screen | UNKNOWN | PASS |
| 3 | Mobile unit tests > 70% coverage | 0% | 70%+ |
| 4 | Backend tests > 80% coverage | ~65% | 80%+ |
| 5 | PHBIMH theme applied to all screens | NO | YES |
| 6 | Payment double-charge impossible | NO | YES |
| 7 | Webhook signatures verified | NO | YES |
| 8 | Rate limiting on all endpoints | PARTIAL | FULL |
| 9 | CORS locked to production domains | UNKNOWN | LOCKED |
| 10 | Security headers present | PARTIAL | FULL |
| 11 | Database backups working | UNKNOWN | VERIFIED |
| 12 | Health check endpoint returns 200 | YES | YES |
| 13 | Sentry capturing errors | NO | YES |
| 14 | Ride lifecycle works end-to-end | PARTIAL | FULL |
| 15 | Payment flow works end-to-end | PARTIAL | FULL |

### SHOULD PASS (P1 — Strong Recommendations)

| # | Criterion |
|---|-----------|
| 16 | Business isolation per restaurant |
| 17 | Food delivery flow works |
| 18 | Push notifications working |
| 19 | Load test: 50 concurrent rides |
| 20 | Load test: 10K WebSocket connections |
| 21 | Admin dashboard shows real metrics |
| 22 | Driver payout flow tested |
| 23 | SOS flow tested |
| 24 | Offline mode handles gracefully |
| 25 | Accessibility: WCAG AA on all screens |

---

## RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| APK build fails repeatedly | HIGH | CRITICAL | Debug incrementally; use EAS Build cloud |
| Payment fraud in production | MEDIUM | CRITICAL | Implement idempotency + webhook verification |
| Database corruption | LOW | CRITICAL | Daily backups + WAL archiving |
| Mobile app rejected by Play Store | MEDIUM | HIGH | Follow Google Play guidelines strictly |
| Socket server crashes under load | MEDIUM | HIGH | Redis adapter + auto-restart + monitoring |
| PHBIMH design takes longer than planned | HIGH | MEDIUM | Ship with partial theme, iterate |
| Google Maps API costs exceed budget | MEDIUM | MEDIUM | Cache aggressively, fallback to haversine |
| Driver shortage at launch | HIGH | HIGH | Pre-recruit 50+ drivers, launch bonuses |
| Security breach in first week | LOW | CRITICAL | Penetration test before launch |

---

## FINAL VERDICT

**EasyRyde has a STRONG foundation but CANNOT launch today.** The 41 models, 50 services, 170+ routes, and 3 mobile apps represent ~65-70% completion. The remaining 30-35% is the hardest part: security hardening, testing, design, and APK stability.

**With focused execution over 4 weeks, this plan gets EasyRyde to production-ready.** Without it, launching means: crashes, security breaches, double charges, and brand damage.

**The next action is clear: Start with Phase 1 (Security) and Phase 5 (APK Fix) simultaneously. These are the two P0 blockers that prevent everything else.**

---

*This plan is a living document. Update it as work progresses. Every checkbox above must be checked before GO decision.*
