import React from 'react';
import { View } from 'react-native';
import { render, RenderOptions } from '@testing-library/react-native';

export function renderWithNavigation(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <View>{children}</View>,
    ...options,
  });
}

export { render, fireEvent, act, waitFor } from '@testing-library/react-native';
