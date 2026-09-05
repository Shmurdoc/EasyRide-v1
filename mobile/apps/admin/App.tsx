import React from 'react';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Require cycle']);
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth, ErrorBoundary, AuthProvider, ThemeProvider, BusinessThemeProvider } from '@easyryde/shared';
import AppNavigator from './navigation/AppNavigator';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <NavigationContainer>
      <AppNavigator isAuthenticated={isAuthenticated} />
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
