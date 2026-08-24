import { formatCurrency, formatDate, formatTime, formatDateTime, truncate, validateEmail, validatePhone, decodePolyline, generateId } from '../utils';

describe('formatCurrency', () => {
  it('formats ZAR by default', () => {
    expect(formatCurrency(145)).toBe('R145.00');
  });

  it('formats with cents', () => {
    expect(formatCurrency(89.5)).toBe('R89.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R0.00');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2025-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2025');
  });
});

describe('formatTime', () => {
  it('formats time string', () => {
    const result = formatTime('2025-01-15T10:30:00Z');
    expect(result).toContain('10');
  });
});

describe('formatDateTime', () => {
  it('combines date and time', () => {
    const result = formatDateTime('2025-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('10');
  });
});

describe('truncate', () => {
  it('returns string as-is if under max length', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with ellipsis', () => {
    expect(truncate('hello world this is long', 10)).toBe('hello w...');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('validateEmail', () => {
  it('validates correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('validates South African number with +', () => {
    expect(validatePhone('+27123456789')).toBe(true);
  });

  it('validates number without +', () => {
    expect(validatePhone('0712345678')).toBe(true);
  });

  it('rejects too short number', () => {
    expect(validatePhone('12345')).toBe(false);
  });

  it('strips spaces before validation', () => {
    expect(validatePhone('+27 12 345 6789')).toBe(true);
  });
});

describe('decodePolyline', () => {
  it('decodes encoded polyline', () => {
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('latitude');
    expect(result[0]).toHaveProperty('longitude');
  });

  it('returns empty array for empty string', () => {
    const result = decodePolyline('');
    expect(result).toEqual([]);
  });

  it('decodes known coordinate pairs', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points[0].latitude).toBeCloseTo(38.5, 1);
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('returns string', () => {
    expect(typeof generateId()).toBe('string');
  });
});
