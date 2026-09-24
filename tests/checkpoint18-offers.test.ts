import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PERMISSIONS } from '@/core/permissions/catalog';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );
}

describe('Checkpoint 18 promotional catalogs and offers', () => {
  it('adds catalog printing permission', () => {
    expect(PERMISSIONS).toContain('CATALOG_PRINT');
  });

  it('persists catalog rules and printed snapshots', () => {
    const migration = read(
      'src/core/database/migrations/005_catalog_offers.ts',
    );
    expect(migration).toContain('catalog_offers');
    expect(migration).toContain('catalog_offer_categories');
    expect(migration).toContain('catalog_offer_products');
    expect(migration).toContain('catalog_offer_items');
    expect(migration).toContain(
      'ALTER TABLE sales ADD COLUMN offer_discount',
    );
  });

  it('revalidates an applied offer during checkout', () => {
    const checkout = read(
      'src/modules/checkout/service.ts',
    );
    expect(checkout).toContain('offerId?: string | null');
    expect(checkout).toContain('offer_discount');
    expect(checkout).toContain('catalog_offer_items');
  });

  it('stores applied offer in cart state', () => {
    const cart = read('src/stores/cart.ts');
    expect(cart).toContain('appliedOfferId');
    expect(cart).toContain('applyOffer');
    expect(cart).toContain('clearOffer');
  });

  it('provides POS offer application and catalog printing', () => {
    const pos = read('app/(tabs)/pos.tsx');
    expect(pos).toContain('offerService.activeForPos');
    expect(pos).toContain('applyOffer');
    expect(pos).toContain('/catalog-builder');
    expect(pos).toContain('offersOpen');
  });

  it('reports promotional discounts applied to sales', () => {
    const service = read(
      'src/modules/reports/service.ts',
    );
    const screen = read('app/reports.tsx');
    expect(service).toContain('async offersSummary');
    expect(service).toContain('SUM(s.offer_discount)');
    expect(screen).toContain('offersSummary');
    expect(screen).toContain('offerAnalytics');
  });
});
