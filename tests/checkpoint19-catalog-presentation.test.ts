import {
  describe,
  expect,
  it,
} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );
}

describe('Checkpoint 19 catalog presentation', () => {
  it('shows real category icons instead of icon names', () => {
    const builder = read(
      'app/catalog-builder.tsx',
    );

    expect(builder).toContain(
      "import { Ionicons } from '@expo/vector-icons';",
    );
    expect(builder).toContain(
      'name={categoryIcon(',
    );
    expect(builder).not.toContain(
      "{selected ? '✓' : category.icon}",
    );
  });

  it('makes category discount input readable on selected cards', () => {
    const builder = read(
      'app/catalog-builder.tsx',
    );

    expect(builder).toContain(
      "backgroundColor: '#FFFFFF'",
    );
    expect(builder).toContain(
      "color: '#111827'",
    );
    expect(builder).toContain(
      'checkpoint19.categoryDiscountInput',
    );
  });

  it('keeps product-specific discount above category discount', () => {
    const repository = read(
      'src/modules/offers/repository.ts',
    );
    const builder = read(
      'app/catalog-builder.tsx',
    );

    expect(repository).toContain(
      'WHEN opr.product_id IS NOT NULL',
    );
    expect(repository).toContain(
      'THEN opr.discount_bp',
    );
    expect(repository).toContain(
      'ELSE ocr.discount_bp',
    );
    expect(builder).toContain(
      'hasProductOverride',
    );
    expect(builder).toContain(
      'productPriority',
    );
  });

  it('shows before and after prices for every product', () => {
    const builder = read(
      'app/catalog-builder.tsx',
    );
    const catalog = read(
      'src/modules/offers/catalog-print.ts',
    );

    expect(builder).toContain(
      'checkpoint19.priceBefore',
    );
    expect(builder).toContain(
      'checkpoint19.priceAfter',
    );
    expect(catalog).toContain(
      "before: 'Precio antes'",
    );
    expect(catalog).toContain(
      "after: 'Precio después'",
    );
  });

  it('prints one product per A4 page with the business logo', () => {
    const catalog = read(
      'src/modules/offers/catalog-print.ts',
    );

    expect(catalog).toContain(
      'class="product-page"',
    );
    expect(catalog).toContain(
      'page-break-after: always',
    );
    expect(catalog).toContain(
      '${logo}',
    );
    expect(catalog).toContain(
      'width: 210mm',
    );
    expect(catalog).toContain(
      'height: 297mm',
    );
  });

  it('uses translated success messages for demo and purge actions', () => {
    const settings = read(
      'app/settings.tsx',
    );

    expect(settings).toContain(
      'checkpoint19.demoDataLoaded',
    );
    expect(settings).toContain(
      'checkpoint19.operationalDataDeleted',
    );
    expect(settings).not.toContain(
      "Alert.alert('MAOBITS POS', t('common.ok'))",
    );
  });
});
