import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../constants/theme';

import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import RidesScreen from '../screens/RidesScreen';
import RideDetailScreen from '../screens/RideDetailScreen';
import DriversScreen from '../screens/DriversScreen';
import DriverDetailScreen from '../screens/DriverDetailScreen';
import UsersScreen from '../screens/UsersScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SurgePricingScreen from '../screens/SurgePricingScreen';
import SurgeZonesScreen from '../screens/SurgeZonesScreen';
import PeakHoursScreen from '../screens/PeakHoursScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RidesStack = createNativeStackNavigator();
const DriversStackNav = createNativeStackNavigator();
const UsersStackNav = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { focused: 'grid', default: 'grid-outline' },
  Rides: { focused: 'car', default: 'car-outline' },
  Drivers: { focused: 'people', default: 'people-outline' },
  Users: { focused: 'person', default: 'person-outline' },
  Settings: { focused: 'settings', default: 'settings-outline' },
};

function RidesStackScreen() {
  return (
    <RidesStack.Navigator screenOptions={{ headerShown: false }}>
      <RidesStack.Screen name="RidesList" component={RidesScreen} />
      <RidesStack.Screen name="RideDetail" component={RideDetailScreen} />
    </RidesStack.Navigator>
  );
}

function DriversStackScreen() {
  return (
    <DriversStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DriversStackNav.Screen name="DriversList" component={DriversScreen} />
      <DriversStackNav.Screen name="DriverDetail" component={DriverDetailScreen} />
    </DriversStackNav.Navigator>
  );
}

function UsersStackScreen() {
  return (
    <UsersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <UsersStackNav.Screen name="UsersList" component={UsersScreen} />
      <UsersStackNav.Screen name="UserDetail" component={UserDetailScreen} />
    </UsersStackNav.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsList" component={SettingsScreen} />
      <SettingsStack.Screen name="SurgePricing" component={SurgePricingScreen} />
      <SettingsStack.Screen name="SurgeZones" component={SurgeZonesScreen} />
      <SettingsStack.Screen name="PeakHours" component={PeakHoursScreen} />
    </SettingsStack.Navigator>
  );
}

function AdminTabs() {
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
        tabBarInactiveTintColor: ADMIN_COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Rides" component={RidesStackScreen} />
      <Tab.Screen name="Drivers" component={DriversStackScreen} />
      <Tab.Screen name="Users" component={UsersStackScreen} />
      <Tab.Screen name="Settings" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}

interface AppNavigatorProps {
  isAuthenticated: boolean;
}

export default function AppNavigator({ isAuthenticated }: AppNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={AdminTabs} />
          <Stack.Screen name="AdminRideDetail" component={RideDetailScreen} />
          <Stack.Screen name="AdminDriverDetail" component={DriverDetailScreen} />
          <Stack.Screen name="AdminUserDetail" component={UserDetailScreen} />
          <Stack.Screen name="AdminSurgePricing" component={SurgePricingScreen} />
          <Stack.Screen name="AdminSurgeZones" component={SurgeZonesScreen} />
          <Stack.Screen name="AdminPeakHours" component={PeakHoursScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: ADMIN_COLORS.background,
    borderTopColor: ADMIN_COLORS.surfaceBorder,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 60,
  },
  tabLabel: { fontSize: 10, fontWeight: '500' },
});
