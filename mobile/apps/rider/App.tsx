import React, { useRef, useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
LogBox.ignoreLogs(['Require cycle']);
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, theme, ErrorBoundary, useAuth, useNotifications, AuthProvider, COLORS, BusinessThemeProvider } from '@easyryde/shared';
import type { RiderAuthStackParamList, RiderStackParamList, RiderMainTabParamList } from '@easyryde/shared';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import BookRideScreen from './screens/BookRideScreen';
import RideTrackingScreen from './screens/RideTrackingScreen';
import PaymentScreen from './screens/PaymentScreen';
import RideHistoryScreen from './screens/RideHistoryScreen';
import RideDetailScreen from './screens/RideDetailScreen';
import ChatScreen from './screens/ChatScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';
import PromoCodeScreen from './screens/PromoCodeScreen';
import SupportScreen from './screens/SupportScreen';
import NotificationScreen from './screens/NotificationScreen';
import RestaurantListScreen from './screens/RestaurantListScreen';
import RestaurantMenuScreen from './screens/RestaurantMenuScreen';
import FoodCheckoutScreen from './screens/FoodCheckoutScreen';
import FoodOrderTrackingScreen from './screens/FoodOrderTrackingScreen';
import ConsentScreen from './screens/ConsentScreen';
import RatingScreen from './screens/RatingScreen';

const AuthStack = createNativeStackNavigator<RiderAuthStackParamList>();
const MainStack = createNativeStackNavigator<RiderStackParamList>();
const Tab = createBottomTabNavigator<RiderMainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050E1A' },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopColor: COLORS.surfaceBorder,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9AA8A0',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={RestaurantListScreen}
        options={{
          tabBarLabel: 'Food',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={RideHistoryScreen}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <MainStack.Screen name="Main" component={MainTabs} />
      <MainStack.Screen name="Consent" component={ConsentScreen} />
      <MainStack.Screen name="BookRide" component={BookRideScreen} />
      <MainStack.Screen name="RideTracking" component={RideTrackingScreen} />
      <MainStack.Screen name="Payment" component={PaymentScreen} />
      <MainStack.Screen name="RideHistory" component={RideHistoryScreen} />
      <MainStack.Screen name="RideDetail" component={RideDetailScreen} />
      <MainStack.Screen name="Chat" component={ChatScreen} />
      <MainStack.Screen name="Wallet" component={WalletScreen} />
      <MainStack.Screen name="Rating" component={RatingScreen} />
      <MainStack.Screen name="PromoCode" component={PromoCodeScreen} />
      <MainStack.Screen name="Support" component={SupportScreen} />
      <MainStack.Screen name="Notification" component={NotificationScreen} />
      <MainStack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <MainStack.Screen name="RestaurantMenu" component={RestaurantMenuScreen} />
      <MainStack.Screen name="FoodCheckout" component={FoodCheckoutScreen} />
      <MainStack.Screen name="FoodOrderTracking" component={FoodOrderTrackingScreen} />
    </MainStack.Navigator>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useNotifications(navigationRef);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}
      theme={{
        dark: false,
        colors: {
          primary: COLORS.primary,
          background: COLORS.bg,
          card: COLORS.surface,
          text: COLORS.text,
          border: COLORS.surfaceBorder,
          notification: COLORS.primary,
        },
      }}
    >
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <BusinessThemeProvider slug="rides">
              <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
              <AppContent />
            </BusinessThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
});
