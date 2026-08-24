import React, { useRef } from 'react';
import { ActivityIndicator, StatusBar, View, LogBox } from 'react-native';
LogBox.ignoreLogs(['Require cycle']);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useNotifications, ErrorBoundary, COLORS, ThemeProvider, AuthProvider, BusinessThemeProvider } from '@easyryde/shared';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import RideRequestsScreen from './screens/RideRequestsScreen';
import ActiveRideScreen from './screens/ActiveRideScreen';
import EarningsScreen from './screens/EarningsScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import FoodDeliveryScreen from './screens/FoodDeliveryScreen';
import FoodOrderDetailScreen from './screens/FoodOrderDetailScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import SupportScreen from './screens/SupportScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ConsentScreen from './screens/ConsentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useNotifications(navigationRef);

  if (isLoading) return (
    <View style={{ flex: 1, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        {!isAuthenticated ? (
          <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={DriverTabs} />
            <Stack.Screen name="Consent" component={ConsentScreen} />
            <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="FoodOrderDetail" component={FoodOrderDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Requests') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Food') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Earnings') iconName = focused ? 'cash' : 'cash-outline';
          else if (route.name === 'Trips') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: 'rgba(28, 28, 30, 0.95)',
          borderTopColor: '#3a3a3c',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Requests" component={RideRequestsScreen} />
      <Tab.Screen name="Food" component={FoodDeliveryScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Trips" component={TripHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppLayout() {
  return (
    <SafeAreaProvider>
    <AuthProvider>
    <ThemeProvider>
    <BusinessThemeProvider slug="rides">
    <StatusBar barStyle="light-content" backgroundColor="#1c1c1e" />
    <ErrorBoundary>
    <RootNavigator />
    </ErrorBoundary>
    </BusinessThemeProvider>
    </ThemeProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}
