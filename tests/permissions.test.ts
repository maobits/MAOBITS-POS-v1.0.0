import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/core/permissions/catalog';
describe('permissions', () => { it('contains 24 independent capabilities', () => expect(PERMISSIONS.length).toBe(24)); it('protects product cost independently', () => expect(PERMISSIONS).toContain('PRODUCT_COST_VIEW')); it('separates supplier view and edit capabilities', () => { expect(PERMISSIONS).toContain('SUPPLIERS_VIEW'); expect(PERMISSIONS).toContain('SUPPLIERS_EDIT'); }); it('has no duplicates', () => expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length)); 
  it('protects purchase history independently', () => {
    expect(PERMISSIONS).toContain('PURCHASES_VIEW');
    expect(PERMISSIONS).toContain('INVENTORY_PURCHASE');
  });


  it('prints promotional catalogs independently', () => {
    expect(PERMISSIONS).toContain('CATALOG_PRINT');
  });

});

