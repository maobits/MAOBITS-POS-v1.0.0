import type { Currency } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { settingsRepository } from './repository';

export interface CashDenominations {
  coins: number[];
  bills: number[];
}

export const DEFAULT_CASH_DENOMINATIONS: Record<
  Currency,
  CashDenominations
> = {
  COP: {
    coins: [50, 100, 200, 500, 1000],
    bills: [2000, 5000, 10000, 20000, 50000, 100000],
  },
  USD: {
    // USD/EUR amounts are stored in cents (minor units).
    coins: [1, 5, 10, 25, 50, 100],
    bills: [100, 200, 500, 1000, 2000, 5000, 10000],
  },
  EUR: {
    coins: [1, 2, 5, 10, 20, 50, 100, 200],
    bills: [500, 1000, 2000, 5000, 10000, 20000, 50000],
  },
};

function settingsKey(currency: Currency) {
  return `cash_denominations_${currency}`;
}

function normalize(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isFinite(value) &&
            Number.isInteger(value) &&
            value > 0,
        ),
    ),
  ).sort((a, b) => a - b);
}

function normalizeConfig(
  value: Partial<CashDenominations> | null | undefined,
  currency: Currency,
): CashDenominations {
  const fallback = DEFAULT_CASH_DENOMINATIONS[currency];
  const coins = normalize(value?.coins);
  const bills = normalize(value?.bills);

  return {
    coins: coins.length ? coins : [...fallback.coins],
    bills: bills.length ? bills : [...fallback.bills],
  };
}

export function parseDenominationAmount(
  input: string,
  currency: Currency,
): number {
  const cleaned = input
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');

  if (!cleaned) return 0;

  if (currency === 'COP') {
    const amount = Number.parseInt(cleaned.replace(/\./g, ''), 10);
    return Number.isFinite(amount) ? Math.max(0, amount) : 0;
  }

  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

export const cashDenominationService = {
  defaults(currency: Currency): CashDenominations {
    const value = DEFAULT_CASH_DENOMINATIONS[currency];
    return {
      coins: [...value.coins],
      bills: [...value.bills],
    };
  },

  async get(currency: Currency): Promise<CashDenominations> {
    const raw = await settingsRepository.get(settingsKey(currency));

    if (!raw) {
      return this.defaults(currency);
    }

    try {
      return normalizeConfig(
        JSON.parse(raw) as Partial<CashDenominations>,
        currency,
      );
    } catch {
      return this.defaults(currency);
    }
  },

  async set(
    actorId: string,
    currency: Currency,
    value: CashDenominations,
  ): Promise<CashDenominations> {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');

    const normalized = normalizeConfig(value, currency);

    await settingsRepository.set(
      settingsKey(currency),
      JSON.stringify(normalized),
    );

    return normalized;
  },

  async reset(
    actorId: string,
    currency: Currency,
  ): Promise<CashDenominations> {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');

    const defaults = this.defaults(currency);

    await settingsRepository.set(
      settingsKey(currency),
      JSON.stringify(defaults),
    );

    return defaults;
  },
};
