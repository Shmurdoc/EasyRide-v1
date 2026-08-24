import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import {
  BusinessThemeProvider,
  useBusinessTheme,
} from '../src/BusinessThemeContext';
import { BUSINESSES } from '../src/BusinessIdentity';
import { COLORS, GRADIENTS } from '../src/colors';

function wrapper({ children }: { children: React.ReactNode }) {
  return <BusinessThemeProvider>{children}</BusinessThemeProvider>;
}

describe('BusinessThemeContext', () => {
  describe('BusinessThemeProvider', () => {
    it('provides default brand colors when no business specified', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      expect(result.current.brand).toBe(COLORS.brand);
      expect(result.current.brandLight).toBe(COLORS.brandLight);
      expect(result.current.brandDark).toBe(COLORS.brandDark);
      expect(result.current.gradient).toEqual(GRADIENTS.primary);
    });

    it('provides correct colors for initialBusinessId', () => {
      const cajori = BUSINESSES.find((b) => b.id === 'cajori')!;

      const { result } = renderHook(() => useBusinessTheme(), {
        wrapper: ({ children }) => (
          <BusinessThemeProvider initialBusinessId="cajori">
            {children}
          </BusinessThemeProvider>
        ),
      });

      expect(result.current.brand).toBe(cajori.primaryColor);
      expect(result.current.brandDark).toBe(cajori.gradientStart);
      expect(result.current.brandLight).toBe(cajori.gradientEnd);
      expect(result.current.accent).toBe(cajori.accentColor);
      expect(result.current.business.id).toBe('cajori');
    });

    it('provides correct colors for business prop', () => {
      const baobab = BUSINESSES.find((b) => b.id === 'baobab')!;

      const { result } = renderHook(() => useBusinessTheme(), {
        wrapper: ({ children }) => (
          <BusinessThemeProvider business={baobab}>
            {children}
          </BusinessThemeProvider>
        ),
      });

      expect(result.current.brand).toBe(baobab.primaryColor);
      expect(result.current.business.id).toBe('baobab');
    });
  });

  describe('useBusinessTheme', () => {
    it('returns brand, gradient, and business', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      expect(result.current.brand).toBeDefined();
      expect(result.current.gradient).toBeDefined();
      expect(result.current.business).toBeDefined();
      expect(result.current.setActiveBusiness).toBeInstanceOf(Function);
      expect(result.current.gradientStyle).toBeDefined();
      expect(result.current.gradientStyle.colors).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
    });

    it('gradient is a readonly tuple of two strings', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      expect(result.current.gradient).toHaveLength(2);
      expect(typeof result.current.gradient[0]).toBe('string');
      expect(typeof result.current.gradient[1]).toBe('string');
    });

    it('gradientFull is a readonly tuple of three strings', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      expect(result.current.gradientFull).toHaveLength(3);
    });
  });

  describe('setActiveBusiness', () => {
    it('switches theme dynamically', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      expect(result.current.business.id).toBe('easyryde');

      act(() => {
        result.current.setActiveBusiness('cajori');
      });

      expect(result.current.business.id).toBe('cajori');
      expect(result.current.brand).toBe('#C1272D');
    });

    it('switches multiple times', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      act(() => {
        result.current.setActiveBusiness('baobab');
      });
      expect(result.current.business.id).toBe('baobab');

      act(() => {
        result.current.setActiveBusiness('glow');
      });
      expect(result.current.business.id).toBe('glow');
      expect(result.current.brand).toBe('#BE4B78');
    });

    it('does not change for nonexistent ID', () => {
      const { result } = renderHook(() => useBusinessTheme(), { wrapper });

      const originalId = result.current.business.id;

      act(() => {
        result.current.setActiveBusiness('nonexistent');
      });

      expect(result.current.business.id).toBe(originalId);
    });
  });

  describe('missing business handling', () => {
    it('falls back to default when initialBusinessId is invalid', () => {
      const { result } = renderHook(() => useBusinessTheme(), {
        wrapper: ({ children }) => (
          <BusinessThemeProvider initialBusinessId="does-not-exist">
            {children}
          </BusinessThemeProvider>
        ),
      });

      expect(result.current.business.id).toBe('easyryde');
      expect(result.current.brand).toBe(COLORS.brand);
    });

    it('falls back to default when both props are omitted', () => {
      const { result } = renderHook(() => useBusinessTheme(), {
        wrapper: ({ children }) => (
          <BusinessThemeProvider>{children}</BusinessThemeProvider>
        ),
      });

      expect(result.current.business.id).toBe('easyryde');
      expect(result.current.business.name).toBe('EasyRyde');
      expect(result.current.business.type).toBe('service');
    });

    it('business prop takes precedence over initialBusinessId', () => {
      const baobab = BUSINESSES.find((b) => b.id === 'baobab')!;

      const { result } = renderHook(() => useBusinessTheme(), {
        wrapper: ({ children }) => (
          <BusinessThemeProvider business={baobab} initialBusinessId="cajori">
            {children}
          </BusinessThemeProvider>
        ),
      });

      expect(result.current.business.id).toBe('baobab');
    });
  });
});
