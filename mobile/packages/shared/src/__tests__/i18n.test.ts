import { t, getLocale, setLocale } from '../i18n';

describe('i18n', () => {
  afterEach(() => {
    setLocale('en-US');
  });

  it('returns value for valid key', () => {
    expect(t('common.loading')).toBe('Loading...');
  });

  it('returns key for invalid key', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates parameters', () => {
    expect(t('rider.rideTracking.driverArriving', { eta: '2 min' })).toBe('Driver arriving in 2 min');
  });

  it('interpolates numeric parameters', () => {
    expect(t('rider.food.spice', { level: 3 })).toBe('Spice 3');
  });

  it('returns nested object keys', () => {
    expect(t('app.name')).toBe('EasyRyde');
    expect(t('app.tagline')).toBe('Your ride, your way');
  });

  it('getLocale returns current locale', () => {
    expect(getLocale()).toBe('en-US');
  });

  it('setLocale changes locale', () => {
    setLocale('af-ZA');
    expect(getLocale()).toBe('af-ZA');
  });
});
