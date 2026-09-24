import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('Checkpoint 15 UX contracts', () => {
  it('uses native date pickers for custom dates', () => {
    const ui = read('src/shared/ui.tsx');
    const reports = read('app/reports.tsx');
    const purchases = read('app/purchases.tsx');
    const cash = read('app/cash-history.tsx');

    expect(ui).toContain(
      "from '@react-native-community/datetimepicker'",
    );
    expect(ui).toContain('export function DatePickerField');
    expect(reports).toContain('<DatePickerField');
    expect(purchases).toContain('<DatePickerField');
    expect(cash).toContain('<DatePickerField');
  });

  it('includes Today as a real report period', () => {
    const reports = read('app/reports.tsx');
    expect(reports).toContain("'today'");
    expect(reports).toContain("period === 'today'");
    expect(reports).toContain('period_today');
  });

  it('makes product add actions visibly observable', () => {
    const purchase = read('app/purchase-form.tsx');
    expect(purchase).toContain('ToastAndroid.show');
    expect(purchase).toContain('lastAddedProductId');
    expect(purchase).toContain('scrollTo');
    expect(purchase).toContain('linesAnchorY');
  });

  it('uses explicit inventory totals independent from search results', () => {
    const service = read('src/modules/inventory/service.ts');
    const inventory = read('app/(tabs)/inventory.tsx');

    expect(service).toContain('async summary(actorId: string)');
    expect(service).toContain('active_products');
    expect(service).toContain('units_in_stock');
    expect(inventory).toContain('inventoryService.summary');
    expect(inventory).toContain('activeProducts');
    expect(inventory).toContain('unitsInStock');
  });

  it('does not expose PDF sharing buttons', () => {
    const appRoot = path.join(root, 'app');
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.tsx')) files.push(full);
      }
    }

    walk(appRoot);

    const visible = files
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(visible).not.toContain('icon="share-outline"');
    expect(visible).not.toContain("label={t('sales.share')}");
    expect(visible).not.toContain(
      "label={t('premiumExtra.checkpoint11.sharePdf')}",
    );
  });
});
