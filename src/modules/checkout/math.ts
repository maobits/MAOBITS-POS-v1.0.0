import { taxFromBase } from '@/core/money';
export interface LiveCheckoutLine {
    productId: string;
    name: string;
    unitPrice: number;
    taxRateBp: number;
    quantity: number;
}
export interface PersistedCheckoutLine extends LiveCheckoutLine {
    discount: number;
    tax: number;
    total: number;
}
export function allocateCheckout(lines: LiveCheckoutLine[], orderDiscount: number) {
    const gross = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const discount = Math.min(Math.max(0, Math.round(orderDiscount)), gross);
    let remaining = discount;
    const persisted: PersistedCheckoutLine[] = lines.map((l, index) => { const base = l.unitPrice * l.quantity; let d = index === lines.length - 1 ? remaining : Math.min(remaining, Math.round(discount * (gross ? base / gross : 0))); remaining -= d; const taxable = Math.max(0, base - d); const tax = taxFromBase(taxable, l.taxRateBp); return { ...l, discount: d, tax, total: taxable + tax }; });
    const tax = persisted.reduce((s, l) => s + l.tax, 0);
    return { lines: persisted, subtotal: gross, discount, tax, total: gross - discount + tax };
}
export function settleCustomer(total: number, priorBalance: number, requestedCredit: number, payment: number) { const creditAvailable = Math.max(0, -priorBalance); const appliedCredit = Math.min(Math.max(0, requestedCredit), creditAvailable, total); const dueAfterCredit = total - appliedCredit; const paid = Math.min(Math.max(0, payment), dueAfterCredit); const newDebt = dueAfterCredit - paid; const finalBalance = priorBalance + appliedCredit + newDebt; return { creditAvailable, appliedCredit, dueAfterCredit, paid, newDebt, finalBalance }; }

