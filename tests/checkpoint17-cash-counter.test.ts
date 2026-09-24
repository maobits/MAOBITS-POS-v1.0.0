import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_CASH_DENOMINATIONS,
  parseDenominationAmount,
} from '@/modules/settings/cash-denominations';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('Checkpoint 17 cash denomination counter', () => {
  it('provides denominations for every supported currency', () => {
    expect(DEFAULT_CASH_DENOMINATIONS.COP.coins).toContain(1000);
    expect(DEFAULT_CASH_DENOMINATIONS.COP.bills).toContain(100000);
    expect(DEFAULT_CASH_DENOMINATIONS.USD.coins).toContain(25);
    expect(DEFAULT_CASH_DENOMINATIONS.USD.bills).toContain(10000);
    expect(DEFAULT_CASH_DENOMINATIONS.EUR.coins).toContain(200);
    expect(DEFAULT_CASH_DENOMINATIONS.EUR.bills).toContain(50000);
  });

  it('converts user denomination input to app minor units', () => {
    expect(parseDenominationAmount('5000', 'COP')).toBe(5000);
    expect(parseDenominationAmount('1.00', 'USD')).toBe(100);
    expect(parseDenominationAmount('2,50', 'EUR')).toBe(250);
  });

  it('persists currency-specific settings', () => {
    const source = read('src/modules/settings/cash-denominations.ts');
    expect(source).toContain('cash_denominations_${currency}');
    expect(source).toContain(
      "permissionService.require(actorId, 'SETTINGS_MANAGE')",
    );
    expect(source).toContain('settingsRepository.set');
  });

  it('connects the physical counter to counted cash', () => {
    const cash = read('app/cash.tsx');
    expect(cash).toContain('<CashCounterModal');
    expect(cash).toContain('setCounted(total)');
    expect(cash).toContain('calculator-outline');
  });

  it('exposes denomination configuration from Settings', () => {
    const settings = read('app/settings.tsx');
    expect(settings).toContain('<DenominationSettingsModal');
    expect(settings).toContain('denominationsOpen');
  });
});
