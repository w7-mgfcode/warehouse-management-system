import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelative,
  getDaysUntilExpiry,
  getExpiryUrgency,
  formatExpiryWarning,
  getExpiryBadgeClass,
} from '@/lib/date';

describe('Hungarian Date Formatting', () => {
  it('formats dates in Hungarian style (yyyy. MM. dd.)', () => {
    const date = new Date('2025-12-28');
    const formatted = formatDate(date);

    // Hungarian format has periods and dots
    expect(formatted).toMatch(/\d{4}\.\s\d{2}\.\s\d{2}\./);
    expect(formatted).toBe('2025. 12. 28.');
  });

  it('formats datetime with time', () => {
    const date = new Date('2025-12-28T14:30:00');
    const formatted = formatDateTime(date);

    // Should include time in HH:mm format
    expect(formatted).toMatch(/\d{4}\.\s\d{2}\.\s\d{2}\.\s\d{2}:\d{2}/);
  });

  it('handles ISO string input for formatDate', () => {
    const isoString = '2025-12-28';
    const formatted = formatDate(isoString);

    expect(formatted).toBe('2025. 12. 28.');
  });

  it('handles ISO string input for formatDateTime', () => {
    const isoString = '2025-12-28T14:30:00';
    const formatted = formatDateTime(isoString);

    expect(formatted).toMatch(/\d{4}\.\s\d{2}\.\s\d{2}\.\s14:30/);
  });
});

describe('Relative Date Formatting', () => {
  it('formats relative time in Hungarian', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const formatted = formatRelative(yesterday);

    // Hungarian relative time should contain Hungarian words
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('Days Until Expiry Calculation', () => {
  it('calculates days until future expiry correctly', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const days = getDaysUntilExpiry(futureDate);

    expect(days).toBe(10);
  });

  it('returns negative days for past expiry', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const days = getDaysUntilExpiry(pastDate);

    expect(days).toBe(-5);
  });

  it('returns 0 for today', () => {
    const today = new Date();

    const days = getDaysUntilExpiry(today);

    expect(days).toBe(0);
  });

  it('handles ISO string input', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const isoString = futureDate.toISOString().split('T')[0];

    const days = getDaysUntilExpiry(isoString);

    expect(days).toBe(7);
  });
});

describe('Expiry Urgency Calculation', () => {
  it('returns "expired" for past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const urgency = getExpiryUrgency(pastDate);

    expect(urgency).toBe('expired');
  });

  it('returns "critical" for < 7 days', () => {
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + 3);

    const urgency = getExpiryUrgency(criticalDate);

    expect(urgency).toBe('critical');
  });

  it('returns "high" for 7-14 days', () => {
    const highDate = new Date();
    highDate.setDate(highDate.getDate() + 10);

    const urgency = getExpiryUrgency(highDate);

    expect(urgency).toBe('high');
  });

  it('returns "medium" for 15-29 days', () => {
    const mediumDate = new Date();
    mediumDate.setDate(mediumDate.getDate() + 20);

    const urgency = getExpiryUrgency(mediumDate);

    expect(urgency).toBe('medium');
  });

  it('returns "low" for 30+ days', () => {
    const lowDate = new Date();
    lowDate.setDate(lowDate.getDate() + 60);

    const urgency = getExpiryUrgency(lowDate);

    expect(urgency).toBe('low');
  });
});

describe('Expiry Warning Messages', () => {
  it('shows LEJÁRT for expired items', () => {
    const warning = formatExpiryWarning(-5);

    expect(warning).toContain('LEJÁRT');
    expect(warning).toContain('5 napja');
  });

  it('shows MA LEJÁR for today', () => {
    const warning = formatExpiryWarning(0);

    expect(warning).toBe('MA LEJÁR!');
  });

  it('shows Holnap lejár for tomorrow', () => {
    const warning = formatExpiryWarning(1);

    expect(warning).toBe('Holnap lejár!');
  });

  it('shows days remaining for future dates', () => {
    const warning = formatExpiryWarning(10);

    expect(warning).toBe('10 nap múlva lejár');
  });
});

describe('Expiry Badge CSS Classes', () => {
  it('returns correct class for expired', () => {
    const className = getExpiryBadgeClass('expired');

    expect(className).toContain('bg-expiry-critical');
    expect(className).toContain('text-white');
  });

  it('returns correct class for critical with animation', () => {
    const className = getExpiryBadgeClass('critical');

    expect(className).toContain('bg-expiry-critical');
    expect(className).toContain('animate-pulse');
  });

  it('returns correct class for high', () => {
    const className = getExpiryBadgeClass('high');

    expect(className).toContain('bg-expiry-high');
  });

  it('returns correct class for medium', () => {
    const className = getExpiryBadgeClass('medium');

    expect(className).toContain('bg-expiry-medium');
    expect(className).toContain('text-black');
  });

  it('returns correct class for low', () => {
    const className = getExpiryBadgeClass('low');

    expect(className).toContain('bg-expiry-low');
  });
});
