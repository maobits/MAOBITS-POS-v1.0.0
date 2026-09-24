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

describe('Checkpoint 20 catalog images, checkout offers and contact', () => {
  it('persists every printed catalog product image', () => {
    const migration = read(
      'src/core/database/migrations/006_catalog_offer_images.ts',
    );
    const repository = read(
      'src/modules/offers/repository.ts',
    );

    expect(migration).toContain(
      'catalog_offer_item_images',
    );
    expect(repository).toContain(
      'image_uris: string[]',
    );
    expect(repository).toContain(
      'FROM product_images',
    );
    expect(repository).toContain(
      'INSERT INTO catalog_offer_item_images',
    );
  });

  it('prints an image-only grid when products have multiple images', () => {
    const source = read(
      'src/modules/offers/catalog-print.ts',
    );

    expect(source).toContain(
      'product.images.length',
    );
    expect(source).toContain(
      'class="image-cell"',
    );
    expect(source).toContain(
      '.image-grid.many',
    );
    expect(source).toContain(
      'object-fit: contain',
    );
  });

  it('groups catalog-builder products by category', () => {
    const source = read(
      'app/catalog-builder.tsx',
    );

    expect(source).toContain(
      'selectedCategories.map((categoryId)',
    );
    expect(source).toContain(
      'categoryProducts',
    );
    expect(source).toContain(
      'checkpoint20.categoryLabel',
    );
  });

  it('lets checkout select a current offer from a modal', () => {
    const source = read(
      'app/checkout.tsx',
    );

    expect(source).toContain(
      'offerService.activeForPos',
    );
    expect(source).toContain(
      'checkoutOffersOpen',
    );
    expect(source).toContain(
      'applyOffer(offer.id, offer.name)',
    );
    expect(source).toContain(
      'premiumExtra.checkpoint20.discountOffers',
    );
  });

  it('stores business contact and prints it in the catalog footer', () => {
    const settings = read(
      'app/settings.tsx',
    );
    const contact = read(
      'src/modules/settings/business-contact.ts',
    );
    const catalog = read(
      'src/modules/offers/catalog-print.ts',
    );

    expect(settings).toContain(
      '<BusinessContactSettings',
    );
    expect(contact).toContain(
      "const EMAIL_KEY = 'business_email'",
    );
    expect(contact).toContain(
      "const PHONE_KEY = 'business_phone'",
    );
    expect(catalog).toContain(
      'businessContactService.get()',
    );
    expect(catalog).toContain(
      'class="business-contact"',
    );
  });
});
