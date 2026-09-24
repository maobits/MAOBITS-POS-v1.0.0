import { describe, expect, it } from 'vitest';
import { allocateCheckout, settleCustomer } from '@/modules/checkout/math';

describe('checkout settlement edge cases', () => {
  it('never applies more credit than is available', () => {
    const result = settleCustomer(50000, -10000, 30000, 40000);
    expect(result.appliedCredit).toBe(10000);
    expect(result.dueAfterCredit).toBe(40000);
    expect(result.finalBalance).toBe(0);
  });

  it('never applies credit above the sale total', () => {
    const result = settleCustomer(5000, -20000, 20000, 0);
    expect(result.appliedCredit).toBe(5000);
    expect(result.dueAfterCredit).toBe(0);
    expect(result.finalBalance).toBe(-15000);
  });

  it('keeps previous debt while adding only new unpaid debt', () => {
    const result = settleCustomer(50000, 10000, 0, 35000);
    expect(result.newDebt).toBe(15000);
    expect(result.finalBalance).toBe(25000);
  });

  it('caps discount at gross value', () => {
    const result = allocateCheckout([
      { productId: 'a', name: 'A', unitPrice: 10000, taxRateBp: 1900, quantity: 1 },
    ], 99999);
    expect(result.discount).toBe(10000);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
