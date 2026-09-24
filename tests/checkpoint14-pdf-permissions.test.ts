import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PERMISSIONS } from '@/core/permissions/catalog';

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

describe('Checkpoint 14 contracts', () => {
  it('defines a dedicated purchase-history permission', () => {
    expect(PERMISSIONS).toContain('PURCHASES_VIEW');
    expect(PERMISSIONS).toContain('INVENTORY_PURCHASE');
  });

  it('protects purchase history independently from inventory view', () => {
    const inventory = read('app/(tabs)/inventory.tsx');
    const more = read('app/(tabs)/more.tsx');
    const service = read('src/modules/purchases/service.ts');

    expect(inventory).toContain("has('PURCHASES_VIEW')");
    expect(more).toContain(
      "permission: 'PURCHASES_VIEW'",
    );
    expect(service).toContain(
      "permissionService.require(actorId, 'PURCHASES_VIEW')",
    );
  });

  it('uses modern FileSystem sharing with Android content URI fallback', () => {
    const receipt = read('src/core/pdf/receipt.ts');

    expect(receipt).toContain(
      "import { File, Paths } from 'expo-file-system';",
    );
    expect(receipt).toContain('target.contentUri');
    expect(receipt).toContain('Paths.cache');
    expect(receipt).toContain('target.size');
    expect(receipt).toContain('Sharing.shareAsync(target.uri');
  });
});
