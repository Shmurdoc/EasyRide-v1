import { describe, it, expect } from '@jest/globals';
import {
  BUSINESSES,
  getBusinessById,
  getBusinessesByType,
  getBusinessGradient,
} from '../src/BusinessIdentity';
import type { BusinessIdentity } from '../src/BusinessIdentity';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function isValidHex(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

describe('BusinessIdentity', () => {
  describe('getBusinessById', () => {
    it('returns correct business with all fields', () => {
      const business = getBusinessById('cajori');

      expect(business).toBeDefined();
      expect(business!.id).toBe('cajori');
      expect(business!.name).toBe('Cajori Restaurant');
      expect(business!.type).toBe('restaurant');
      expect(business!.primaryColor).toBe('#C1272D');
      expect(business!.gradientStart).toBe('#5E0E12');
      expect(business!.gradientEnd).toBe('#C1272D');
      expect(business!.accentColor).toBe('#E5484D');
      expect(business!.logoUrl).toBe('https://easyryde.co.za/logos/cajori.png');
      expect(business!.tagline).toBe('Grill · Seafood · Portuguese');
    });

    it('returns undefined for nonexistent ID', () => {
      expect(getBusinessById('nonexistent')).toBeUndefined();
      expect(getBusinessById('')).toBeUndefined();
      expect(getBusinessById('CAJORI')).toBeUndefined();
    });
  });

  describe('getBusinessesByType', () => {
    it('filters restaurants correctly', () => {
      const restaurants = getBusinessesByType('restaurant');
      expect(restaurants.length).toBe(5);
      restaurants.forEach((b) => expect(b.type).toBe('restaurant'));
      const ids = restaurants.map((b) => b.id);
      expect(ids).toContain('cajori');
      expect(ids).toContain('baobab');
      expect(ids).toContain('mamas');
      expect(ids).toContain('flame');
      expect(ids).toContain('coop');
    });

    it('filters stay correctly', () => {
      const stays = getBusinessesByType('stay');
      expect(stays.length).toBe(4);
      stays.forEach((b) => expect(b.type).toBe('stay'));
    });

    it('filters rental correctly', () => {
      const rentals = getBusinessesByType('rental');
      expect(rentals.length).toBe(4);
      rentals.forEach((b) => expect(b.type).toBe('rental'));
    });

    it('filters trip correctly', () => {
      const trips = getBusinessesByType('trip');
      expect(trips.length).toBe(4);
      trips.forEach((b) => expect(b.type).toBe('trip'));
    });

    it('filters shop correctly', () => {
      const shops = getBusinessesByType('shop');
      expect(shops.length).toBe(1);
      expect(shops[0].id).toBe('mart');
    });

    it('filters bar correctly', () => {
      const bars = getBusinessesByType('bar');
      expect(bars.length).toBe(1);
      expect(bars[0].id).toBe('bushbar');
    });

    it('filters beauty correctly', () => {
      const beauty = getBusinessesByType('beauty');
      expect(beauty.length).toBe(2);
      beauty.forEach((b) => expect(b.type).toBe('beauty'));
    });

    it('filters service correctly', () => {
      const services = getBusinessesByType('service');
      expect(services.length).toBe(2);
      services.forEach((b) => expect(b.type).toBe('service'));
    });
  });

  describe('BUSINESSES array integrity', () => {
    it('contains exactly 23 businesses', () => {
      expect(BUSINESSES.length).toBe(23);
    });

    it('has valid hex colors for every business', () => {
      BUSINESSES.forEach((b) => {
        expect(isValidHex(b.primaryColor)).toBe(true);
        expect(isValidHex(b.gradientStart)).toBe(true);
        expect(isValidHex(b.gradientEnd)).toBe(true);
        expect(isValidHex(b.accentColor)).toBe(true);
      });
    });

    it('has all unique IDs', () => {
      const ids = BUSINESSES.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has logoUrls starting with https://', () => {
      BUSINESSES.forEach((b) => {
        expect(b.logoUrl).toMatch(/^https:\/\/easyryde\.co\.za\/logos\//);
      });
    });

    it('every business has required fields populated', () => {
      BUSINESSES.forEach((b) => {
        expect(b.id).toBeTruthy();
        expect(b.name).toBeTruthy();
        expect(b.type).toBeTruthy();
        expect(b.tagline).toBeTruthy();
      });
    });
  });

  describe('getBusinessGradient', () => {
    it('returns valid CSS linear-gradient format', () => {
      const business = getBusinessById('cajori')!;
      const gradient = getBusinessGradient(business);

      expect(gradient).toBe(
        'linear-gradient(135deg, #5E0E12, #C1272D)',
      );
      expect(gradient).toContain('linear-gradient(135deg,');
      expect(gradient).toContain(business.gradientStart);
      expect(gradient).toContain(business.gradientEnd);
    });

    it('uses the business gradientStart and gradientEnd', () => {
      BUSINESSES.forEach((b) => {
        const gradient = getBusinessGradient(b);
        expect(gradient).toContain(b.gradientStart);
        expect(gradient).toContain(b.gradientEnd);
      });
    });
  });
});
