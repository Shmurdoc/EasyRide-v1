import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const Stack = createNativeStackNavigator();

function TestNavigator({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Test">{() => <>{children}</>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function renderWithNavigation(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <TestNavigator>{children}</TestNavigator>,
    ...options,
  });
}

export { render, fireEvent, act, waitFor } from '@testing-library/react-native';
