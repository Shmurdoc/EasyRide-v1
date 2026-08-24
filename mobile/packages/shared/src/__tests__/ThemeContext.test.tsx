import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { COLORS, SPACING, RADIUS } from '../constants';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  it('provides theme with colors', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.colors).toBeDefined();
    expect(result.current.colors.primary).toBe(COLORS.primary);
    expect(result.current.colors.bg).toBe(COLORS.bg);
    expect(result.current.colors.text).toBe(COLORS.text);
  });

  it('provides theme with typography', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.typography).toBeDefined();
    expect(result.current.typography.h1).toBeDefined();
    expect(result.current.typography.body).toBeDefined();
  });

  it('provides theme with spacing', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.spacing).toBeDefined();
    expect(result.current.spacing.base).toBe(SPACING.base);
    expect(result.current.spacing.md).toBe(SPACING.md);
  });

  it('provides theme with radius', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.radius).toBeDefined();
    expect(result.current.radius.md).toBe(RADIUS.md);
    expect(result.current.radius.full).toBe(RADIUS.full);
  });

  it('provides theme with shadows', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.shadows).toBeDefined();
    expect(result.current.shadows.card).toBeDefined();
    expect(result.current.shadows.raised).toBeDefined();
  });

  it('provides theme with motion', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.motion).toBeDefined();
    expect(result.current.motion.duration).toBe(240);
  });

  it('renders children', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toBeTruthy();
  });

  it('throws outside provider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow();
  });
});
