import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatWeight,
  formatQuantity,
  formatPercentage,
  formatCurrency,
  parseHungarianNumber,
} from '@/lib/number';

describe('Hungarian Number Formatting', () => {
  it('uses comma as decimal separator', () => {
    const formatted = formatNumber(1234.56, 2);

    expect(formatted).toContain(',');
    expect(formatted).toBe('1 234,56');
  });

  it('uses space as thousands separator', () => {
    const formatted = formatNumber(1234567, 2);

    expect(formatted).toContain(' ');
    expect(formatted).toBe('1 234 567,00');
  });

  it('respects decimal places parameter', () => {
    const twoDecimals = formatNumber(123.456, 2);
    const threeDecimals = formatNumber(123.456, 3);

    expect(twoDecimals).toBe('123,46'); // Rounded
    expect(threeDecimals).toBe('123,456');
  });

  it('defaults to 2 decimal places', () => {
    const formatted = formatNumber(123.4);

    expect(formatted).toBe('123,40');
  });

  it('handles zero correctly', () => {
    const formatted = formatNumber(0);

    expect(formatted).toBe('0,00');
  });

  it('handles negative numbers', () => {
    const formatted = formatNumber(-1234.56);

    expect(formatted).toBe('-1 234,56');
  });
});

describe('Weight Formatting', () => {
  it('formats weight with kg suffix', () => {
    const formatted = formatWeight(1234.5);

    expect(formatted).toBe('1 234,50 kg');
  });

  it('handles zero weight', () => {
    const formatted = formatWeight(0);

    expect(formatted).toBe('0,00 kg');
  });

  it('handles decimal weights', () => {
    const formatted = formatWeight(0.25);

    expect(formatted).toBe('0,25 kg');
  });
});

describe('Quantity Formatting', () => {
  it('formats quantity with unit label', () => {
    const formatted = formatQuantity(100, 'db');

    expect(formatted).toBe('100 db');
  });

  it('handles kilogram unit', () => {
    const formatted = formatQuantity(50, 'kg');

    expect(formatted).toBe('50 kg');
  });

  it('handles csomag unit with abbreviation', () => {
    const formatted = formatQuantity(25, 'csomag');

    expect(formatted).toBe('25 cs');
  });

  it('uses raw unit for unknown units', () => {
    const formatted = formatQuantity(10, 'unknown');

    expect(formatted).toBe('10 unknown');
  });

  it('formats with no decimal places', () => {
    const formatted = formatQuantity(123.456, 'db');

    // Should round to integer
    expect(formatted).toBe('123 db');
  });
});

describe('Percentage Formatting', () => {
  it('formats percentage with % symbol', () => {
    const formatted = formatPercentage(0.85);

    expect(formatted).toBe('85,0%');
  });

  it('handles 1 decimal place by default', () => {
    const formatted = formatPercentage(0.8567);

    expect(formatted).toBe('85,7%');
  });

  it('respects custom decimal places', () => {
    const formatted = formatPercentage(0.8567, 2);

    expect(formatted).toBe('85,67%');
  });

  it('handles 100%', () => {
    const formatted = formatPercentage(1.0);

    expect(formatted).toBe('100,0%');
  });

  it('handles 0%', () => {
    const formatted = formatPercentage(0);

    expect(formatted).toBe('0,0%');
  });
});

describe('Currency Formatting', () => {
  it('formats in Hungarian Forint', () => {
    const formatted = formatCurrency(1234567);

    // Hungarian Forint format
    expect(formatted).toContain('Ft');
    expect(formatted).toContain('1 234 567');
  });

  it('uses no decimal places for HUF', () => {
    const formatted = formatCurrency(1234.56);

    // HUF doesn't use decimals
    expect(formatted).not.toContain(',');
  });

  it('handles zero currency', () => {
    const formatted = formatCurrency(0);

    expect(formatted).toContain('0');
    expect(formatted).toContain('Ft');
  });
});

describe('Parse Hungarian Number', () => {
  it('parses Hungarian format to number', () => {
    const parsed = parseHungarianNumber('1 234,56');

    expect(parsed).toBe(1234.56);
  });

  it('handles number without thousands separator', () => {
    const parsed = parseHungarianNumber('123,45');

    expect(parsed).toBe(123.45);
  });

  it('handles integer (no decimal)', () => {
    const parsed = parseHungarianNumber('1 234');

    expect(parsed).toBe(1234);
  });

  it('handles negative numbers', () => {
    const parsed = parseHungarianNumber('-1 234,56');

    expect(parsed).toBe(-1234.56);
  });

  it('handles zero', () => {
    const parsed = parseHungarianNumber('0,00');

    expect(parsed).toBe(0);
  });
});
