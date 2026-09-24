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

describe('Checkpoint 24 POS toolbar and image lightbox', () => {
  it('removes the redundant Apply offer button next to Print catalog', () => {
    const pos = read(
      'app/(tabs)/pos.tsx',
    );

    const printPos = pos.indexOf(
      'premiumExtra.checkpoint18.printCatalog',
    );
    const activeCard = pos.indexOf(
      '{activeOffers.length ? (',
      printPos,
    );

    expect(printPos).toBeGreaterThan(-1);
    expect(activeCard).toBeGreaterThan(printPos);

    const toolbar = pos.slice(
      printPos,
      activeCard,
    );

    expect(toolbar).not.toContain(
      'premiumExtra.checkpoint18.applyOffer',
    );
  });

  it('keeps offers available in Checkout', () => {
    const checkout = read(
      'app/checkout.tsx',
    );

    expect(checkout).toContain(
      'premiumExtra.checkpoint20.discountOffers',
    );
    expect(checkout).toContain(
      'openCheckoutOffers',
    );
  });

  it('makes the product preview image expandable', () => {
    const preview = read(
      'src/modules/products/ui/ProductPreviewModal.tsx',
    );
    const lightbox = read(
      'src/shared/ZoomableImage.tsx',
    );

    expect(preview).toContain(
      "import { ZoomableImage } from '@/shared/ZoomableImage';",
    );
    expect(preview).toContain(
      '<ZoomableImage',
    );

    expect(lightbox).toContain(
      '<Modal',
    );
    expect(lightbox).toContain(
      'setOpen(true)',
    );
    expect(lightbox).toContain(
      'resizeMode="contain"',
    );
    expect(lightbox).toContain(
      'name="close"',
    );
  });
});
