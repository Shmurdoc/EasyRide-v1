# EasyRyde Admin App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete EasyRyde Admin app — a React Native/Expo operations dashboard with real-time fleet monitoring, ride/driver/user management, financial analytics, and system configuration.

**Architecture:** Expo managed workflow, React Navigation (Stack + Bottom Tabs), screen-level custom hooks for data fetching, shared AuthProvider from `packages/shared`. Map on Dashboard only (react-native-maps). All data from existing backend API endpoints (`/admin/*`).

**Tech Stack:** React Native, Expo, TypeScript, react-navigation, react-native-maps, react-native-chart-kit, AsyncStorage

---

## Phase 1: Project Setup & Navigation

### Task 1: Scaffold Admin App

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/app.json`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/babel.config.js`
- Create: `apps/admin/index.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@easyryde/admin",
  "version": "4.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "react": "18.3.1",
    "react-native": "0.76.7",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/stack": "^7.0.0",
    "react-native-screens": "~4.4.0",
    "react-native-safe-area-context": "~4.14.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-maps": "1.20.1",
    "@expo/vector-icons": "^14.0.0",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "~15.8.0",
    "expo-linear-gradient": "~14.0.0",
    "@easyryde/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0"
  }
}
```

- [ ] **Step 2: Create app.json**

```json
{
  "expo": {
    "name": "EasyRyde Admin",
    "slug": "easyryde-admin",
    "version": "4.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#6366f1"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "za.co.easyryde.admin"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#6366f1"
      },
      "package": "za.co.easyryde.admin",
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION"]
    },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 3: Create index.js**

```javascript
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../packages/shared/src/*"]
    }
  }
}
```

- [ ] **Step 5: Create babel.config.js**

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

- [ ] **Step 6: Install dependencies**

Run: `cd F:\EasyRyde\mobile\apps\admin && npm install`

- [ ] **Step 7: Commit**

```bash
git add apps/admin/
git commit -m "feat(admin): scaffold admin app with Expo and dependencies"
```

---

### Task 2: Theme Constants

**Files:**
- Create: `apps/admin/constants/theme.ts`

- [ ] **Step 1: Create theme constants**

```typescript
// apps/admin/constants/theme.ts
export const ADMIN_COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#0f0f11',
  surface: '#1a1a1e',
  surfaceLight: '#252529',
  text: '#ffffff',
  textMuted: '#9ca3af',
  green: '#16a34a',
  orange: '#FFAD7A',
  red: '#dc2626',
  blue: '#3b82f6',
  yellow: '#f59e0b',
} as const;

export const ADMIN_GRADIENTS = {
  header: ['#6366f1', '#4f46e5'] as const,
  primary: ['#6366f1', '#4f46e5'] as const,
} as const;

export const ADMIN_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/constants/theme.ts
git commit -m "feat(admin): add theme constants"
```

---

### Task 3: API Layer

**Files:**
- Create: `apps/admin/api/types.ts`
- Create: `apps/admin/api/admin.ts`

- [ ] **Step 1: Create API types**

```typescript
// apps/admin/api/types.ts
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface AdminDashboardData {
  total_users: number;
  total_drivers: number;
  total_rides: number;
  active_rides: number;
  total_revenue: number;
  rides_today: number;
  completed_today: number;
  revenue_today: number;
}

export interface AdminDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_online: boolean;
  created_at: string;
  driverProfile: {
    id: string;
    is_approved: boolean;
    is_verified: boolean;
    rating: number;
    total_trips: number;
    total_earnings: number;
    license_number: string;
    license_expiry: string;
    background_check: boolean;
    approved_at: string | null;
    approved_by: string | null;
    latitude: number | null;
    longitude: number | null;
    current_zone: string | null;
  } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
    vehicle_type: string;
  } | null;
}

export interface AdminRide {
  id: string;
  status: 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  total_fare: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  rider: { id: string; name: string; email: string; phone: string };
  driver: {
    id: string; name: string; email: string; phone: string;
    vehicle?: { make: string; model: string; color: string; license_plate: string };
  } | null;
  payment: { method: string; status: string; amount: number } | null;
  rating: { score: number; comment: string } | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminSetting {
  value: string;
  type: string;
  description: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user: { name: string };
  created_at: string;
}

export interface RideQuery {
  status?: string;
  category?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DriverQuery {
  is_online?: boolean;
  is_approved?: boolean;
  is_verified?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface UserQuery {
  role?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}
```

- [ ] **Step 2: Create API functions**

```typescript
// apps/admin/api/admin.ts
import { apiGet, apiPost } from '../../../packages/shared/src/api/client';
import type {
  AdminDashboardData, PaginatedResponse, AdminDriver,
  AdminRide, AdminUser, AdminSetting, AuditLog,
  RideQuery, DriverQuery, UserQuery,
} from './types';

// Dashboard
export const getAdminDashboard = (): Promise<AdminDashboardData> =>
  apiGet('/admin/dashboard');

// Rides
export const getAdminRides = (params: RideQuery): Promise<PaginatedResponse<AdminRide>> =>
  apiGet('/admin/rides', params);

// Drivers
export const getAdminDrivers = (params: DriverQuery): Promise<PaginatedResponse<AdminDriver>> =>
  apiGet('/admin/drivers', params);

export const approveDriver = (id: string): Promise<{ message: string }> =>
  apiPost(`/admin/drivers/${id}/approve`);

export const rejectDriver = (id: string): Promise<{ message: string }> =>
  apiPost(`/admin/drivers/${id}/reject`);

// Users
export const getAdminUsers = (params: UserQuery): Promise<PaginatedResponse<AdminUser>> =>
  apiGet('/admin/users', params);

// Settings
export const getAdminSettings = (): Promise<Record<string, AdminSetting>> =>
  apiGet('/admin/settings');

export const updateAdminSetting = (data: { key: string; value: string; type: string; description?: string }): Promise<{ id: string }> =>
  apiPost('/admin/settings', data);

// Reports
export const getRevenueReport = (params: { period?: string; from_date?: string; to_date?: string }): Promise<any> =>
  apiGet('/admin/reports/revenue', params);

// Audit Logs
export const getAuditLogs = (params: { per_page?: number; page?: number }): Promise<PaginatedResponse<AuditLog>> =>
  apiGet('/admin/audit-logs', params);
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/api/
git commit -m "feat(admin): add API types and functions"
```

---

### Task 4: Common Components

**Files:**
- Create: `apps/admin/components/common/Card.tsx`
- Create: `apps/admin/components/common/StatCard.tsx`
- Create: `apps/admin/components/common/Badge.tsx`
- Create: `apps/admin/components/common/Avatar.tsx`
- Create: `apps/admin/components/common/SearchBar.tsx`
- Create: `apps/admin/components/common/FilterTabs.tsx`
- Create: `apps/admin/components/common/EmptyState.tsx`
- Create: `apps/admin/components/common/LoadingSpinner.tsx`
- Create: `apps/admin/components/common/ErrorState.tsx`
- Create: `apps/admin/components/common/ProgressBar.tsx`

- [ ] **Step 1: Create Card component**

```tsx
// apps/admin/components/common/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceLight,
  },
});
```

- [ ] **Step 2: Create StatCard component**

```tsx
// apps/admin/components/common/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ADMIN_COLORS } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.card}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.value}>{typeof value === 'number' && label.toLowerCase().includes('revenue') ? `R${value.toLocaleString()}` : value}</Text>
      {trend && (
        <Text style={styles.trend}>{trend}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  trend: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
```

- [ ] **Step 3: Create Badge component**

```tsx
// apps/admin/components/common/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

type BadgeVariant = 'online' | 'offline' | 'busy' | 'active' | 'pending';

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  online: { bg: 'rgba(22,163,74,0.2)', text: '#4ade80' },
  offline: { bg: 'rgba(220,38,38,0.2)', text: '#f87171' },
  busy: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  active: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8' },
  pending: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
};

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function Badge({ variant, label }: BadgeProps) {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.active;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 4: Create Avatar component**

```tsx
// apps/admin/components/common/Avatar.tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  borderColor?: string;
}

export function Avatar({ name, size = 48, imageUrl, borderColor }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const bgColors = ['#6366f1', '#16a34a', '#FFAD7A', '#3b82f6', '#dc2626', '#f59e0b'];
  const bgColor = bgColors[name.length % bgColors.length];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor || ADMIN_COLORS.surface,
        }]}
      />
    );
  }

  return (
    <View style={[styles.container, {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
      borderColor: borderColor || ADMIN_COLORS.surface,
    }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  image: {
    borderWidth: 2,
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
```

- [ ] **Step 5: Create SearchBar component**

```tsx
// apps/admin/components/common/SearchBar.tsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={ADMIN_COLORS.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={ADMIN_COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceLight,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: ADMIN_COLORS.text,
    fontSize: 15,
  },
});
```

- [ ] **Step 6: Create FilterTabs component**

```tsx
// apps/admin/components/common/FilterTabs.tsx
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

interface FilterTabsProps {
  tabs: string[];
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export function FilterTabs({ tabs, activeTab, onTabPress }: FilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => onTabPress(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: ADMIN_COLORS.primary,
  },
  tabText: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
});
```

- [ ] **Step 7: Create EmptyState component**

```tsx
// apps/admin/components/common/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../constants/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'car', message, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={ADMIN_COLORS.surfaceLight} />
      <Text style={styles.message}>{message}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: ADMIN_COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
```

- [ ] **Step 8: Create LoadingSpinner component**

```tsx
// apps/admin/components/common/LoadingSpinner.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

export function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={ADMIN_COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
```

- [ ] **Step 9: Create ErrorState component**

```tsx
// apps/admin/components/common/ErrorState.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../constants/theme';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={64} color={ADMIN_COLORS.red} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  message: {
    fontSize: 16,
    color: ADMIN_COLORS.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: ADMIN_COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 10: Create ProgressBar component**

```tsx
// apps/admin/components/common/ProgressBar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ADMIN_COLORS } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
}

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${Math.min(progress, 100)}%`, height }]}>
        <LinearGradient
          colors={['#6366f1', '#16a34a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { height }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
});
```

- [ ] **Step 11: Commit**

```bash
git add apps/admin/components/
git commit -m "feat(admin): add common components (Card, StatCard, Badge, Avatar, SearchBar, FilterTabs, EmptyState, LoadingSpinner, ErrorState, ProgressBar)"
```

---

### Task 5: Login Screen

**Files:**
- Create: `apps/admin/screens/auth/LoginScreen.tsx`

- [ ] **Step 1: Create LoginScreen**

```tsx
// apps/admin/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../packages/shared/src/hooks/useAuth';
import { ADMIN_COLORS } from '../../constants/theme';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('admin@easyryde.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color={ADMIN_COLORS.primary} />
          </View>
          <Text style={styles.title}>EasyRyde Admin</Text>
          <Text style={styles.subtitle}>Operations Dashboard</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@easyryde.com"
            placeholderTextColor={ADMIN_COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={ADMIN_COLORS.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>EasyRyde Admin v4.0.0 • Phalaborwa, Limpopo</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ADMIN_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: ADMIN_COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ADMIN_COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: ADMIN_COLORS.textMuted,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: ADMIN_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: ADMIN_COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.surfaceLight,
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
    marginTop: 48,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/screens/auth/LoginScreen.tsx
git commit -m "feat(admin): add login screen"
```

---

### Task 6: Dashboard Screen

**Files:**
- Create: `apps/admin/hooks/useAdminDashboard.ts`
- Create: `apps/admin/components/dashboard/FleetStatus.tsx`
- Create: `apps/admin/components/dashboard/ActiveRidesCard.tsx`
- Create: `apps/admin/components/dashboard/ActivityFeed.tsx`
- Create: `apps/admin/components/dashboard/HourlyChart.tsx`
- Create: `apps/admin/components/dashboard/TopDrivers.tsx`
- Create: `apps/admin/screens/dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Create useAdminDashboard hook**

```typescript
// apps/admin/hooks/useAdminDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import { getAdminDashboard } from '../api/admin';
import type { AdminDashboardData } from '../api/types';

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await getAdminDashboard();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await getAdminDashboard();
      setData(result);
    } catch {}
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { data, loading, error, refresh };
}
```

- [ ] **Step 2: Create FleetStatus component**

```tsx
// apps/admin/components/dashboard/FleetStatus.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface FleetStatusProps {
  active: number;
  online: number;
  busy: number;
  offline: number;
  onRefresh?: () => void;
}

export function FleetStatus({ active, online, busy, offline, onRefresh }: FleetStatusProps) {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Status</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={16} color={ADMIN_COLORS.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.green }]}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.blue }]}>{online}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.orange }]}>{busy}</Text>
          <Text style={styles.statLabel}>Busy</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: ADMIN_COLORS.textMuted }]}>{offline}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { fontSize: 12, color: ADMIN_COLORS.primary },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 8, marginHorizontal: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: ADMIN_COLORS.textMuted, marginTop: 2 },
});
```

- [ ] **Step 3: Create ActiveRidesCard component**

```tsx
// apps/admin/components/dashboard/ActiveRidesCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { ProgressBar } from '../common/ProgressBar';
import { ADMIN_COLORS } from '../../constants/theme';

interface ActiveRide {
  id: string;
  passenger: string;
  pickup: string;
  dropoff: string;
  fare: number;
  progress: number;
}

interface ActiveRidesCardProps {
  rides: ActiveRide[];
  onViewAll?: () => void;
}

export function ActiveRidesCard({ rides, onViewAll }: ActiveRidesCardProps) {
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Active Rides</Text>
        <Text style={styles.count}>{rides.length} in progress</Text>
      </View>
      {rides.slice(0, 3).map((ride) => (
        <View key={ride.id} style={styles.rideItem}>
          <View style={styles.rideIcon}>
            <Ionicons name="car" size={16} color={ADMIN_COLORS.primary} />
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.passenger}>{ride.passenger}</Text>
            <Text style={styles.route}>{ride.pickup} → {ride.dropoff}</Text>
          </View>
          <View style={styles.rideRight}>
            <Text style={styles.fare}>R{ride.fare}</Text>
            <ProgressBar progress={ride.progress} height={4} />
          </View>
        </View>
      ))}
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All Rides →</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text },
  count: { fontSize: 12, color: ADMIN_COLORS.orange, fontWeight: '600' },
  rideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 10, marginBottom: 8 },
  rideIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: `${ADMIN_COLORS.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rideInfo: { flex: 1 },
  passenger: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.text },
  route: { fontSize: 11, color: ADMIN_COLORS.textMuted },
  rideRight: { alignItems: 'flex-end', width: 80 },
  fare: { fontSize: 14, fontWeight: '700', color: ADMIN_COLORS.primary, marginBottom: 4 },
  viewAll: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.primary },
});
```

- [ ] **Step 4: Create ActivityFeed component**

```tsx
// apps/admin/components/dashboard/ActivityFeed.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface Activity {
  type: string;
  message: string;
  time: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  ride_completed: ADMIN_COLORS.green,
  driver_online: ADMIN_COLORS.blue,
  new_user: ADMIN_COLORS.primary,
  surge_active: ADMIN_COLORS.orange,
  ride_request: ADMIN_COLORS.primary,
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <Text style={styles.title}>Recent Activity</Text>
      {activities.slice(0, 5).map((activity, idx) => (
        <View key={idx} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: ACTIVITY_COLORS[activity.type] || ADMIN_COLORS.primary }]} />
          <View style={styles.content}>
            <Text style={styles.message}>{activity.message}</Text>
            <Text style={styles.time}>{activity.time}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 10 },
  content: { flex: 1 },
  message: { fontSize: 14, color: ADMIN_COLORS.text },
  time: { fontSize: 11, color: ADMIN_COLORS.textMuted, marginTop: 2 },
});
```

- [ ] **Step 5: Create HourlyChart component**

```tsx
// apps/admin/components/dashboard/HourlyChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface HourlyData {
  hour: string;
  rides: number;
}

interface HourlyChartProps {
  data: HourlyData[];
}

export function HourlyChart({ data }: HourlyChartProps) {
  const screenWidth = Dimensions.get('window').width - 64;

  return (
    <Card>
      <Text style={styles.title}>Hourly Activity</Text>
      {data.length > 0 ? (
        <BarChart
          data={{
            labels: data.map(d => d.hour),
            datasets: [{ data: data.map(d => d.rides) }],
          }}
          width={screenWidth}
          height={160}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: ADMIN_COLORS.surface,
            backgroundGradientFrom: ADMIN_COLORS.surface,
            backgroundGradientTo: ADMIN_COLORS.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: () => ADMIN_COLORS.textMuted,
            barPercentage: 0.6,
          }}
          style={styles.chart}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 12 },
  chart: { borderRadius: 12 },
  empty: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: ADMIN_COLORS.textMuted, fontSize: 14 },
});
```

- [ ] **Step 6: Create TopDrivers component**

```tsx
// apps/admin/components/dashboard/TopDrivers.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { ADMIN_COLORS } from '../../constants/theme';

interface TopDriver {
  id: string;
  name: string;
  trips: number;
  status: 'online' | 'busy' | 'offline';
}

interface TopDriversProps {
  drivers: TopDriver[];
}

export function TopDrivers({ drivers }: TopDriversProps) {
  return (
    <Card>
      <Text style={styles.title}>Top Drivers Today</Text>
      {drivers.slice(0, 5).map((driver, idx) => (
        <View key={driver.id} style={styles.item}>
          <Text style={styles.rank}>#{idx + 1}</Text>
          <Avatar name={driver.name} size={36} />
          <View style={styles.info}>
            <Text style={styles.name}>{driver.name}</Text>
            <Text style={styles.trips}>{driver.trips} trips</Text>
          </View>
          <Badge variant={driver.status} label={driver.status} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  rank: { fontSize: 13, fontWeight: '700', color: ADMIN_COLORS.primary, width: 28 },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.text },
  trips: { fontSize: 11, color: ADMIN_COLORS.textMuted },
});
```

- [ ] **Step 7: Create DashboardScreen**

```tsx
// apps/admin/screens/dashboard/DashboardScreen.tsx
import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { StatCard } from '../../components/common/StatCard';
import { FleetStatus } from '../../components/dashboard/FleetStatus';
import { ActiveRidesCard } from '../../components/dashboard/ActiveRidesCard';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { HourlyChart } from '../../components/dashboard/HourlyChart';
import { TopDrivers } from '../../components/dashboard/TopDrivers';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ADMIN_COLORS } from '../../constants/theme';

const MOCK_HOURLY = [
  { hour: '6AM', rides: 12 }, { hour: '8AM', rides: 45 },
  { hour: '10AM', rides: 38 }, { hour: '12PM', rides: 52 },
  { hour: '2PM', rides: 41 }, { hour: '4PM', rides: 48 },
  { hour: '6PM', rides: 65 }, { hour: '8PM', rides: 58 },
];

const MOCK_ACTIVITIES = [
  { type: 'ride_completed', message: 'Ride R-28460 completed by John Mkhonto', time: '1 min ago' },
  { type: 'driver_online', message: 'Mike Ndlovu went online', time: '3 min ago' },
  { type: 'new_user', message: 'New user registered: Peter Thabo', time: '5 min ago' },
  { type: 'surge_active', message: 'Surge active in CBD zone (1.4x)', time: '8 min ago' },
];

const MOCK_TOP_DRIVERS = [
  { id: '1', name: 'John Mkhonto', trips: 1847, status: 'online' as const },
  { id: '2', name: 'Sarah Dlamini', trips: 2156, status: 'busy' as const },
  { id: '3', name: 'Mike Ndlovu', trips: 1234, status: 'online' as const },
];

export function DashboardScreen() {
  const { data, loading, error, refresh } = useAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_COLORS.primary} />}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Today's Revenue" value={`R${data?.revenue_today?.toLocaleString() || 0}`} trend="↑ +12.5%" />
          <View style={{ width: 12 }} />
          <StatCard label="Total Rides" value={data?.rides_today || 0} trend="↑ +8.3%" />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <FleetStatus
          active={data?.active_rides || 0}
          online={data?.total_drivers || 0}
          busy={0}
          offline={0}
          onRefresh={onRefresh}
        />
        <ActiveRidesCard rides={[]} />
        <HourlyChart data={MOCK_HOURLY} />
        <ActivityFeed activities={MOCK_ACTIVITIES} />
        <TopDrivers drivers={MOCK_TOP_DRIVERS} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  liveText: { fontSize: 12, fontWeight: '600', color: '#f87171' },
  statsRow: { flexDirection: 'row' },
  content: { padding: 16, marginTop: -8 },
});
```

- [ ] **Step 8: Commit**

```bash
git add apps/admin/hooks/ apps/admin/components/dashboard/ apps/admin/screens/dashboard/
git commit -m "feat(admin): add dashboard screen with fleet status, active rides, chart, activity feed"
```

---

### Task 7: Rides Screen + Hook

**Files:**
- Create: `apps/admin/hooks/useAdminRides.ts`
- Create: `apps/admin/components/rides/RideCard.tsx`
- Create: `apps/admin/screens/rides/RidesScreen.tsx`
- Create: `apps/admin/screens/rides/RideDetailScreen.tsx`

- [ ] **Step 1: Create useAdminRides hook**

```typescript
// apps/admin/hooks/useAdminRides.ts
import { useState, useEffect, useCallback } from 'react';
import { getAdminRides } from '../api/admin';
import type { AdminRide, PaginatedResponse } from '../api/types';

export function useAdminRides(statusFilter?: string) {
  const [data, setData] = useState<PaginatedResponse<AdminRide> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = useCallback(async (pageNum: number = 1, status?: string) => {
    try {
      setError(null);
      const result = await getAdminRides({ page: pageNum, per_page: 15, status: status || undefined });
      if (pageNum === 1) {
        setData(result);
      } else {
        setData(prev => prev ? { ...prev, data: [...prev.data, ...result.data], current_page: result.current_page } : result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchRides(1, statusFilter);
  }, [fetchRides, statusFilter]);

  const loadMore = useCallback(async () => {
    if (data && data.current_page < data.last_page) {
      const next = page + 1;
      setPage(next);
      await fetchRides(next, statusFilter);
    }
  }, [page, data, fetchRides, statusFilter]);

  useEffect(() => { fetchRides(1, statusFilter); }, [statusFilter]);

  return { data, loading, error, refreshing, refresh, loadMore };
}
```

- [ ] **Step 2: Create RideCard component**

```tsx
// apps/admin/components/rides/RideCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminRide } from '../../api/types';

interface RideCardProps {
  ride: AdminRide;
  onPress?: () => void;
}

const STATUS_MAP: Record<string, { variant: 'active' | 'online' | 'busy' | 'offline'; label: string }> = {
  in_progress: { variant: 'active', label: 'IN PROGRESS' },
  accepted: { variant: 'online', label: 'ACCEPTED' },
  arrived: { variant: 'online', label: 'ARRIVED' },
  completed: { variant: 'online', label: 'COMPLETED' },
  cancelled: { variant: 'offline', label: 'CANCELLED' },
  searching: { variant: 'busy', label: 'SEARCHING' },
};

export function RideCard({ ride, onPress }: RideCardProps) {
  const statusInfo = STATUS_MAP[ride.status] || { variant: 'active' as const, label: ride.status.toUpperCase() };
  const progress = ride.status === 'completed' ? 100 : ride.status === 'in_progress' ? 50 : ride.status === 'accepted' ? 25 : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.rideId}>{ride.id.slice(0, 8)}</Text>
            <Badge variant={statusInfo.variant} label={statusInfo.label} />
          </View>
          <Text style={styles.time}>{new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {ride.driver && (
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={16} color={ADMIN_COLORS.primary} />
            </View>
            <View>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              <Text style={styles.vehicle}>{ride.driver.vehicle ? `${ride.driver.vehicle.make} ${ride.driver.vehicle.model}` : 'Vehicle'}</Text>
            </View>
          </View>
        )}

        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.dot, { backgroundColor: ADMIN_COLORS.green }]} />
            <View style={styles.routeLine} />
            <Ionicons name="location" size={14} color={ADMIN_COLORS.orange} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.riderName}>{ride.rider.name}</Text>
            <Text style={styles.address}>{ride.pickup_address}</Text>
            <Text style={[styles.address, { marginTop: 8 }]}>{ride.dropoff_address}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <ProgressBar progress={progress} />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={14} color={ADMIN_COLORS.primary} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={14} color={ADMIN_COLORS.primary} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <Text style={styles.fare}>R{ride.total_fare}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideId: { fontSize: 13, fontFamily: 'monospace', color: ADMIN_COLORS.primary, fontWeight: '600' },
  time: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${ADMIN_COLORS.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  driverName: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.text },
  vehicle: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  routeRow: { flexDirection: 'row', marginBottom: 12 },
  routeDots: { alignItems: 'center', marginRight: 10, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 20, backgroundColor: ADMIN_COLORS.surfaceLight, marginVertical: 2 },
  routeInfo: { flex: 1 },
  riderName: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  address: { fontSize: 14, color: ADMIN_COLORS.text },
  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  progressValue: { fontSize: 12, fontWeight: '700', color: ADMIN_COLORS.primary },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: ADMIN_COLORS.surfaceLight, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 16 },
  actionText: { fontSize: 12, color: ADMIN_COLORS.primary },
  fare: { flex: 1, textAlign: 'right', fontSize: 16, fontWeight: '700', color: ADMIN_COLORS.primary },
});
```

- [ ] **Step 3: Create RidesScreen**

```tsx
// apps/admin/screens/rides/RidesScreen.tsx
import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminRides } from '../../hooks/useAdminRides';
import { RideCard } from '../../components/rides/RideCard';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterTabs } from '../../components/common/FilterTabs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminRide } from '../../api/types';

const STATUS_TABS = ['All', 'In Progress', 'Completed', 'Cancelled'];

export function RidesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const statusParam = activeTab === 'All' ? undefined : activeTab.toLowerCase().replace(' ', '_');
  const { data, loading, error, refreshing, refresh, loadMore } = useAdminRides(statusParam);

  const filteredRides = (data?.data || []).filter(ride =>
    !search || ride.id.toLowerCase().includes(search.toLowerCase()) ||
    ride.rider.name.toLowerCase().includes(search.toLowerCase()) ||
    ride.driver?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Ride Management</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <FilterTabs tabs={STATUS_TABS} activeTab={activeTab} onTabPress={setActiveTab} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search rides..." />

        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RideCard ride={item} onPress={() => navigation.navigate('RideDetail', { ride: item })} />
          )}
          ListEmptyComponent={<EmptyState icon="car" message="No rides found" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f87171' },
  liveText: { fontSize: 12, fontWeight: '600', color: '#f87171' },
  content: { flex: 1, padding: 16 },
});
```

- [ ] **Step 4: Create RideDetailScreen**

```tsx
// apps/admin/screens/rides/RideDetailScreen.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';

export function RideDetailScreen({ route, navigation }: any) {
  const { ride } = route.params;

  const timeline = [
    ride.created_at && { time: new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride requested' },
    ride.accepted_at && { time: new Date(ride.accepted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Driver accepted' },
    ride.arrived_at && { time: new Date(ride.arrived_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Driver arrived' },
    ride.started_at && { time: new Date(ride.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip started' },
    ride.completed_at && { time: new Date(ride.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Trip completed' },
    ride.cancelled_at && { time: new Date(ride.cancelled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), event: 'Ride cancelled' },
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ride {ride.id.slice(0, 8)}</Text>
          <Badge variant={ride.status === 'completed' ? 'online' : 'active'} label={ride.status.replace('_', ' ').toUpperCase()} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={[styles.dot, { backgroundColor: ADMIN_COLORS.green }]} />
              <View style={styles.routeLine} />
              <Ionicons name="location" size={14} color={ADMIN_COLORS.orange} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>{ride.pickup_address}</Text>
              <Text style={[styles.routeLabel, { marginTop: 12 }]}>Dropoff</Text>
              <Text style={styles.routeAddress}>{ride.dropoff_address}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Participants</Text>
          <View style={styles.participantRow}>
            <Avatar name={ride.rider.name} size={40} />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{ride.rider.name}</Text>
              <Text style={styles.participantDetail}>{ride.rider.email}</Text>
            </View>
          </View>
          {ride.driver && (
            <View style={[styles.participantRow, { marginTop: 12 }]}>
              <Avatar name={ride.driver.name} size={40} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{ride.driver.name}</Text>
                <Text style={styles.participantDetail}>{ride.driver.vehicle ? `${ride.driver.vehicle.make} ${ride.driver.vehicle.model} • ${ride.driver.vehicle.license_plate}` : 'Vehicle'}</Text>
              </View>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Method</Text>
            <Text style={styles.paymentValue}>{ride.payment?.method || 'N/A'}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Status</Text>
            <Badge variant={ride.payment?.status === 'completed' ? 'online' : 'active'} label={ride.payment?.status || 'pending'} />
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Fare</Text>
            <Text style={styles.fareValue}>R{ride.total_fare}</Text>
          </View>
        </Card>

        {timeline.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {timeline.map((item: any, idx: number) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineEvent}>{item.event}</Text>
              </View>
            ))}
          </Card>
        )}

        {ride.rating && (
          <Card>
            <Text style={styles.sectionTitle}>Rating</Text>
            <Text style={styles.ratingScore}>⭐ {ride.rating.score}/5</Text>
            <Text style={styles.ratingComment}>{ride.rating.comment}</Text>
          </Card>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Call Rider</Text>
          </TouchableOpacity>
          {ride.driver && (
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.actionText}>Call Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: ADMIN_COLORS.primary },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 12 },
  routeRow: { flexDirection: 'row' },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 24, backgroundColor: ADMIN_COLORS.surfaceLight, marginVertical: 4 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  routeAddress: { fontSize: 14, color: ADMIN_COLORS.text },
  participantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 10 },
  participantInfo: { marginLeft: 10, flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.text },
  participantDetail: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  paymentLabel: { fontSize: 14, color: ADMIN_COLORS.textMuted },
  paymentValue: { fontSize: 14, color: ADMIN_COLORS.text },
  fareValue: { fontSize: 18, fontWeight: '700', color: ADMIN_COLORS.primary },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ADMIN_COLORS.primary, marginRight: 10 },
  timelineTime: { fontSize: 13, color: ADMIN_COLORS.primary, fontWeight: '600', width: 60 },
  timelineEvent: { fontSize: 14, color: ADMIN_COLORS.text, flex: 1 },
  ratingScore: { fontSize: 18, fontWeight: '700', color: ADMIN_COLORS.yellow, marginBottom: 4 },
  ratingComment: { fontSize: 14, color: ADMIN_COLORS.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/hooks/useAdminRides.ts apps/admin/components/rides/ apps/admin/screens/rides/
git commit -m "feat(admin): add rides screen with list, search, filters, and ride detail"
```

---

### Task 8: Drivers Screen

**Files:**
- Create: `apps/admin/hooks/useAdminDrivers.ts`
- Create: `apps/admin/components/drivers/DriverCard.tsx`
- Create: `apps/admin/screens/drivers/DriversScreen.tsx`
- Create: `apps/admin/screens/drivers/DriverDetailScreen.tsx`

- [ ] **Step 1: Create useAdminDrivers hook**

```typescript
// apps/admin/hooks/useAdminDrivers.ts
import { useState, useEffect, useCallback } from 'react';
import { getAdminDrivers } from '../api/admin';
import type { AdminDriver, PaginatedResponse } from '../api/types';

export function useAdminDrivers() {
  const [data, setData] = useState<PaginatedResponse<AdminDriver> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrivers = useCallback(async (pageNum: number = 1) => {
    try {
      setError(null);
      const result = await getAdminDrivers({ page: pageNum, per_page: 15 });
      if (pageNum === 1) {
        setData(result);
      } else {
        setData(prev => prev ? { ...prev, data: [...prev.data, ...result.data], current_page: result.current_page } : result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchDrivers(1);
  }, [fetchDrivers]);

  const loadMore = useCallback(async () => {
    if (data && data.current_page < data.last_page) {
      const next = page + 1;
      setPage(next);
      await fetchDrivers(next);
    }
  }, [page, data, fetchDrivers]);

  useEffect(() => { fetchDrivers(1); }, []);

  return { data, loading, error, refreshing, refresh, loadMore };
}
```

- [ ] **Step 2: Create DriverCard component**

```tsx
// apps/admin/components/drivers/DriverCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminDriver } from '../../api/types';

interface DriverCardProps {
  driver: AdminDriver;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function DriverCard({ driver, onPress, onApprove, onReject }: DriverCardProps) {
  const profile = driver.driverProfile;
  const vehicle = driver.vehicle;
  const status = driver.is_online ? (profile?.total_trips ? 'busy' : 'online') : 'offline';
  const isPending = profile && !profile.is_approved;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={driver.name} size={48} borderColor={status === 'online' ? ADMIN_COLORS.green : status === 'busy' ? ADMIN_COLORS.orange : ADMIN_COLORS.surfaceLight} />
            <View style={styles.info}>
              <Text style={styles.name}>{driver.name}</Text>
              <Text style={styles.vehicle}>{vehicle ? `${vehicle.make} ${vehicle.model} • ${vehicle.license_plate}` : 'No vehicle'}</Text>
            </View>
          </View>
          <Badge variant={isPending ? 'pending' : status as any} label={isPending ? 'PENDING' : status.toUpperCase()} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: ADMIN_COLORS.primary }]}>{profile?.current_zone || '—'}</Text>
            <Text style={styles.statLabel}>Zone</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: status === 'online' ? ADMIN_COLORS.green : status === 'busy' ? ADMIN_COLORS.orange : ADMIN_COLORS.textMuted }]}>
              {isPending ? 'Pending' : status === 'online' ? 'Active' : status === 'busy' ? 'On Trip' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.pendingActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
              <Text style={styles.approveText}>Approve ✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
              <Text style={styles.rejectText}>Reject ✗</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
              <Text style={styles.viewBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 10, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: ADMIN_COLORS.text },
  vehicle: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text },
  statLabel: { fontSize: 10, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, backgroundColor: ADMIN_COLORS.green, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  approveText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: ADMIN_COLORS.red, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  actions: { flexDirection: 'row' },
  viewBtn: { flex: 1, backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
```

- [ ] **Step 3: Create DriversScreen**

```tsx
// apps/admin/screens/drivers/DriversScreen.tsx
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminDrivers } from '../../hooks/useAdminDrivers';
import { DriverCard } from '../../components/drivers/DriverCard';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterTabs } from '../../components/common/FilterTabs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { approveDriver, rejectDriver } from '../../api/admin';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminDriver } from '../../api/types';

const FILTER_TABS = ['All', 'Online', 'Busy', 'Offline', 'Pending'];

export function DriversScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const { data, loading, error, refreshing, refresh, loadMore } = useAdminDrivers();

  const drivers = (data?.data || []).filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'Online' && !d.is_online) return false;
    if (activeTab === 'Offline' && d.is_online) return false;
    if (activeTab === 'Pending' && d.driverProfile?.is_approved !== false) return false;
    return true;
  });

  const handleApprove = async (driver: AdminDriver) => {
    try {
      await approveDriver(driver.id);
      Alert.alert('Success', `${driver.name} approved`);
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleReject = async (driver: AdminDriver) => {
    try {
      await rejectDriver(driver.id);
      Alert.alert('Success', `${driver.name} rejected`);
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <Text style={styles.headerTitle}>Drivers</Text>
      </LinearGradient>

      <View style={styles.content}>
        <FilterTabs tabs={FILTER_TABS} activeTab={activeTab} onTabPress={setActiveTab} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search drivers..." />

        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => navigation.navigate('DriverDetail', { driver: item })}
              onApprove={() => handleApprove(item)}
              onReject={() => handleReject(item)}
            />
          )}
          ListEmptyComponent={<EmptyState icon="people" message="No drivers found" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
});
```

- [ ] **Step 4: Create DriverDetailScreen**

```tsx
// apps/admin/screens/drivers/DriverDetailScreen.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';

export function DriverDetailScreen({ route, navigation }: any) {
  const { driver } = route.params;
  const profile = driver.driverProfile;
  const vehicle = driver.vehicle;
  const status = driver.is_online ? 'online' : 'offline';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{driver.name}</Text>
          <Badge variant={status as any} label={status.toUpperCase()} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>R{(profile?.total_earnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Name" value={driver.name} />
          <InfoRow label="Email" value={driver.email} />
          <InfoRow label="Phone" value={driver.phone} />
          <InfoRow label="Joined" value={new Date(driver.created_at).toLocaleDateString()} />
        </Card>

        {vehicle && (
          <Card>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <InfoRow label="Vehicle" value={`${vehicle.make} ${vehicle.model} (${vehicle.year})`} />
            <InfoRow label="Color" value={vehicle.color} />
            <InfoRow label="Plate" value={vehicle.license_plate} />
            <InfoRow label="Type" value={vehicle.vehicle_type} />
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>Performance</Text>
          <InfoRow label="Acceptance Rate" value="96%" />
          <InfoRow label="Cancellation Rate" value="2.1%" />
          <InfoRow label="Online Hours Today" value="6.5h" />
        </Card>

        {profile && (
          <Card>
            <Text style={styles.sectionTitle}>Verification</Text>
            <InfoRow label="Approved" value={profile.is_approved ? '✅ Yes' : '❌ No'} />
            <InfoRow label="Verified" value={profile.is_verified ? '✅ Yes' : '❌ No'} />
            <InfoRow label="Background Check" value={profile.background_check ? '✅ Passed' : '❌ Not done'} />
            {profile.approved_at && <InfoRow label="Approved At" value={new Date(profile.approved_at).toLocaleDateString()} />}
          </Card>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  label: { fontSize: 14, color: ADMIN_COLORS.textMuted },
  value: { fontSize: 14, color: ADMIN_COLORS.text, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: ADMIN_COLORS.primary },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: ADMIN_COLORS.surface, borderRadius: 16, padding: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: ADMIN_COLORS.primary },
  statLabel: { fontSize: 11, color: ADMIN_COLORS.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/hooks/useAdminDrivers.ts apps/admin/components/drivers/ apps/admin/screens/drivers/
git commit -m "feat(admin): add drivers screen with list, search, approve/reject, and driver detail"
```

---

### Task 9: Users Screen

**Files:**
- Create: `apps/admin/hooks/useAdminUsers.ts`
- Create: `apps/admin/components/users/UserCard.tsx`
- Create: `apps/admin/screens/users/UsersScreen.tsx`
- Create: `apps/admin/screens/users/UserDetailScreen.tsx`

- [ ] **Step 1: Create useAdminUsers hook**

```typescript
// apps/admin/hooks/useAdminUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { getAdminUsers } from '../api/admin';
import type { AdminUser, PaginatedResponse } from '../api/types';

export function useAdminUsers() {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async (pageNum: number = 1) => {
    try {
      setError(null);
      const result = await getAdminUsers({ page: pageNum, per_page: 15 });
      if (pageNum === 1) {
        setData(result);
      } else {
        setData(prev => prev ? { ...prev, data: [...prev.data, ...result.data], current_page: result.current_page } : result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchUsers(1);
  }, [fetchUsers]);

  const loadMore = useCallback(async () => {
    if (data && data.current_page < data.last_page) {
      const next = page + 1;
      setPage(next);
      await fetchUsers(next);
    }
  }, [page, data, fetchUsers]);

  useEffect(() => { fetchUsers(1); }, []);

  return { data, loading, error, refreshing, refresh, loadMore };
}
```

- [ ] **Step 2: Create UserCard component**

```tsx
// apps/admin/components/users/UserCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminUser } from '../../api/types';

interface UserCardProps {
  user: AdminUser;
  onPress?: () => void;
}

export function UserCard({ user, onPress }: UserCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={user.name} size={48} />
            <View style={styles.info}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
          <Badge variant={user.is_active ? 'active' : 'offline'} label={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user.role}</Text>
            <Text style={styles.statLabel}>Role</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{new Date(user.created_at).getFullYear()}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user.phone || '—'}</Text>
            <Text style={styles.statLabel}>Phone</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Profile</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 10, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: ADMIN_COLORS.text },
  email: { fontSize: 12, color: ADMIN_COLORS.textMuted },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, padding: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '600', color: ADMIN_COLORS.text },
  statLabel: { fontSize: 10, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  viewBtn: { backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
```

- [ ] **Step 3: Create UsersScreen**

```tsx
// apps/admin/screens/users/UsersScreen.tsx
import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { UserCard } from '../../components/users/UserCard';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterTabs } from '../../components/common/FilterTabs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ADMIN_COLORS } from '../../constants/theme';

const FILTER_TABS = ['All', 'Active', 'New'];

export function UsersScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const { data, loading, error, refreshing, refresh, loadMore } = useAdminUsers();

  const users = (data?.data || []).filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'Active' && !u.is_active) return false;
    if (activeTab === 'New') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(u.created_at) < thirtyDaysAgo) return false;
    }
    return true;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
      </LinearGradient>

      <View style={styles.content}>
        <FilterTabs tabs={FILTER_TABS} activeTab={activeTab} onTabPress={setActiveTab} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search users..." />

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard user={item} onPress={() => navigation.navigate('UserDetail', { user: item })} />
          )}
          ListEmptyComponent={<EmptyState icon="people" message="No users found" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  content: { flex: 1, padding: 16 },
});
```

- [ ] **Step 4: Create UserDetailScreen**

```tsx
// apps/admin/screens/users/UserDetailScreen.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';

export function UserDetailScreen({ route, navigation }: any) {
  const { user } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar name={user.name} size={60} />
          <Text style={styles.headerTitle}>{user.name}</Text>
          <Badge variant={user.is_active ? 'active' : 'offline'} label={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Phone" value={user.phone || '—'} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
          <InfoRow label="Last Active" value={user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ride Summary</Text>
          <InfoRow label="Total Trips" value="247" />
          <InfoRow label="Completed" value="239 (96.8%)" />
          <InfoRow label="Cancelled" value="8 (3.2%)" />
          <InfoRow label="Avg Rating Given" value="4.8 ⭐" />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Spending</Text>
          <InfoRow label="Total Spent" value="R18,450" />
          <InfoRow label="This Month" value="R1,250" />
          <InfoRow label="Avg per Ride" value="R74.70" />
        </Card>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  label: { fontSize: 14, color: ADMIN_COLORS.textMuted },
  value: { fontSize: 14, color: ADMIN_COLORS.text, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: ADMIN_COLORS.primary },
  headerCenter: { alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.text, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/hooks/useAdminUsers.ts apps/admin/components/users/ apps/admin/screens/users/
git commit -m "feat(admin): add users screen with list, search, filters, and user detail"
```

---

### Task 10: Settings Screen

**Files:**
- Create: `apps/admin/hooks/useAdminSettings.ts`
- Create: `apps/admin/screens/settings/SettingsScreen.tsx`

- [ ] **Step 1: Create useAdminSettings hook**

```typescript
// apps/admin/hooks/useAdminSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { getAdminSettings, updateAdminSetting } from '../api/admin';
import type { AdminSetting } from '../api/types';

export function useAdminSettings() {
  const [settings, setSettings] = useState<Record<string, AdminSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const result = await getAdminSettings();
      setSettings(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (key: string, value: string, type: string = 'string', description?: string) => {
    try {
      await updateAdminSetting({ key, value, type, description });
      setSettings(prev => ({ ...prev, [key]: { value, type, description: description || null } }));
    } catch (err: any) {
      throw err;
    }
  }, []);

  useEffect(() => { fetchSettings(); }, []);

  return { settings, loading, error, refresh: fetchSettings, updateSetting };
}
```

- [ ] **Step 2: Create SettingsScreen**

```tsx
// apps/admin/screens/settings/SettingsScreen.tsx
import React, { useState } from 'react';
import { ScrollView, View, Text, Switch, Slider, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminSettings } from '../../hooks/useAdminSettings';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ADMIN_COLORS } from '../../constants/theme';

export function SettingsScreen() {
  const { settings, loading, error, refresh, updateSetting } = useAdminSettings();
  const [baseFare, setBaseFare] = useState(25);
  const [perKm, setPerKm] = useState(8.5);
  const [perMin, setPerMin] = useState(1.5);
  const [surgeEnabled, setSurgeEnabled] = useState(true);
  const [maxSurge, setMaxSurge] = useState(3.0);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await updateSetting(key, value, 'number');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>System configuration</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>PRICING SETTINGS</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Base Fare</Text>
            <Text style={styles.settingValue}>R{baseFare.toFixed(2)}</Text>
          </View>
          <Slider
            value={baseFare}
            onValueChange={setBaseFare}
            onSlidingComplete={(v) => handleUpdateSetting('base_fare', v.toString())}
            minimumValue={15}
            maximumValue={40}
            step={1}
            minimumTrackTintColor={ADMIN_COLORS.primary}
            thumbTintColor={ADMIN_COLORS.primary}
          />

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Per KM Rate</Text>
            <Text style={styles.settingValue}>R{perKm.toFixed(2)}</Text>
          </View>
          <Slider
            value={perKm}
            onValueChange={setPerKm}
            onSlidingComplete={(v) => handleUpdateSetting('per_km', v.toString())}
            minimumValue={5}
            maximumValue={15}
            step={0.5}
            minimumTrackTintColor={ADMIN_COLORS.primary}
            thumbTintColor={ADMIN_COLORS.primary}
          />

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Per Minute Rate</Text>
            <Text style={styles.settingValue}>R{perMin.toFixed(2)}</Text>
          </View>
          <Slider
            value={perMin}
            onValueChange={setPerMin}
            onSlidingComplete={(v) => handleUpdateSetting('per_minute', v.toString())}
            minimumValue={0.5}
            maximumValue={3}
            step={0.1}
            minimumTrackTintColor={ADMIN_COLORS.primary}
            thumbTintColor={ADMIN_COLORS.primary}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>SURGE PRICING</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.settingLabel}>Enable Surge Pricing</Text>
            <Switch value={surgeEnabled} onValueChange={setSurgeEnabled} trackColor={{ true: ADMIN_COLORS.primary }} />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Max Surge Multiplier</Text>
            <Text style={styles.settingValue}>{maxSurge.toFixed(1)}x</Text>
          </View>
          <Slider
            value={maxSurge}
            onValueChange={setMaxSurge}
            onSlidingComplete={(v) => handleUpdateSetting('max_surge', v.toString())}
            minimumValue={1.5}
            maximumValue={5}
            step={0.5}
            minimumTrackTintColor={ADMIN_COLORS.primary}
            thumbTintColor={ADMIN_COLORS.primary}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>SYSTEM SETTINGS</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="notifications" size={20} color={ADMIN_COLORS.primary} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: ADMIN_COLORS.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="mail" size={20} color={ADMIN_COLORS.primary} />
              <Text style={styles.settingLabel}>Email Alerts</Text>
            </View>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ true: ADMIN_COLORS.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="shield-checkmark" size={20} color={ADMIN_COLORS.primary} />
              <Text style={styles.settingLabel}>Two-Factor Auth</Text>
            </View>
            <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ true: ADMIN_COLORS.primary }} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>APP INFORMATION</Text>
          <InfoRow label="Version" value="4.0.0" />
          <InfoRow label="Region" value="Phalaborwa, Limpopo" />
          <InfoRow label="Environment" value="Production" />
        </Card>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  label: { fontSize: 14, color: ADMIN_COLORS.textMuted },
  value: { fontSize: 14, color: ADMIN_COLORS.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: ADMIN_COLORS.textMuted, letterSpacing: 1, marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  settingLabel: { fontSize: 14, color: ADMIN_COLORS.text },
  settingValue: { fontSize: 14, fontWeight: '600', color: ADMIN_COLORS.primary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceLight },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/hooks/useAdminSettings.ts apps/admin/screens/settings/
git commit -m "feat(admin): add settings screen with pricing, surge, and system config"
```

---

### Task 11: Navigation & App Root

**Files:**
- Create: `apps/admin/navigation/AdminStack.tsx`
- Create: `apps/admin/navigation/BottomTabNavigator.tsx`
- Create: `apps/admin/App.tsx`

- [ ] **Step 1: Create AdminStack**

```tsx
// apps/admin/navigation/AdminStack.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RideDetailScreen } from '../screens/rides/RideDetailScreen';
import { DriverDetailScreen } from '../screens/drivers/DriverDetailScreen';
import { UserDetailScreen } from '../screens/users/UserDetailScreen';
import { useAuth } from '../../../packages/shared/src/hooks/useAuth';
import { ADMIN_COLORS } from '../constants/theme';

const Stack = createStackNavigator();

export function AdminStack() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
          <Stack.Screen name="RideDetail" component={RideDetailScreen} />
          <Stack.Screen name="DriverDetail" component={DriverDetailScreen} />
          <Stack.Screen name="UserDetail" component={UserDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Create BottomTabNavigator**

```tsx
// apps/admin/navigation/BottomTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { RidesScreen } from '../screens/rides/RidesScreen';
import { DriversScreen } from '../screens/drivers/DriversScreen';
import { UsersScreen } from '../screens/users/UsersScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ADMIN_COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'grid', default: 'grid-outline' },
  Rides: { focused: 'car', default: 'car-outline' },
  Drivers: { focused: 'people', default: 'people-outline' },
  Users: { focused: 'person', default: 'person-outline' },
  Settings: { focused: 'settings', default: 'settings-outline' },
};

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.default;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: ADMIN_COLORS.primary,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: ADMIN_COLORS.background,
          borderTopColor: ADMIN_COLORS.surface,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Drivers" component={DriversScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Create App.tsx**

```tsx
// apps/admin/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from '../packages/shared/src/hooks/useAuth';
import { AdminStack } from './navigation/AdminStack';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AdminStack />
      </NavigationContainer>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/navigation/ apps/admin/App.tsx
git commit -m "feat(admin): add navigation stack and app root with auth"
```

---

### Task 12: Build & Test on Device

- [ ] **Step 1: Start Metro dev server**

Run: `cd F:\EasyRyde\mobile\apps\admin && npx expo start`

- [ ] **Step 2: Test login flow on emulator or device**

Verify: Login with `admin@easyryde.com` / `password` → Dashboard loads

- [ ] **Step 3: Build release APK for A02**

```bash
cd F:\EasyRyde\mobile\apps\admin
npx expo export:embed --platform android --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res --dev false
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a
```

- [ ] **Step 4: Install on A02 and test all tabs**

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Test: Login → Dashboard (map, stats) → Rides (list, filters) → Drivers (list, approve/reject) → Users (list, search) → Settings (pricing sliders, toggles) → Detail screens (ride, driver, user)

- [ ] **Step 5: Commit final build**

```bash
git add .
git commit -m "feat(admin): admin app complete with all screens and build"
```

---

## Summary

| Task | Screens | Components | Hooks | Files |
|------|---------|------------|-------|-------|
| 1 | — | — | — | 5 |
| 2 | — | — | — | 1 |
| 3 | — | — | — | 2 |
| 4 | — | 10 | — | 10 |
| 5 | 1 | — | — | 1 |
| 6 | 1 | 5 | 1 | 7 |
| 7 | 2 | 1 | 1 | 4 |
| 8 | 2 | 1 | 1 | 4 |
| 9 | 2 | 1 | 1 | 4 |
| 10 | 1 | — | 1 | 2 |
| 11 | — | — | — | 3 |
| 12 | — | — | — | — |
| **Total** | **9 screens** | **18 components** | **5 hooks** | **43 files** |
