import React, { useState, useCallback } from 'react';
import { StyleSheet, LogBox } from 'react-native';
LogBox.ignoreLogs(['Require cycle']);
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, ErrorBoundary, AuthProvider, ThemeProvider, BusinessThemeProvider } from '@easyryde/shared';
import { BUSINESS_THEMES } from '@easyryde/shared';
import { ADMIN_COLORS } from './constants/theme';

import LoginScreen from './screens/LoginScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import RidesScreen from './screens/RidesScreen';
import DriversScreen from './screens/DriversScreen';
import UsersScreen from './screens/UsersScreen';
import SettingsScreen from './screens/SettingsScreen';
import SurgePricingScreen from './screens/SurgePricingScreen';
import SurgeZonesScreen from './screens/SurgeZonesScreen';
import PeakHoursScreen from './screens/PeakHoursScreen';
import { RideDetailScreen } from './screens/RideDetailScreen';
import { DriverDetailScreen } from './screens/DriverDetailScreen';
import { UserDetailScreen } from './screens/UserDetailScreen';
import { LuxuriousMenu } from './components/menu/LuxuriousMenu';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'grid', default: 'grid-outline' },
  Rides: { focused: 'car', default: 'car-outline' },
  Drivers: { focused: 'people', default: 'people-outline' },
  Users: { focused: 'person', default: 'person-outline' },
  Settings: { focused: 'settings', default: 'settings-outline' },
};

function AdminTabs({ onMenuPress }: { onMenuPress: () => void }) {
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
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <AdminDashboardScreen onMenuPress={onMenuPress} />}
      </Tab.Screen>
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Drivers" component={DriversScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const navigation = useNavigation<any>();

  const handleMenuPress = useCallback(() => setMenuVisible(true), []);
  const handleMenuClose = useCallback(() => setMenuVisible(false), []);

  const handleTabPress = useCallback((tab: string) => {
    setActiveTab(tab);
    navigation.navigate('Main', { screen: tab });
  }, [navigation]);

  return (
    <>
      <AdminTabs onMenuPress={handleMenuPress} />
      <LuxuriousMenu
        visible={menuVisible}
        activeTab={activeTab}
        onClose={handleMenuClose}
        onTabPress={handleTabPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: ADMIN_COLORS.background,
    borderTopColor: ADMIN_COLORS.surface,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 60,
  },
  tabLabel: { fontSize: 10, fontWeight: '500' },
});

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="AdminRideDetail" component={RideDetailScreen} />
          <Stack.Screen name="AdminDriverDetail" component={DriverDetailScreen} />
          <Stack.Screen name="AdminUserDetail" component={UserDetailScreen} />
          <Stack.Screen name="AdminSurgePricing" component={SurgePricingScreen} />
          <Stack.Screen name="AdminSurgeZones" component={SurgeZonesScreen} />
          <Stack.Screen name="AdminPeakHours" component={PeakHoursScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppLayout() {
  return (
    <ErrorBoundary>
    <AuthProvider>
    <ThemeProvider>
    <BusinessThemeProvider slug="admin">
    <RootNavigator />
    </BusinessThemeProvider>
    </ThemeProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
