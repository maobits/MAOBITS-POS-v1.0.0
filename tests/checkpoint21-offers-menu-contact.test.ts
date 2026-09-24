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

describe('Checkpoint 21 offers/menu/contact fixes', () => {
  it('moves offers from Settings to More', () => {
    const more = read(
      'app/(tabs)/more.tsx',
    );
    const settings = read(
      'app/settings.tsx',
    );

    expect(more).toContain(
      "route: '/offers'",
    );
    expect(more).toContain(
      "permission: 'CATALOG_PRINT'",
    );
    expect(settings).not.toContain(
      'checkpoint18.settingsOfferTitle',
    );
  });

  it('publishes the catalog snapshot before opening print UI', () => {
    const source = read(
      'src/modules/offers/catalog-print.ts',
    );

    const publish = source.indexOf(
      'offerService.recordPrinted(',
    );
    const print = source.indexOf(
      'Print.printAsync',
    );

    expect(publish).toBeGreaterThan(-1);
    expect(print).toBeGreaterThan(-1);
    expect(publish).toBeLessThan(print);
  });

  it('filters current offers in JS instead of SQLite datetime()', () => {
    const source = read(
      'src/modules/offers/repository.ts',
    );

    expect(source).toContain(
      'function offerDateTime',
    );
    expect(source).toContain(
      'const currentOffers = offers.filter',
    );
    expect(source).not.toContain(
      'AND datetime(valid_from)<=datetime(?)',
    );
    expect(source).toContain(
      'offer.snapshotItems.length > 0',
    );
  });

  it('prints business logo and contact together in the footer', () => {
    const source = read(
      'src/modules/offers/catalog-print.ts',
    );

    expect(source).toContain(
      'class="footer-logo"',
    );
    expect(source).toContain(
      'contact.email',
    );
    expect(source).toContain(
      'contact.phone',
    );
    expect(source).toContain(
      'class="business-contact-details"',
    );
  });

  it('places business contact next to business identity settings', () => {
    const settings = read(
      'app/settings.tsx',
    );

    const businessName = settings.indexOf(
      "label={t('settings.businessName')}",
    );
    const contact = settings.indexOf(
      '<BusinessContactSettings',
    );
    const interfacePrefs = settings.indexOf(
      "title={t('premium.settings.interfacePreferences')}",
    );

    expect(businessName).toBeGreaterThan(-1);
    expect(contact).toBeGreaterThan(businessName);
    expect(interfacePrefs).toBeGreaterThan(contact);
  });
});
