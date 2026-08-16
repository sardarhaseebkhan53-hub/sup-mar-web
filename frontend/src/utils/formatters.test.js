import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatPrice } from './formatters';

describe('marketplace formatters', () => {
  it('formats PKR prices without hard-coded values', () => {
    expect(formatPrice(2450000)).toBe('PKR 2,450,000');
  });

  it('handles unset prices safely', () => {
    expect(formatPrice(null)).toBe('Contact for price');
  });

  it('formats category counts compactly', () => {
    expect(formatCompactNumber(12540)).toMatch(/12[.]5K/i);
  });
});
