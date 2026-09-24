import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { cashMovementLabel } from '@/modules/cash/labels';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('Checkpoint 13 regressions', () => {
  it('shares the generated PDF URI directly', () => {
    const source = read('src/core/pdf/receipt.ts');
    expect(source).toContain('Sharing.shareAsync(rendered.uri');
    expect(source).not.toContain('FileSystem.copyAsync');
    expect(source).not.toContain('FileSystem.cacheDirectory');
  });

  it('uses opened_at for filtered cash sessions', () => {
    const source = read('src/modules/reports/service.ts');
    expect(source).toContain("range('cs', filter, 'opened_at')");
    expect(source).not.toContain("range('cs', filter);");
    expect(source).toContain('julianday(${field})>=julianday(?)');
    expect(source).toContain('julianday(${field})<=julianday(?)');
  });

  it('localizes internal cash movement codes', () => {
    expect(cashMovementLabel('SALE', 'es')).toBe('Venta');
    expect(cashMovementLabel('EXPENSE', 'es')).toBe('Gasto');
    expect(cashMovementLabel('SALE', 'en')).toBe('Sale');
    expect(cashMovementLabel('EXPENSE', 'en')).toBe('Expense');
    expect(cashMovementLabel('CUSTOMER_PAYMENT', 'es')).toBe(
      'Abono de cliente',
    );
  });

  it('keeps the credits services image viewport bounded', () => {
    const source = read('app/settings.tsx');
    expect(source).toContain('useWindowDimensions');
    expect(source).toContain('servicesImageHeight');
    expect(source).toContain('windowHeight * 0.58');
  });

  it('uses complete local-day report ranges', () => {
    const source = read('app/reports.tsx');
    expect(source).toContain('to.setHours(23, 59, 59, 999)');
    expect(source).toContain('from.setHours(0, 0, 0, 0)');
    expect(source).toContain('from.getDate() - 6');
    expect(source).toContain('from.getDate() - 29');
    expect(source).toContain('from.getDate() - 89');
  });
});
