import type { Locale } from '@/core/types';

const LABELS: Record<Locale, Record<string, string>> = {
  es: {
    SALE: 'Venta',
    SALE_REVERSAL: 'Reverso de venta',
    CUSTOMER_PAYMENT: 'Abono de cliente',
    INCOME: 'Ingreso',
    WITHDRAWAL: 'Retiro',
    EXPENSE: 'Gasto',
  },
  en: {
    SALE: 'Sale',
    SALE_REVERSAL: 'Sale reversal',
    CUSTOMER_PAYMENT: 'Customer payment',
    INCOME: 'Income',
    WITHDRAWAL: 'Withdrawal',
    EXPENSE: 'Expense',
  },
};

export function cashMovementLabel(
  type: string,
  locale: Locale,
): string {
  return LABELS[locale]?.[type] ?? type;
}
