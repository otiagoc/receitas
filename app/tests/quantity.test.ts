import { describe, it, expect } from 'vitest';
import { formatAmount, toFraction, roundMetric } from '../src/lib/quantity';

describe('quantity', () => {
  it('formats fractions', () => {
    expect(toFraction(0.5)).toBe('½');
    expect(toFraction(1.5)).toBe('1 ½');
    expect(toFraction(0.333)).toBe('⅓');
    expect(toFraction(2)).toBe('2');
    expect(toFraction(0.98)).toBe('1');
  });
  it('rounds metric amounts', () => {
    expect(roundMetric(333.33)).toBe(330);
    expect(roundMetric(66.6)).toBe(65);
    expect(roundMetric(1234)).toBe(1250);
    expect(roundMetric(2.3)).toBe(2.5);
  });
  it('scales and formats amounts', () => {
    expect(formatAmount(200, 'g', 1.5)).toBe('300 g');
    expect(formatAmount(1, 'c. sopa', 1.5)).toBe('1 ½ c. sopa');
    expect(formatAmount(3, null, 0.5)).toBe('1 ½');
    expect(formatAmount(2, 'dentes', 1)).toBe('2 dentes');
    expect(formatAmount(2, 'dente', 2)).toBe('4 dentes');
    expect(formatAmount(1, 'dente', 1)).toBe('1 dente');
    expect(formatAmount(1, 'colher de sopa', 2)).toBe('2 colheres de sopa');
    expect(formatAmount(100, 'ml', 1 / 3)).toBe('33 ml');
    expect(formatAmount(1.5, 'kg', 1)).toBe('1 ½ kg');
  });
  it('leaves q.b. untouched', () => {
    expect(formatAmount(null, null, 2)).toBe('q.b.');
    expect(formatAmount(null, 'q.b.', 2)).toBe('q.b.');
  });
});
