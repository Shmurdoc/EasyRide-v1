# Mobile Testing Guide

How to run, write, and maintain tests for EasyRyde's three React Native (Expo) mobile apps.

---

## Running Tests

### All Apps

```bash
cd mobile
npx jest --coverage --forceExit
```

### Per App

```bash
cd mobile/apps/rider && npx jest --coverage
cd mobile/apps/driver && npx jest --coverage
cd mobile/apps/admin && npx jest --coverage
```

### Single Test File

```bash
cd mobile/apps/rider
npx jest --testPathPattern LoginScreen
```

### Watch Mode

```bash
cd mobile/apps/rider
npx jest --watch
```

### CI Execution

```bash
# Run all tests with coverage and JUnit output
cd mobile
npx jest --coverage --forceExit --ci --reporters=default --reporters=jest-junit
```

---

## Test Coverage Targets

| App | Minimum | Target | Blocking |
|-----|---------|--------|----------|
| Rider | 70% | 85% | Yes — launch blocker |
| Driver | 70% | 85% | Yes — launch blocker |
| Admin | 70% | 85% | Yes — launch blocker |
| Shared | 80% | 90% | Yes — launch blocker |

**Minimum before production:** 70% line coverage across all apps.

Coverage is measured per-app. Shared package tests count toward each app's coverage when imported.

---

## Test Structure

```
mobile/apps/rider/
├── __tests__/
│   ├── screens/
│   │   ├── LoginScreen.test.tsx
│   │   ├── RegisterScreen.test.tsx
│   │   ├── HomeScreen.test.tsx
│   │   ├── BookRideScreen.test.tsx
│   │   └── ...
│   ├── components/
│   │   └── ... (component-specific tests)
│   └── integration/
│       ├── auth-flow.test.tsx
│       ├── ride-lifecycle.test.tsx
│       └── payment-flow.test.tsx
├── jest.config.js
└── package.json
```

### Jest Configuration

Each app needs a `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@easyryde/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/**/constants/**',
  ],
};
```

### Dependencies

```bash
cd mobile
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest-expo \
  msw
```

---

## Testing Conventions

### File Naming

- Test files: `<ComponentName>.test.tsx`
- Test directories: `__tests__/`
- Co-locate component tests next to the component when the test is component-specific

### Describe Blocks

```tsx
describe('LoginScreen', () => {
  describe('rendering', () => {
    it('shows email input', () => {});
    it('shows password input', () => {});
    it('shows login button', () => {});
  });

  describe('validation', () => {
    it('rejects invalid email format', () => {});
    it('rejects empty password', () => {});
  });

  describe('submission', () => {
    it('calls login API with valid credentials', () => {});
    it('shows error message on API failure', () => {});
    it('shows loading spinner during request', () => {});
  });

  describe('navigation', () => {
    it('navigates to register screen', () => {});
    it('navigates to forgot password screen', () => {});
  });
});
```

### Test Priorities

| Priority | Description | Examples |
|----------|-------------|----------|
| **P0** | Core functionality that breaks the app if broken | Auth flows, ride request/accept/complete, payment processing, form validation, API error handling |
| **P1** | Important flows with workarounds | Ride history, wallet, ratings, chat, profile, navigation |
| **P2** | Nice-to-have with degradation paths | Notifications, promo codes, support, empty states |

### What to Test

- **Rendering:** Component renders with expected elements
- **User interaction:** Button presses, text input, form submission
- **API calls:** Correct endpoint called, loading states, error states
- **Navigation:** Screen transitions on actions
- **State changes:** Toggle states, list updates, conditional rendering
- **Edge cases:** Empty lists, network errors, malformed data

### What NOT to Test

- Third-party library internals
- CSS/styling specifics (use snapshot tests sparingly)
- Implementation details (focus on behavior)
- Pure utility functions (test those separately in utils tests)

---

## Test Utilities

### Mocking API Calls

```tsx
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: { token: 'test-token', user: { id: 1, name: 'Test User' } },
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mocking Navigation

```tsx
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
```

### Mocking Socket.IO

```tsx
jest.mock('../../services/socket', () => ({
  socket: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connected: true,
  },
}));
```

### Mocking Theme

```tsx
jest.mock('@easyryde/shared/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bg: '#F2F4F1',
      card: '#FFFFFF',
      primary: '#0A7C4E',
      text: '#0F1713',
      textSecondary: '#44514A',
      muted: '#8A978F',
      border: '#E5EAE4',
      error: '#E5484D',
      warning: '#F5A524',
    },
  }),
}));
```

---

## Integration Tests

Integration tests verify complete user flows across multiple screens.

### Auth Flow

```tsx
// __tests__/integration/auth-flow.test.tsx
// Tests: Login → token storage → fetch user profile → logout
```

### Ride Lifecycle

```tsx
// __tests__/integration/ride-lifecycle.test.tsx
// Tests: Request ride → accept → track → complete → rate
```

### Payment Flow

```tsx
// __tests__/integration/payment-flow.test.tsx
// Tests: Select method → process → confirm → receipt
```

### Offline Recovery

```tsx
// __tests__/integration/offline-recovery.test.tsx
// Tests: Go offline → queue actions → reconnect → flush queue
```

### Socket Reconnection

```tsx
// __tests__/integration/socket-reconnection.test.tsx
// Tests: Disconnect → retry → reconnect → restore state
```

---

## Writing New Tests

### Checklist for New Screens

1. Create test file at `__tests__/screens/<ScreenName>.test.tsx`
2. Add `describe('rendering')` block with tests for all visible elements
3. Add `describe('validation')` block if the screen has forms
4. Add `describe('submission')` block for API interactions
5. Add `describe('navigation')` block for screen transitions
6. Add `describe('error handling')` block for failure states
7. Mock all API endpoints the screen calls
8. Mock navigation hooks
9. Verify test runs: `npx jest --testPathPattern <ScreenName>`

### Example: Testing a List Screen

```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RideHistoryScreen from '../../src/screens/RideHistoryScreen';

// Mock API
jest.mock('../../src/services/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('RideHistoryScreen', () => {
  it('shows loading spinner initially', () => {
    const { getByTestId } = render(<RideHistoryScreen />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('renders ride list after loading', async () => {
    const mockRides = [
      { id: '1', status: 'completed', fare: 150, pickup: 'Home', dropoff: 'Work' },
      { id: '2', status: 'cancelled', fare: 0, pickup: 'Mall', dropoff: 'Home' },
    ];

    require('../../src/services/api').api.get.mockResolvedValue({ data: mockRides });

    const { getByText } = render(<RideHistoryScreen />);

    await waitFor(() => {
      expect(getByText('Home → Work')).toBeTruthy();
    });
  });

  it('shows empty state when no rides', async () => {
    require('../../src/services/api').api.get.mockResolvedValue({ data: [] });

    const { getByText } = render(<RideHistoryScreen />);

    await waitFor(() => {
      expect(getByText('No rides yet')).toBeTruthy();
    });
  });

  it('shows error state on API failure', async () => {
    require('../../src/services/api').api.get.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(<RideHistoryScreen />);

    await waitFor(() => {
      expect(getByText('Failed to load rides')).toBeTruthy();
    });
  });
});
```

---

## Screen Test Coverage Matrix

### Rider App (21 screens)

| Screen | P0 Tests | P1 Tests | P2 Tests | Status |
|--------|----------|----------|----------|--------|
| LoginScreen | Form, validation, submit, error, loading | | | |
| RegisterScreen | All fields, validation, submit, error | | | |
| HomeScreen | Greeting, search, tiles, map, carousel | | | |
| BookRideScreen | Inputs, fare estimate, vehicle select, submit | | | |
| RideTrackingScreen | Driver info, ETA, cancel, map updates | | | |
| PaymentScreen | Methods listed, wallet balance, confirm | | | |
| RideHistoryScreen | List, empty, pagination, refresh, detail nav | | | |
| WalletScreen | Balance, transactions, top-up, insufficient | | | |
| RatingScreen | Stars, comment, submit, cannot rate twice | | | |
| ChatScreen | Messages, send, auto-scroll, keyboard | | | |
| ProfileScreen | Info display, edit mode, logout, settings | | | |
| PromoCodeScreen | Input, apply, invalid code, discount display | | | |
| NotificationScreen | List, unread badge, mark read, empty | | | |
| RestaurantListScreen | List render, search, category filter, empty | | | |
| RestaurantMenuScreen | Menu items, add to cart, quantity, cart badge | | | |
| FoodCheckoutScreen | Summary, address validation, payment, submit | | | |
| FoodOrderTrackingScreen | Status timeline, driver info, ETA | | | |
| ConsentScreen | Checkboxes, required blocks, accept | | | |
| ForgotPasswordScreen | Email input, submit, success message | | | |
| SupportScreen | FAQ items, contact options | | | |
| RideDetailScreen | Ride info, receipt, map route | | | |

### Driver App (13 screens)

| Screen | P0 Tests | P1 Tests | P2 Tests | Status |
|--------|----------|----------|----------|--------|
| LoginScreen | Same as rider | | | |
| DashboardScreen | Online toggle, earnings card, recent trips | | | |
| RideRequestsScreen | Requests render, accept/reject, timeout | | | |
| ActiveRideScreen | Navigation, rider info, arrived button, SOS | | | |
| EarningsScreen | Daily/weekly/monthly, chart, payout, history | | | |
| TripHistoryScreen | List, filter, detail nav, pagination | | | |
| ProfileScreen | Driver info, vehicle info, documents, hours | | | |
| ChatScreen | Same as rider | | | |
| FoodDeliveryScreen | Orders list, accept, status update | | | |
| FoodOrderDetailScreen | Details, addresses, items, status actions | | | |
| DocumentsScreen | Upload, expiry warnings, renewal | | | |
| SupportScreen | FAQ, contact | | | |
| ConsentScreen | Same as rider | | | |

### Admin App (12 screens)

| Screen | P0 Tests | P1 Tests | P2 Tests | Status |
|--------|----------|----------|----------|--------|
| LoginScreen | Admin login, role verification, TOTP required | | | |
| AdminDashboardScreen | KPI cards, revenue chart, counts, feed, refresh | | | |
| RidesScreen | List, status filter, date filter, search, detail | | | |
| DriversScreen | List, approval filter, approve/reject, detail | | | |
| UsersScreen | List, search, role filter, detail, pagination | | | |
| SettingsScreen | Pricing load, save, validation, audit log | | | |
| SurgePricingScreen | Config display, multiplier, time windows, save | | | |
| SurgeZonesScreen | Zone list, create, edit, toggle active | | | |
| PeakHoursScreen | Hours list, create, edit, toggle | | | |
| RideDetailScreen | Full info, driver/rider, payment, dispute, refund | | | |
| DriverDetailScreen | Profile, documents, earnings, approval, suspend | | | |
| UserDetailScreen | Profile, ride history, wallet, account actions | | | |

### Shared Package

| Module | Tests |
|--------|-------|
| api-client | Token refresh interceptor, 401 logout, retry, base URL, timeout |
| auth | Login/logout flow, token persistence, biometric, session expiry |
| constants | VEHICLE_TYPES, PAYMENT_METHODS, RIDE_STATUS_LABELS completeness |
| theme | ThemeContext provides colors, useTheme returns valid theme |
| utils/formatters | Currency (ZAR), distance (km), time, phone number |
| utils/validators | Email, phone (+27), password strength, name |

---

*Last updated: 2026-07-19*
