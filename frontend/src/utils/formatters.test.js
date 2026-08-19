import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatPrice, setFormatterLocale } from './formatters';

describe('marketplace formatters', () => {
  it('formats PKR prices without hard-coded values', () => {
    expect(formatPrice(2450000)).toBe('Rs. 2,450,000');
  });

  it('handles unset prices safely', () => {
    expect(formatPrice(null)).toBe('Contact for price');
  });

  it('localizes the currency label and its position for Urdu', () => {
    setFormatterLocale('ur');
    expect(formatPrice(2450000)).toBe('2,450,000 روپے');
    expect(formatPrice(null)).toBe('قیمت کے لیے رابطہ کریں');
    setFormatterLocale('en');
    expect(formatPrice(2450000)).toBe('Rs. 2,450,000');
  });

  it('formats category counts compactly', () => {
    expect(formatCompactNumber(12540)).toMatch(/12[.]5K/i);
  });
});
