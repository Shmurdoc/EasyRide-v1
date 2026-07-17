import React, { useRef } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
LogBox.ignoreLogs(['Require cycle']);
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, theme, ErrorBoundary, useAuth, useNotifications, AuthProvider } from '@easyryde/shared';
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

const AuthStack = createNativeStackNavigator<RiderAuthStackParamList>();
const MainStack = createNativeStackNavigator<RiderStackParamList>();
const Tab = createBottomTabNavigator<RiderMainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#121212' },
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
          backgroundColor: '#1c1c1e',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FFAD7A',
        tabBarInactiveTintColor: '#98989d',
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
        contentStyle: { backgroundColor: '#1c1c1e' },
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
        <ActivityIndicator size="large" color="#FFAD7A" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}
      theme={{
        dark: true,
        colors: {
          primary: '#FFAD7A',
          background: '#1c1c1e',
          card: '#242426',
          text: '#ffffff',
          border: '#333333',
          notification: '#FFAD7A',
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
            <StatusBar barStyle="light-content" backgroundColor="#121212" />
            <AppContent />
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
    backgroundColor: '#121212',
  },
});
