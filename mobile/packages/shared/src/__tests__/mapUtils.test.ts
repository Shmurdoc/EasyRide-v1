import { calculateDistance, formatDistance, formatDuration, formatZAR, getGreeting, generateRouteCoords } from '../utils/mapUtils';

describe('calculateDistance', () => {
  it('calculates distance between two points', () => {
    const dist = calculateDistance(-23.94, 31.08, -23.88, 31.08);
    expect(dist).toBeGreaterThan(6);
    expect(dist).toBeLessThan(7);
  });

  it('returns 0 for same point', () => {
    const dist = calculateDistance(-23.94, 31.08, -23.94, 31.08);
    expect(dist).toBe(0);
  });

  it('calculates long distance correctly', () => {
    const dist = calculateDistance(-23.94, 31.08, -33.92, 18.42);
    expect(dist).toBeGreaterThan(1200);
    expect(dist).toBeLessThan(1600);
  });
});

describe('formatDistance', () => {
  it('formats kilometers', () => {
    expect(formatDistance(5.2)).toBe('5.2 km');
  });

  it('formats meters for small distances', () => {
    expect(formatDistance(0.3)).toBe('300m');
  });

  it('handles zero', () => {
    expect(formatDistance(0)).toBe('0m');
  });
});

describe('formatDuration', () => {
  it('formats minutes', () => {
    expect(formatDuration(15)).toBe('15 min');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('rounds minutes', () => {
    expect(formatDuration(45.7)).toBe('46 min');
  });
});

describe('formatZAR', () => {
  it('formats number amount', () => {
    expect(formatZAR(145)).toBe('R145.00');
  });

  it('formats string amount', () => {
    expect(formatZAR('89.50')).toBe('R89.50');
  });

  it('handles zero', () => {
    expect(formatZAR(0)).toBe('R0.00');
  });

  it('handles null/undefined gracefully', () => {
    expect(formatZAR('')).toBe('R0.00');
  });
});

describe('getGreeting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns Good Morning before 12', () => {
    jest.setSystemTime(new Date('2025-06-10T09:00:00'));
    expect(getGreeting()).toBe('Good Morning');
  });

  it('returns Good Afternoon between 12 and 17', () => {
    jest.setSystemTime(new Date('2025-06-10T14:00:00'));
    expect(getGreeting()).toBe('Good Afternoon');
  });

  it('returns Good Evening after 17', () => {
    jest.setSystemTime(new Date('2025-06-10T19:00:00'));
    expect(getGreeting()).toBe('Good Evening');
  });
});

describe('generateRouteCoords', () => {
  it('generates coordinate array between two points', () => {
    const points = generateRouteCoords({ lat: -23.94, lng: 31.08 }, { lat: -23.88, lng: 31.08 });
    expect(points).toHaveLength(21);
    expect(points[0].latitude).toBe(-23.94);
    expect(points[0].longitude).toBe(31.08);
    expect(points[20].latitude).toBe(-23.88);
    expect(points[20].longitude).toBe(31.08);
  });

  it('contains jitter in intermediate points', () => {
    const points = generateRouteCoords({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    const mid = points[10];
    expect(mid.latitude).not.toBe(0.5);
    expect(Math.abs(mid.latitude - 0.5)).toBeLessThan(0.002);
  });
});
