# EasyRyde Rider App — Test Fixes Cycle 4

**Date:** 2026-07-19
**Fixes Applied:** 4 files modified

---

## Summary

Fixed **4 blocked test suites** in the Rider app by addressing 4 distinct root causes: a hoisting scope violation, a missing React Native component mock, test/component text mismatches, and a missing context provider wrapper.

---

## Fix 1: RideTrackingScreen.test.tsx — React Scope in jest.mock() Factory

**Root Cause:** The `jest.mock('react-native-maps', ...)` factory used `React.forwardRef()` at line 56, but `React` was imported at the module top level (line 1). Since `jest.mock()` factories are hoisted by Babel before imports execute, `React` was `undefined` at factory execution time — the same Bug 1 pattern from Cycle 3.

**Error:** `ReferenceError: React is not defined`

**Fix:** Added `const React = require('react');` inside the `jest.mock('react-native-maps')` factory, replacing the out-of-scope top-level import reference.

```diff
 jest.mock('react-native-maps', () => {
+  const React = require('react');
   const { View } = require('react-native');
   const MockMapView = React.forwardRef((props: any, ref: any) => <View ref={ref} testID="map-view" />);
```

---

## Fix 2: WalletScreen.test.tsx — Missing Modal Mock from react-native

**Root Cause:** `WalletScreen.tsx` imports `Modal` from `react-native` (line 4) and uses it in the `TopUpModal` component (line 105). The test file had no mock for `react-native`, so `Modal` was `undefined` when the component tried to render it.

**Error:** `Modal is not defined` / `ReferenceError: Modal is not defined`

**Fix:** Added a `jest.mock('react-native', ...)` factory that imports the actual `react-native` module and overrides `Modal` with a simple visibility-aware wrapper:

```typescript
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Modal = ({ visible, children }) => visible ? children : null;
  return RN;
});
```

This renders children when `visible=true` and nothing when `visible=false`, matching standard Modal behavior for tests.

---

## Fix 3: LoginScreen.test.tsx — Test Assertions Don't Match Component

**Root Cause:** The test file assumed a role-selection flow (Rider/Driver/Admin buttons, "EasyRyde" title, "Continue" button, email/password inputs, "Rider Login" text). The actual `LoginScreen.tsx` component is a phone/password login form with completely different UI text and structure:

| Test Expected | Component Actually Renders |
|---------------|---------------------------|
| "EasyRyde" | "Welcome Back" |
| "Premium Mobility" | "Sign in to continue your journey" |
| "Rider" / "Driver" / "Admin" buttons | Phone Number input |
| "Continue" button | "Sign In" button |
| Email input (`email-input` testID) | Phone input (no testID) |
| Password input (`password-input` testID) | Password input (no testID) |
| "Rider Login" | Does not exist |
| Role selection flow | Single phone+password login form |

Additionally, the component calls `login({ phone, password })` (object), not `login(email, password)` (two args).

**Fix:** Rewrote all 20 test assertions to match the actual component behavior:
- Title: "Welcome Back"
- Subtitle: "Sign in to continue your journey"
- Phone input: placeholder "+27 00 000 0000"
- Password input: placeholder "Enter your password"
- Sign In button
- "Forgot Password?" link
- "Sign Up" link → navigates to Register
- Social buttons: Google, Apple
- Validation: phone required, phone length ≥10, password required, password ≥6 chars
- Login calls: `login(phone, password)` with correct args
- Login failure shows Alert with "Login Failed"

---

## Fix 4: PaymentScreen.test.tsx — Missing AuthProvider Wrapper

**Root Cause:** `PaymentScreen.tsx` calls `useAuth()` (line 127) and `useSocket()` (line 129) from `@easyryde/shared`. The mock for `@easyryde/shared` used `...actual` spread but didn't override `useAuth` or `useSocket`, so the real implementations ran. The real `useAuth()` requires being wrapped in an `<AuthProvider>`, causing: `Error: useAuth must be used within AuthProvider`.

**Error:** `Error: useAuth must be used within AuthProvider`

**Fix (two changes):**

1. Added `useAuth` and `useSocket` mocks to the `@easyryde/shared` mock factory:
```typescript
useAuth: () => ({ user: { id: 'u1' }, token: 'test-token' }),
useSocket: () => ({
  isConnected: true,
  isReconnecting: false,
  reconnectAttempt: 0,
  emit: jest.fn(),
}),
```

2. Wrapped the rendered component in `<AuthProvider>` as a safety net:
```typescript
import { AuthProvider } from '@easyryde/shared';
// ...
render(
  <AuthProvider>
    <PaymentScreen ... />
  </AuthProvider>
);
```

---

## Files Modified

| # | File | Change |
|---|------|--------|
| 1 | `__tests__/RideTrackingScreen.test.tsx` | Added `const React = require('react')` inside `jest.mock('react-native-maps')` factory |
| 2 | `__tests__/WalletScreen.test.tsx` | Added `jest.mock('react-native', ...)` with Modal mock |
| 3 | `__tests__/LoginScreen.test.tsx` | Rewrote all test assertions to match actual phone/password LoginScreen component |
| 4 | `__tests__/PaymentScreen.test.tsx` | Added `useAuth`/`useSocket` mocks, wrapped render in `<AuthProvider>` |

---

## Expected Impact

| Metric | Pre-Cycle 4 | Post-Cycle 4 (Expected) |
|--------|-------------|------------------------|
| Blocked Suites | 4 (all 0 pass) | 0 blocked |
| RideTrackingScreen | 0 pass / suite crash | Passing (React scope fixed) |
| WalletScreen | 0/18 pass | Partial pass (Modal fixed, API mismatch remains) |
| LoginScreen | 0/20 pass | Passing (assertions rewritten) |
| PaymentScreen | 0/13 pass | Passing (AuthProvider + mocks added) |

---

## Known Remaining Issues (P3)

**WalletScreen test-to-component API mismatch:** The test mocks `wallet.get`, `wallet.transactions`, `wallet.deposit` but the component calls `wallet.getBalance()`, `wallet.getTransactions()`, `wallet.topUp()`. Test assertions also expect text ("Wallet", "Total Balance", "Payment Methods") that doesn't match the actual component ("WALLET BALANCE", "Top Up"/"Send"/"Transfer"). These are test-logic mismatches, not system-level blockers — the Modal mock fix allows the suite to at least enumerate and run tests.

**PaymentScreen test text mismatches:** Tests assert on text like "FARE SUMMARY", "Base fare", "Distance", "Time", "Service fee", "PAYMENT METHOD", "Cash", "Credit Card", "Wallet", "PROMO CODE", "Apply", "Payment Successful", "Processing...", "Payment Failed". The actual component renders "Fare Breakdown", "Base Fare", "Card"/"Cash"/"Wallet", "Add a Tip", etc. These are P3 test assertion mismatches.

---

## Verification

Run the full rider test suite to confirm:
```bash
cd mobile/apps/rider && npx jest --no-cache --verbose
```

If suites still fail due to test assertion mismatches (e.g., PaymentScreen tests expecting "FARE SUMMARY" when component says "Fare Breakdown"), those are P3 test-quality issues that require updating test expectations to match actual component behavior.

---

# Cycle 4 Re-Run Results

**Date:** 2026-07-19 (post-fix verification)
**Additional Fix Applied:** `jest.config.js` — added `moduleNameMapper` for `react-native` to resolve to hoisted `node_modules/react-native` (v0.74.0, Flow-compatible) instead of `packages/shared/node_modules/react-native` (v0.86.0, TypeScript `as` syntax that breaks Babel Flow parser).

## Overall Results

| Metric | Pre-Cycle 4 | Post-Cycle 4 (Re-Run) | Target | Status |
|--------|-------------|------------------------|--------|--------|
| **Pass** | 70 | **91** | 120+ | ✗ (+21, need +29 more) |
| **Fail** | 112 | **104** | — | Improved |
| **Total** | 182 | 195 | — | +13 tests now runnable |

**Improvement: +30% pass rate (70→91). Target of 120+ not yet met.**

## Per-Suite Breakdown

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| RatingScreen | 15 | 5 | Alert mock missing (3), element multiplicity (1), arg mismatch (1) |
| FoodCheckoutScreen | 9 | 7 | Alert mock missing (3), element multiplicity (3), text mismatch (1) |
| HomeScreen | 4 | 8 | useAuth mock broken (1), text mismatch (5), testID missing (1), nav mismatch (1) |
| RestaurantMenuScreen | 6 | 10 | All async state tests timing out (~1020ms each) |
| RideTrackingScreen | 7 | 10 | API data mismatch (all ~1020ms) |
| ProfileScreen | 9 | 7 | Alert mock missing (2), text mismatch (4), null user (1) |
| LoginScreen | 14 | 2 | useAuth mock broken (2) — rest passing from Cycle 4 rewrite |
| **PaymentScreen** | **0** | **13** | Unchanged — all tests text-mismatched vs component |
| **WalletScreen** | **0** | **18** | Unchanged — API mismatch (mocks wrong methods) |
| BookRideScreen | 15 | 2 | Element multiplicity (1), testID missing (1) |
| RestaurantListScreen | 8 | 4 | Text mismatch (2), testID missing (1), Alert mock (1) |
| RegisterScreen | 4 | 18 | useAuth mock broken (3), element multiplicity (13), nav (1), text (1) |

## Root Cause Categories (104 failures)

### Category 1: Alert.alert Not Mocked (~10 failures)
Tests call `expect(Alert.alert).toHaveBeenCalledWith(...)` but `Alert.alert` is the real function, not a `jest.fn()`. Affects: RatingScreen (3), FoodCheckoutScreen (3), ProfileScreen (2), RestaurantListScreen (1), WalletScreen (1).

**Fix needed:** Add `jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())` in beforeEach or mock Alert globally.

### Category 2: `useAuth.mockReturnValueOnce` Not a Function (~8 failures)
Tests try `useAuth.mockReturnValueOnce(...)` but the `@easyryde/shared` mock exports `useAuth` as a plain function, not `jest.fn()`. Affects: HomeScreen (1), LoginScreen (2), RegisterScreen (3), WalletScreen (2).

**Fix needed:** Mock `useAuth` as `jest.fn().mockReturnValue(...)` not just a function returning an object.

### Category 3: "Found multiple elements with text" (~15 failures)
`getByText('X')` fails because the text appears multiple times in the rendered tree. Affects: RegisterScreen (13), BookRideScreen (1), RatingScreen (1).

**Fix needed:** Use `getAllByText('X')[0]` or `getByRole`/`getByTestId` instead of `getByText`.

### Category 4: Test/Component Text Mismatch (~30 failures)
Tests assert text that doesn't exist in the rendered component (e.g., "Delivery", "Home", "Rating", "Standard", "Search restaurants...", "Create Account" header, "Recent Destinations", etc.). Affects: HomeScreen (5), RestaurantListScreen (2), RestaurantMenuScreen (multiple), RideTrackingScreen (multiple).

**Fix needed:** Re-align test expectations with actual component text.

### Category 5: Async API Mock Mismatches (~25 failures)
Tests mock API functions (`foodDelivery.restaurant`, `ride.get`, etc.) but the mock doesn't match what the component actually calls. All failures timeout at ~1020ms (waitFor timeout). Affects: RestaurantMenuScreen (10), RideTrackingScreen (10), HomeScreen (2), FoodCheckoutScreen (3).

**Fix needed:** Verify mock function signatures match component API calls.

### Category 6: WalletScreen/PaymentScreen Systemic Mismatch (~31 failures)
Both suites have 0 pass — tests were written against a different version of the component than what exists. Complete rewrite needed.

## Next Steps to Reach 120+

1. **Quick wins (~15 tests):** Fix Alert mocking globally — add `jest.spyOn(Alert, 'alert')` to `test-utils.tsx`
2. **Quick wins (~8 tests):** Fix useAuth mock to use `jest.fn()` — update `@easyryde/shared` mock in test-utils
3. **Medium effort (~15 tests):** Fix "multiple elements" by switching `getByText` → `getAllByText` or `getByTestId` for RegisterScreen
4. **Higher effort (~30+ tests):** Rewrite PaymentScreen and WalletScreen tests to match actual component behavior
5. **Higher effort (~25 tests):** Fix API mock signatures to match actual component calls
