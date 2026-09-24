import { describe, expect, it } from 'vitest';
import { calculateCart, formatMoney, parseMoneyInput, taxFromBase } from '@/core/money';
describe('money', () => { it('parses COP input', () => expect(parseMoneyInput('$8.500')).toBe(8500)); it('formats COP', () => expect(formatMoney(8500, 'COP', 'es')).toContain('8.500')); it('calculates basis-point tax', () => expect(taxFromBase(10000, 1900)).toBe(1900)); it('calculates cart without floats', () => expect(calculateCart([{ unitPrice: 10000, quantity: 2, taxRateBp: 1900 }], 1000).total).toBe(22610)); });

