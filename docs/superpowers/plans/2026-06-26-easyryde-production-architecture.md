# EasyRyde Production Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all architectural issues blocking production deployment of the EasyRyde ride-hailing platform across rider, driver, and admin apps.

**Architecture:** Merge orphaned rider screens into a unified navigation tree, extract shared logic to packages, wire real-time socket integration across all apps, and establish production-ready state management and testing patterns.

**Tech Stack:** Laravel PHP (backend), Node.js + Socket.io + Redis (real-time), React Native Expo (mobile), React + Vite + Tailwind (web admin)

---

## Executive Summary

### Critical Issues Found

1. **Rider App Dual-Screen Problem**: `src/screens/` (4 screens, wired) vs `screens/` (14 screens, orphaned but production-ready). The orphaned screens have socket integration, animated markers, polyline routes, food delivery, wallet, chat - all missing from the wired screens.

2. **Driver App Inline Location Tracking**: `DashboardScreen.tsx:11-17` defines its own `TaskManager.defineTask` inline. `src/hooks/useLocationTracking.ts` and `src/services/locationService.ts` exist but are unused.

3. **Admin App Missing 9 Screens**: Only 7 screens wired. Backend has endpoints for: compliance/KYC, incidents, audit logs, reporting, payouts, SOS management, promo management, notification broadcast, live driver map.

4. **Rider App Missing Navigation Types**: `@easyryde/shared` types define `RiderStackParamList` with BookRide, RideTracking, Payment, Chat, Wallet, Food screens - but App.tsx only wires Home, Activity, Profile.

### Resolution Strategy

**Adopt `screens/` as the primary codebase for rider app.** The orphaned screens are more complete, have real-time integration, and match the backend API surface. The `src/screens/` versions are simpler stubs that should be deprecated.

---

## Phase 1: Rider App - Resolve Dual-Screen Crisis

### Task 1: Audit and Document Screen Comparison

**Files:**
- Read: `mobile/apps/rider/src/screens/*.tsx` (4 files)
- Read: `mobile/apps/rider/screens/*.tsx` (14 files)
- Create: `docs/rider-screen-audit.md`

- [ ] **Step 1: Create comparison matrix document**

Document which version of each screen is more complete. Key findings:

| Screen | `src/screens/` | `screens/` | Winner |
|--------|----------------|------------|--------|
| HomeScreen | Basic map + categories | Full map + categories | `src/screens/` (wired) |
| LoginScreen | Basic | Full with register | `screens/` |
| ProfileScreen | Basic | Full | `screens/` |
| RideHistoryScreen | Basic | Full | `screens/` |
| BookRideScreen | MISSING | Full + places API | `screens/` |
| RideTrackingScreen | MISSING | Full + socket + animated markers | `screens/` |
| PaymentScreen | MISSING | Full | `screens/` |
| ChatScreen | MISSING | Full + socket | `screens/` |
| WalletScreen | MISSING | Full | `screens/` |
| FoodCheckoutScreen | MISSING | Full | `screens/` |
| FoodOrderTrackingScreen | MISSING | Full | `screens/` |
| RestaurantListScreen | MISSING | Full | `screens/` |
| RestaurantMenuScreen | MISSING | Full | `screens/` |

- [ ] **Step 2: Document orphaned screen capabilities**

The `screens/` directory contains production-ready implementations with:
- Socket.io integration (`ride:accepted`, `ride:arrived`, `ride:started`, `ride:completed`, `ride:cancelled`, `driver:location`)
- Animated driver markers with smooth interpolation (`RideTrackingScreen.tsx:10-55`)
- Polyline route rendering with `decodePolyline`
- Real-time ETA calculations
- Rating system post-ride
- Chat with driver via socket
- Food delivery ordering flow
- Wallet management

- [ ] **Step 3: Commit audit**

```bash
git add docs/
git commit -m "docs: rider screen audit - dual screen comparison"
```

### Task 2: Merge Strategy - Adopt screens/ as Primary

**Files:**
- Create: `mobile/apps/rider/src/navigation/types.ts`
- Create: `mobile/apps/rider/src/navigation/RiderNavigator.tsx`
- Modify: `mobile/apps/rider/App.tsx`
- Delete: `mobile/apps/rider/src/screens/` (after verification)

- [ ] **Step 1: Create unified navigation types**

```typescript
// mobile/apps/rider/src/navigation/types.ts
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp, NavigatorScreenParams } from '@react-navigation/native';

export type RiderAuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RiderMainTabParamList = {
  Home: { dropoff?: { id: string; name: string; lat: number; lng: number } } | undefined;
  Activity: undefined;
  Profile: undefined;
  Wallet: undefined;
};

export type RiderStackParamList = {
  Main: NavigatorScreenParams<RiderMainTabParamList>;
  BookRide: { pickup?: { lat: number; lng: number; address: string }; dropoff?: string };
  RideTracking: { rideId: string };
  Payment: { rideId: string };
  Chat: { rideId: string; receiverId: string };
  RestaurantList: undefined;
  RestaurantMenu: { restaurantId: string };
  FoodCheckout: { restaurantId: string; restaurantName: string; cart: any[]; subtotal: number; deliveryFee: number };
  FoodOrderTracking: { orderId: string };
};

export type RiderAuthNav = NativeStackNavigationProp<RiderAuthStackParamList>;
export type RiderNav = NativeStackNavigationProp<RiderStackParamList>;
export type RiderRoute<R extends keyof RiderStackParamList> = RouteProp<RiderStackParamList, R>;
```

- [ ] **Step 2: Create unified RiderNavigator**

```typescript
// mobile/apps/rider/src/navigation/RiderNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@easyryde/shared';

import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import HomeScreen from '../../screens/HomeScreen';
import RideHistoryScreen from '../../screens/RideHistoryScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import WalletScreen from '../../screens/WalletScreen';
import BookRideScreen from '../../screens/BookRideScreen';
import RideTrackingScreen from '../../screens/RideTrackingScreen';
import PaymentScreen from '../../screens/PaymentScreen';
import ChatScreen from '../../screens/ChatScreen';
import RestaurantListScreen from '../../screens/RestaurantListScreen';
import RestaurantMenuScreen from '../../screens/RestaurantMenuScreen';
import FoodCheckoutScreen from '../../screens/FoodCheckoutScreen';
import FoodOrderTrackingScreen from '../../screens/FoodOrderTrackingScreen';

import type { RiderStackParamList, RiderMainTabParamList, RiderAuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<RiderAuthStackParamList>();
const MainStack = createNativeStackNavigator<RiderStackParamList>();
const Tab = createBottomTabNavigator<RiderMainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Activity') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Wallet') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Activity" component={RideHistoryScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RiderNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <MainStack.Screen name="Main" component={MainTabs} />
      <MainStack.Screen name="BookRide" component={BookRideScreen} />
      <MainStack.Screen name="RideTracking" component={RideTrackingScreen} />
      <MainStack.Screen name="Payment" component={PaymentScreen} />
      <MainStack.Screen name="Chat" component={ChatScreen} />
      <MainStack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <MainStack.Screen name="RestaurantMenu" component={RestaurantMenuScreen} />
      <MainStack.Screen name="FoodCheckout" component={FoodCheckoutScreen} />
      <MainStack.Screen name="FoodOrderTracking" component={FoodOrderTrackingScreen} />
    </MainStack.Navigator>
  );
}
```

- [ ] **Step 3: Update App.tsx**

```typescript
// mobile/apps/rider/App.tsx
import React from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, theme, useAuth, ErrorBoundary } from '@easyryde/shared';

import RiderNavigator from './src/navigation/RiderNavigator';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

const AuthStack = createNativeStackNavigator();

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.bg,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
      }}
    >
      <ErrorBoundary>
        {isAuthenticated ? (
          <RiderNavigator />
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
          </AuthStack.Navigator>
        )}
      </ErrorBoundary>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
});
```

- [ ] **Step 4: Remove deprecated src/screens/**

```bash
rm -rf mobile/apps/rider/src/screens
```

- [ ] **Step 5: Commit navigation merge**

```bash
git add mobile/apps/rider/
git commit -m "feat(rider): merge orphaned screens into unified navigation tree

- Adopt screens/ as primary codebase (14 production-ready screens)
- Create RiderNavigator with full navigation tree
- Wire BookRide, RideTracking, Payment, Chat, Wallet, Food screens
- Remove deprecated src/screens/ (4 basic stubs)
- All 14 screens now accessible from App.tsx"
```

---

## Phase 2: Driver App - Fix Location Tracking

### Task 3: Extract Location Tracking to Reusable Hook

**Files:**
- Create: `mobile/apps/driver/src/hooks/useLocationTracking.ts`
- Modify: `mobile/apps/driver/screens/DashboardScreen.tsx`
- Delete: `mobile/apps/driver/src/services/locationService.ts`

- [ ] **Step 1: Create useLocationTracking hook**

```typescript
// mobile/apps/driver/src/hooks/useLocationTracking.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { drivers } from '@easyryde/shared';

const LOCATION_TASK_NAME = 'easyryde-background-location';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error || !data) return;
  const { locations } = data;
  if (!locations?.length) return;
  const { latitude, longitude } = locations[locations.length - 1].coords;
  try {
    await drivers.updateLocation(latitude, longitude);
  } catch (err) {
    console.warn('[LocationTracking] Failed to update location:', err);
  }
});

interface UseLocationTrackingOptions {
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function useLocationTracking(options?: UseLocationTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  const checkPermission = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermission(status);
    return status;
  }, []);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status);
    if (status !== 'granted') return false;
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  }, []);

  const startForegroundTracking = useCallback(async () => {
    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 50 },
      (location) => {
        const { latitude, longitude } = location.coords;
        options?.onLocationUpdate?.(latitude, longitude);
        drivers.updateLocation(latitude, longitude).catch(() => {});
      }
    );
    locationWatcher.current = watcher;
    setIsTracking(true);
  }, [options]);

  const stopForegroundTracking = useCallback(() => {
    locationWatcher.current?.remove();
    locationWatcher.current = null;
  }, []);

  const startBackgroundTracking = useCallback(async () => {
    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status !== 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }
    const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
    if (isTaskDefined) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'EasyRyde',
          notificationBody: 'Location tracking active for ride requests',
        },
      });
    }
  }, []);

  const stopBackgroundTracking = useCallback(async () => {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }, []);

  const startTracking = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return false;
    await startForegroundTracking();
    return true;
  }, [requestPermission, startForegroundTracking]);

  const stopTracking = useCallback(() => {
    stopForegroundTracking();
    stopBackgroundTracking();
    setIsTracking(false);
  }, [stopForegroundTracking, stopBackgroundTracking]);

  useEffect(() => { checkPermission(); }, [checkPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active|foreground/) && nextAppState === 'background') {
        if (isTracking) startBackgroundTracking();
      }
      if (appState.current === 'background' && nextAppState === 'active') {
        if (isTracking) {
          stopBackgroundTracking();
          startForegroundTracking();
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isTracking]);

  useEffect(() => {
    return () => { stopForegroundTracking(); stopBackgroundTracking(); };
  }, []);

  return { isTracking, permission, startTracking, stopTracking, checkPermission };
}
```

- [ ] **Step 2: Refactor DashboardScreen to use hook**

Remove inline `TaskManager.defineTask` (lines 11-17), remove inline location functions, import and use `useLocationTracking` hook instead.

- [ ] **Step 3: Delete unused locationService.ts**

```bash
rm mobile/apps/driver/src/services/locationService.ts
```

- [ ] **Step 4: Commit driver refactoring**

```bash
git add mobile/apps/driver/
git commit -m "refactor(driver): extract location tracking to reusable hook

- Create useLocationTracking hook with foreground/background support
- Remove inline TaskManager.defineTask from DashboardScreen
- Delete unused locationService.ts
- Hook handles permission, AppState transitions, cleanup"
```

---

## Phase 3: Admin App - Add Missing Screens

### Task 4: Create Missing Admin Screens

**Files:**
- Create: `mobile/apps/admin/screens/ComplianceScreen.tsx`
- Create: `mobile/apps/admin/screens/IncidentsScreen.tsx`
- Create: `mobile/apps/admin/screens/AuditLogsScreen.tsx`
- Create: `mobile/apps/admin/screens/ReportingScreen.tsx`
- Create: `mobile/apps/admin/screens/PayoutsScreen.tsx`
- Create: `mobile/apps/admin/screens/SosManagementScreen.tsx`
- Create: `mobile/apps/admin/screens/PromoManagementScreen.tsx`
- Create: `mobile/apps/admin/screens/NotificationBroadcastScreen.tsx`
- Create: `mobile/apps/admin/screens/LiveDriverMapScreen.tsx`
- Modify: `mobile/apps/admin/App.tsx`

- [ ] **Step 1: Create ComplianceScreen (KYC management)**

API endpoints: `GET /admin/compliance/kyc/pending`, `POST /admin/compliance/kyc/{id}/approve`, `POST /admin/compliance/kyc/{id}/reject`

- [ ] **Step 2: Create IncidentsScreen**

API endpoints: `GET /admin/compliance/incidents`, `GET /admin/compliance/incidents/open`, `POST /admin/compliance/incidents/{id}/assign`, `POST /admin/compliance/incidents/{id}/resolve`

- [ ] **Step 3: Create AuditLogsScreen**

API endpoint: `GET /admin/audit-logs`

- [ ] **Step 4: Create ReportingScreen**

API endpoints: `GET /admin/reports/dashboard`, `GET /admin/reports/revenue`, `GET /admin/reports/drivers`, `GET /admin/reports/rides`

- [ ] **Step 5: Create PayoutsScreen**

API endpoints: `GET /admin/payouts`, `GET /admin/payouts/summary`, `POST /admin/payouts/{id}/retry`

- [ ] **Step 6: Create SosManagementScreen**

API endpoints: `GET /sos/active`, `POST /sos/{id}/acknowledge`, `POST /sos/{id}/resolve`

- [ ] **Step 7: Create PromoManagementScreen**

API endpoints: `GET /promo-codes`, `POST /promo-codes`, `PUT /promo-codes/{id}`, `DELETE /promo-codes/{id}`

- [ ] **Step 8: Create NotificationBroadcastScreen**

API endpoint: Use socket `admin:broadcast` event

- [ ] **Step 9: Create LiveDriverMapScreen**

Use `@easyryde/maps` AnimatedDriverMarker component with socket `driver:location` events

- [ ] **Step 10: Update App.tsx navigation**

Add all new screens to the navigation tree (tab + stack screens).

- [ ] **Step 11: Commit admin expansion**

```bash
git add mobile/apps/admin/
git commit -m "feat(admin): add 9 missing screens for production

- ComplianceScreen (KYC approval/rejection)
- IncidentsScreen (incident management)
- AuditLogsScreen (audit trail)
- ReportingScreen (dashboard, revenue, drivers, rides)
- PayoutsScreen (payout management)
- SosManagementScreen (SOS alerts)
- PromoManagementScreen (promo code CRUD)
- NotificationBroadcastScreen (push notifications)
- LiveDriverMapScreen (real-time driver tracking)"
```

---

## Phase 4: API Integration Audit

### Task 5: Map Screens to Backend Endpoints

**Files:**
- Read: `backend/routes/api.php`
- Create: `docs/api-integration-audit.md`

- [ ] **Step 1: Create endpoint mapping**

```
RIDER APP:
  BookRideScreen:
    - GET /places/search (destination search)
    - GET /rides/fare-estimate (fare calculation)
    - POST /rides (create ride)
  
  RideTrackingScreen:
    - GET /rides/{id} (ride details)
    - POST /rides/{id}/cancel
    - POST /rides/{id}/rate
    - Socket: ride:accepted, ride:arrived, ride:started, ride:completed, ride:cancelled
    - Socket: driver:location
  
  PaymentScreen:
    - GET /payments/methods
    - POST /payments/rides/{ride}/pay
    - POST /payments/stripe/create-intent
    - POST /payments/stripe/confirm
  
  ChatScreen:
    - GET /chat/rides/{ride}/messages
    - POST /chat/rides/{ride}/messages
    - Socket: chat:message
  
  WalletScreen:
    - GET /wallet
    - GET /wallet/transactions
    - POST /wallet/deposit
    - POST /wallet/withdraw
  
  FoodDelivery:
    - GET /food/restaurants
    - GET /food/restaurants/{id}/menu
    - POST /food/restaurants/{id}/order
    - GET /food/orders
    - Socket: food:order:update

DRIVER APP:
  DashboardScreen:
    - POST /drivers/toggle-online
    - GET /drivers/earnings
    - Socket: ride:request, driver:location-update
  
  ActiveRideScreen:
    - POST /rides/{id}/driver-accept
    - POST /rides/{id}/driver-arrived
    - POST /rides/{id}/start
    - POST /rides/{id}/complete
    - POST /rides/{id}/location
  
  FoodDeliveryScreen:
    - GET /driver/food/orders/available
    - POST /driver/food/orders/{id}/accept
    - POST /driver/food/orders/{id}/status

ADMIN APP:
  DashboardScreen:
    - GET /admin/dashboard
  
  UsersScreen:
    - GET /admin/users
  
  DriversScreen:
    - GET /admin/drivers
    - POST /admin/drivers/{id}/approve
    - POST /admin/drivers/{id}/reject
  
  RidesScreen:
    - GET /admin/rides
  
  ComplianceScreen:
    - GET /admin/compliance/kyc/pending
    - POST /admin/compliance/kyc/{id}/approve
    - POST /admin/compliance/kyc/{id}/reject
  
  IncidentsScreen:
    - GET /admin/compliance/incidents
    - GET /admin/compliance/incidents/open
    - POST /admin/compliance/incidents/{id}/assign
    - POST /admin/compliance/incidents/{id}/resolve
  
  ReportingScreen:
    - GET /admin/reports/dashboard
    - GET /admin/reports/revenue
    - GET /admin/reports/drivers
    - GET /admin/reports/rides
  
  PayoutsScreen:
    - GET /admin/payouts
    - GET /admin/payouts/summary
    - POST /admin/payouts/{id}/retry
  
  SosManagementScreen:
    - GET /sos/active
    - POST /sos/{id}/acknowledge
    - POST /sos/{id}/resolve
  
  PromoManagementScreen:
    - GET /promo-codes
    - POST /promo-codes
    - PUT /promo-codes/{id}
    - DELETE /promo-codes/{id}
```

- [ ] **Step 2: Identify API gaps**

Check which screens reference endpoints that don't exist in `api.php`. Document missing endpoints.

- [ ] **Step 3: Commit audit**

```bash
git add docs/
git commit -m "docs: API integration audit - screen to endpoint mapping"
```

---

## Phase 5: Real-time Architecture

### Task 6: Socket.io Event Map

**Files:**
- Read: `socket-server/src/handlers/*.js`
- Create: `docs/socket-events.md`

- [ ] **Step 1: Document all socket events**

```
ROOMS:
  - user:{userId} (all authenticated users)
  - driver:{userId} (drivers only)
  - admin (admin/super-admin only)
  - ride:{rideId} (ride participants)
  - chat:{rideId} (chat participants)

EVENTS (Client → Server):
  driver:location-update { latitude, longitude }
  driver:accept-ride { rideId, riderId }
  driver:update-status { rideId, status }
  chat:send-message { rideId, receiverId, message }
  chat:typing { rideId, receiverId }
  admin:broadcast { title, body, targetRole }

EVENTS (Server → Client):
  ride:request { rideId, riderId, pickup, dropoff, distance, fare }
  ride:accepted { rideId, driver }
  ride:arrived { rideId }
  ride:started { rideId }
  ride:completed { rideId, fare }
  ride:cancelled { rideId, reason }
  driver:location { driverId, latitude, longitude }
  chat:message { rideId, senderId, message, timestamp }
  chat:typing { rideId, senderId }
  food:order:update { orderId, status }
  admin:notification { type, data }
```

- [ ] **Step 2: Verify all handlers exist**

Check `socket-server/src/handlers/` has: driver.js, ride.js, chat.js, delivery.js, admin.js, foodOrder.js

- [ ] **Step 3: Commit event map**

```bash
git add docs/
git commit -m "docs: socket.io event map - rooms, events, flow"
```

---

## Phase 6: State Management

### Task 7: Define State Architecture

**Files:**
- Read: `mobile/packages/shared/src/hooks/useAuth.ts`
- Read: `mobile/packages/shared/src/hooks/useSocket.ts`
- Read: `mobile/packages/shared/src/hooks/useNotifications.ts`
- Create: `docs/state-architecture.md`

- [ ] **Step 1: Document current state flow**

```
AUTH STATE (useAuth):
  - user: User | null
  - token: string | null
  - isAuthenticated: boolean
  - isLoading: boolean
  - login(), logout(), register()
  - Stored in AsyncStorage

SOCKET STATE (useSocket):
  - isConnected: boolean
  - emit(event, data)
  - on(event, callback) → unsubscribe function
  - Reconnects automatically
  - Token-based auth middleware

NOTIFICATION STATE (useNotifications):
  - Registers for push notifications
  - Handles notification taps for navigation
  - Stores FCM token via API

RIDE STATE (per-screen):
  - Each screen manages its own ride state via useState
  - No global ride state manager
  - Socket events trigger state updates inline

LOCATION STATE (driver only):
  - useLocationTracking hook manages tracking
  - Foreground/background transitions
  - AppState listener for background tracking
```

- [ ] **Step 2: Identify state issues**

1. **No global ride state**: Each screen independently fetches ride data. When ride status changes via socket, only the currently visible screen updates. Other screens don't know about ride changes.

2. **No ride queue for drivers**: When multiple ride requests come in, there's no queue mechanism. Each request shows as an Alert.

3. **Chat state is ephemeral**: Messages are fetched on screen mount, not cached. Navigating away and back re-fetches everything.

- [ ] **Step 3: Document recommended state architecture**

```
RECOMMENDED:
  - Keep useAuth as-is (works well)
  - Keep useSocket as-is (works well)
  - Add useRideContext for global ride state
  - Add useChatContext for message caching
  - Keep useLocationTracking as-is (just extracted)

PATTERN:
  <AuthProvider>
    <SocketProvider>
      <RideProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </RideProvider>
    </SocketProvider>
  </AuthProvider>
```

- [ ] **Step 4: Commit state architecture**

```bash
git add docs/
git commit -m "docs: state management architecture - current vs recommended"
```

---

## Phase 7: Performance Concerns

### Task 8: Performance Audit

**Files:**
- Create: `docs/performance-audit.md`

- [ ] **Step 1: Document performance concerns**

```
MAP PERFORMANCE:
  - react-native-maps re-renders on every driver location update
  - Animated driver markers use Animated.Value listeners (主线程阻塞)
  - Polyline coordinates stored in state, cause full map re-render
  - FIX: Use useMemo for polyline, debounce driver location updates

LOCATION TRACKING BATTERY:
  - Distance interval 50m is aggressive for background tracking
  - Background tracking uses Accuracy.High constantly
  - FIX: Use Accuracy.Balanced for background, Accuracy.High for active rides only

BUNDLE SIZE:
  - All 3 apps import full @easyryde/shared package
  - expo-linear-gradient, expo-location, react-native-maps are heavy
  - FIX: Tree-shaking, lazy load non-critical screens

RE-RENDER ISSUES:
  - RideTrackingScreen re-renders on every driver:location event
  - AnimatedDriverMarker creates new Animated.Value on each coord change
  - FIX: Debounce location updates (1s interval), use React.memo

STATE UPDATES:
  - Socket event handlers trigger setState on every event
  - No batching of rapid state updates
  - FIX: Use useReducer with batched updates
```

- [ ] **Step 2: Create optimization tasks**

1. Debounce driver location updates to 1-second intervals
2. Use `Accuracy.Balanced` for background tracking
3. Memoize polyline coordinates with `useMemo`
4. Add `React.memo` to AnimatedDriverMarker
5. Lazy load food delivery screens
6. Add loading skeletons for all data-fetching screens

- [ ] **Step 3: Commit performance audit**

```bash
git add docs/
git commit -m "docs: performance audit - map, location, bundle, re-render issues"
```

---

## Phase 8: Technical Debt

### Task 9: Technical Debt Inventory

**Files:**
- Create: `docs/technical-debt.md`

- [ ] **Step 1: Document all technical debt**

```
CRITICAL (Must fix before production):
  1. Rider app dual-screen problem (Phase 1 resolves this)
  2. Driver inline location tracking (Phase 2 resolves this)
  3. Admin missing 9 screens (Phase 3 resolves this)
  4. No error boundary in rider app (added in Phase 1)
  5. No loading state in rider App.tsx (added in Phase 1)

HIGH (Should fix before production):
  1. No offline support - app crashes without internet
  2. No retry logic for failed API calls
  3. No request caching - every screen fetches on mount
  4. Chat messages not persisted locally
  5. No ride receipt generation in rider app

MEDIUM (Fix after MVP):
  1. No analytics/tracking
  2. No crash reporting (Sentry)
  3. No feature flags
  4. No A/B testing infrastructure
  5. No i18n beyond basic setup

LOW (Fix when possible):
  1. Code style inconsistencies across screens
  2. Mixed use of TypeScript vs JavaScript in socket-server
  3. No API response caching layer
  4. No pagination for long lists
  5. No pull-to-refresh on data screens
```

- [ ] **Step 2: Commit debt inventory**

```bash
git add docs/
git commit -m "docs: technical debt inventory - critical, high, medium, low"
```

---

## Phase 9: Testing Strategy

### Task 10: Define Testing Approach

**Files:**
- Create: `docs/testing-strategy.md`

- [ ] **Step 1: Document testing strategy**

```
UNIT TESTS (Jest + React Native Testing Library):
  - Hooks: useLocationTracking, useAuth, useSocket
  - Utils: decodePolyline, fare calculation, date formatting
  - Components: GlowButton, GlassCard, GradientText
  - API client: request/response handling, auth token injection

INTEGRATION TESTS:
  - Navigation flow: Login → Home → BookRide → RideTracking
  - Socket connection: connect, authenticate, subscribe, disconnect
  - API integration: ride creation, payment processing
  - Location tracking: permission → start → update → stop

E2E TESTS (Detox or Maestro):
  - Rider: Complete ride booking flow
  - Driver: Go online → accept ride → complete ride
  - Admin: Login → view dashboard → approve driver
  - Food: Browse → order → track → rate

COVERAGE TARGETS:
  - Unit: 80% coverage on hooks and utils
  - Integration: All navigation flows
  - E2E: Critical user journeys (5-10 scenarios)
```

- [ ] **Step 2: Create test file structure**

```
mobile/
  __tests__/
    hooks/
      useLocationTracking.test.ts
      useAuth.test.ts
      useSocket.test.ts
    utils/
      decodePolyline.test.ts
      fareCalculation.test.ts
    components/
      GlowButton.test.tsx
      GlassCard.test.tsx
  e2e/
    rider/
      booking-flow.test.ts
      food-ordering.test.ts
    driver/
      online-offline.test.ts
      ride-completion.test.ts
    admin/
      dashboard.test.ts
```

- [ ] **Step 3: Commit testing strategy**

```bash
git add docs/
git commit -m "docs: testing strategy - unit, integration, E2E approach"
```

---

## Phase 10: Build & Deploy

### Task 11: EAS Build Configuration

**Files:**
- Read: `mobile/apps/rider/eas.json`
- Read: `mobile/apps/driver/eas.json`
- Read: `mobile/apps/admin/eas.json`
- Create: `docs/build-deploy.md`

- [ ] **Step 1: Document EAS build setup**

```
EAS BUILD PROFILES:
  - development: Internal testing, dev client
  - preview: Staging, test builds
  - production: App Store / Play Store release

VERSIONING STRATEGY:
  - Use expo version (1.0.0) for major releases
  - Use build numbers for patches
  - semantic versioning: MAJOR.MINOR.PATCH

OTA UPDATES:
  - Use expo-updates for JavaScript bundle updates
  - Push critical fixes without app store review
  - Use branch-based updates for staged rollouts

DEPLOYMENT PIPELINE:
  1. Push to main → EAS Build (preview profile)
  2. QA testing on build
  3. Merge to release → EAS Build (production profile)
  4. Submit to App Store / Play Store
  5. OTA update for JS-only changes
```

- [ ] **Step 2: Document environment variables**

```
RIDER APP (.env):
  EXPO_PUBLIC_API_URL=https://api.easyryde.com
  EXPO_PUBLIC_SOCKET_URL=wss://socket.easyryde.com
  EXPO_PUBLIC_MAPS_KEY=google_maps_key

DRIVER APP (.env):
  EXPO_PUBLIC_API_URL=https://api.easyryde.com
  EXPO_PUBLIC_SOCKET_URL=wss://socket.easyryde.com

ADMIN APP (.env):
  EXPO_PUBLIC_API_URL=https://api.easyryde.com
  EXPO_PUBLIC_SOCKET_URL=wss://socket.easyryde.com
```

- [ ] **Step 3: Commit build docs**

```bash
git add docs/
git commit -m "docs: build and deploy - EAS, versioning, OTA updates"
```

---

## Execution Order

Execute phases in this order:

1. **Phase 1** (Rider merge) - CRITICAL, blocks everything
2. **Phase 2** (Driver location) - HIGH, production requirement
3. **Phase 3** (Admin screens) - HIGH, production requirement
4. **Phase 4** (API audit) - MEDIUM, validates integration
5. **Phase 5** (Socket events) - MEDIUM, documents real-time flow
6. **Phase 6** (State management) - MEDIUM, improves architecture
7. **Phase 7** (Performance) - MEDIUM, production optimization
8. **Phase 8** (Technical debt) - LOW, ongoing cleanup
9. **Phase 9** (Testing) - HIGH, production requirement
10. **Phase 10** (Build & deploy) - HIGH, production deployment

---

## Success Criteria

- [ ] Rider app has all 14 screens wired and functional
- [ ] Driver app location tracking extracted to reusable hook
- [ ] Admin app has all 17 screens (7 existing + 9 new + LiveDriverMap)
- [ ] All screens mapped to backend endpoints
- [ ] Socket events documented and verified
- [ ] State architecture documented
- [ ] Performance issues identified and prioritized
- [ ] Technical debt inventory complete
- [ ] Testing strategy defined
- [ ] Build and deploy pipeline documented
