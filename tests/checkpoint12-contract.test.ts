import { describe, expect, it } from 'vitest';

function supplierBalance(previous: number, purchase: number, payment: number) {
  return previous + purchase - payment;
}

function flowPercent(value: number, income: number, expenses: number, withdrawals: number) {
  const total = income + expenses + withdrawals;
  return total ? Math.round((value / total) * 100) : 0;
}

describe('checkpoint 12 accounting contracts', () => {
  it('reconstructs supplier payable and credit balances', () => {
    expect(supplierBalance(10_000, 50_000, 20_000)).toBe(40_000);
    expect(supplierBalance(-20_000, 50_000, 40_000)).toBe(-10_000);
  });

  it('allows supplier overpayment to become credit', () => {
    expect(supplierBalance(0, 50_000, 70_000)).toBe(-20_000);
  });

  it('calculates cash expense and withdrawal percentages against total flow', () => {
    expect(flowPercent(20_000, 70_000, 20_000, 10_000)).toBe(20);
    expect(flowPercent(10_000, 70_000, 20_000, 10_000)).toBe(10);
    expect(flowPercent(0, 0, 0, 0)).toBe(0);
  });
});
