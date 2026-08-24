import { describe, it, expect } from '@jest/globals';
import { COLORS, GRADIENTS } from '../src/colors';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const RGBA_RE = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;

function isValidHex(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('COLORS', () => {
  const hexColorKeys = [
    'ink',
    'ink2',
    'muted',
    'bg',
    'card',
    'line',
    'brand',
    'brandLight',
    'brandDark',
    'brandLightBg',
    'primary',
    'primaryLight',
    'primaryDark',
    'error',
    'errorDark',
    'warning',
    'info',
    'amber',
    'purple',
    'teal',
    'text',
    'textSecondary',
    'textMuted',
    'textDim',
    'textOnDark',
    'surface',
    'surfaceElevated',
    'surfaceLight',
    'surfaceBorder',
    'border',
    'borderLight',
    'white',
    'black',
    'green',
    'greenLight',
    'red',
    'blue',
    'orange',
  ];

  it('all hex color values are valid hex', () => {
    hexColorKeys.forEach((key) => {
      const value = COLORS[key as keyof typeof COLORS];
      if (typeof value === 'string' && !value.startsWith('rgba')) {
        expect(isValidHex(value)).toBe(true);
      }
    });
  });

  it('brand matches primary', () => {
    expect(COLORS.brand).toBe(COLORS.primary);
  });

  it('brandLight matches primaryLight', () => {
    expect(COLORS.brandLight).toBe(COLORS.primaryLight);
  });

  it('brandDark matches primaryDark', () => {
    expect(COLORS.brandDark).toBe(COLORS.primaryDark);
  });

  it('green aliases match brand', () => {
    expect(COLORS.green).toBe(COLORS.brand);
    expect(COLORS.greenLight).toBe(COLORS.brandLight);
  });

  it('textOnDark is white', () => {
    expect(COLORS.textOnDark).toBe('#FFFFFF');
  });
});

describe('GRADIENTS', () => {
  it('primary matches brand colors', () => {
    expect(GRADIENTS.primary[0]).toBe(COLORS.brandDark);
    expect(GRADIENTS.primary[1]).toBe(COLORS.brand);
  });

  it('primaryLight matches brand to brandLight', () => {
    expect(GRADIENTS.primaryLight[0]).toBe(COLORS.brand);
    expect(GRADIENTS.primaryLight[1]).toBe(COLORS.brandLight);
  });

  it('brandFull is a 3-tuple matching brand gradient', () => {
    expect(GRADIENTS.brandFull).toHaveLength(3);
    expect(GRADIENTS.brandFull[0]).toBe(COLORS.brandDark);
    expect(GRADIENTS.brandFull[1]).toBe(COLORS.brand);
    expect(GRADIENTS.brandFull[2]).toBe(COLORS.brandLight);
  });

  it('all gradient values are valid hex or rgba', () => {
    Object.entries(GRADIENTS).forEach(([key, values]) => {
      values.forEach((v, i) => {
        const isValidHexColor = isValidHex(v);
        const isValidRgba = RGBA_RE.test(v);
        expect(isValidHexColor || isValidRgba).toBe(true);
      });
    });
  });
});

describe('WCAG AA contrast', () => {
  it('text on card meets AA (4.5:1)', () => {
    const ratio = contrastRatio(COLORS.text, COLORS.card);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textSecondary on card meets AA (4.5:1)', () => {
    const ratio = contrastRatio(COLORS.textSecondary, COLORS.card);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textOnDark on brandDark meets AA (4.5:1)', () => {
    const ratio = contrastRatio(COLORS.textOnDark, COLORS.brandDark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('textOnDark on black meets AA (4.5:1)', () => {
    const ratio = contrastRatio(COLORS.textOnDark, COLORS.black);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('brand on white meets AA for large text (3:1)', () => {
    const ratio = contrastRatio(COLORS.brand, COLORS.white);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it('error on white meets AA (4.5:1)', () => {
    const ratio = contrastRatio(COLORS.error, COLORS.white);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
