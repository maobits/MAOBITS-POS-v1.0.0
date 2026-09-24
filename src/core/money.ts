import type { Currency, Locale } from './types';
export function parseMoneyInput(value: string): number {
    const digits = value.replace(/[^0-9-]/g, '');
    if (!digits || digits === '-')
        return 0;
    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}
export function formatMoney(minor: number, currency: Currency = 'COP', locale: Locale = 'es'): string {
    const fractionDigits = currency === 'COP' ? 0 : 2;
    const divisor = currency === 'COP' ? 1 : 100;
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
        style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
    }).format(minor / divisor);
}
export function clampMoney(value: number): number { return Math.max(0, Math.round(value)); }
export function taxFromBase(baseMinor: number, rateBp: number): number { return Math.round(baseMinor * rateBp / 10000); }
export interface CartMathLine {
    unitPrice: number;
    quantity: number;
    discount?: number;
    taxRateBp?: number;
}
export function calculateCart(lines: CartMathLine[], orderDiscount = 0) {
    const gross = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const lineDiscount = lines.reduce((s, l) => s + Math.min(l.unitPrice * l.quantity, Math.max(0, l.discount ?? 0)), 0);
    const available = Math.max(0, gross - lineDiscount);
    const normalizedOrderDiscount = Math.min(available, Math.max(0, orderDiscount));
    const baseAfterDiscount = available - normalizedOrderDiscount;
    let tax = 0;
    if (available > 0) {
        for (const line of lines) {
            const raw = Math.max(0, line.unitPrice * line.quantity - Math.max(0, line.discount ?? 0));
            const allocated = Math.round(normalizedOrderDiscount * (raw / available));
            tax += taxFromBase(Math.max(0, raw - allocated), line.taxRateBp ?? 0);
        }
    }
    return { gross, lineDiscount, orderDiscount: normalizedOrderDiscount, subtotal: baseAfterDiscount, tax, total: baseAfterDiscount + tax };
}

