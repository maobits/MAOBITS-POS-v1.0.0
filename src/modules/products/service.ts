import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import { generateEan13, validateEan13 } from '@/core/barcode/ean13';
import { persistLocalMedia, removeLocalMedia } from '@/core/media/files';
import { permissionService } from '@/modules/roles/service';
import { roleRepository } from '@/modules/roles/repository';
import { uid, nowIso } from '@/shared/id';
import { productRepository, type ProductFilter } from './repository';
export interface ProductInput {
    sku: string;
    barcode?: string | null;
    name: string;
    description?: string;
    categoryId?: string | null;
    purchaseCost?: number;
    salePrice: number;
    taxRateBp: number;
    minimumStock: number;
    unit: string;
    initialStock?: number;
    supplierIds: string[];
}
export const productService = {
    page: productRepository.page, get: productRepository.get, byBarcode: productRepository.byBarcode, suppliers: productRepository.suppliers, images: productRepository.images,
    async create(actorId: string, i: ProductInput) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); if (!i.name.trim() || !i.sku.trim() || i.salePrice < 0 || !i.supplierIds.length)
        throw new AppError('errors.validation'); const mayCost = await roleRepository.hasUserPermission(actorId, 'PRODUCT_COST_VIEW'); const initialStock = Math.max(0, i.initialStock ?? 0); const id = uid('prd'), stamp = nowIso(), barcode = i.barcode?.trim() || generateEan13(); if (barcode && /^\d{13}$/.test(barcode) && !validateEan13(barcode))
        throw new AppError('errors.validation'); await inTransaction(async (db) => { await db.runAsync(`INSERT INTO products(id,sku,barcode,name,description,category_id,purchase_cost,sale_price,tax_rate_bp,stock,minimum_stock,unit,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`, id, i.sku.trim(), barcode || null, i.name.trim(), i.description?.trim() || '', i.categoryId ?? null, mayCost ? Math.max(0, i.purchaseCost ?? 0) : 0, Math.max(0, i.salePrice), Math.max(0, i.taxRateBp), initialStock, Math.max(0, i.minimumStock), i.unit.trim() || 'und', stamp, stamp); for (const [index, supplierId] of [...new Set(i.supplierIds)].entries())
        await db.runAsync('INSERT INTO product_suppliers(product_id,supplier_id,preferred,last_cost) VALUES(?,?,?,?)', id, supplierId, index === 0 ? 1 : 0, mayCost ? Math.max(0, i.purchaseCost ?? 0) : null); if (initialStock > 0)
        await db.runAsync(`INSERT INTO inventory_movements(id,product_id,type,quantity,before_stock,after_stock,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, uid('imv'), id, 'INITIAL', initialStock, 0, initialStock, 'PRODUCT', id, 'Initial stock', actorId, stamp); }); return id; },
    async update(actorId: string, id: string, i: Omit<ProductInput, 'initialStock'>) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); if (!i.supplierIds.length)
        throw new AppError('errors.validation'); const mayCost = await roleRepository.hasUserPermission(actorId, 'PRODUCT_COST_VIEW'), current = await productRepository.get(id); if (!current)
        throw new AppError('errors.notFound'); const cost = mayCost ? Math.max(0, i.purchaseCost ?? 0) : current.purchase_cost; await inTransaction(async (db) => { const existingLinks = await db.getAllAsync<{ supplier_id: string; last_cost: number | null }>('SELECT supplier_id,last_cost FROM product_suppliers WHERE product_id=?', id); const costBySupplier = new Map(existingLinks.map((link) => [link.supplier_id, link.last_cost])); await db.runAsync(`UPDATE products SET sku=?,barcode=?,name=?,description=?,category_id=?,purchase_cost=?,sale_price=?,tax_rate_bp=?,minimum_stock=?,unit=?,updated_at=? WHERE id=?`, i.sku.trim(), i.barcode?.trim() || null, i.name.trim(), i.description?.trim() || '', i.categoryId ?? null, cost, Math.max(0, i.salePrice), Math.max(0, i.taxRateBp), Math.max(0, i.minimumStock), i.unit.trim() || 'und', nowIso(), id); await db.runAsync('DELETE FROM product_suppliers WHERE product_id=?', id); for (const [index, supplierId] of [...new Set(i.supplierIds)].entries())
        await db.runAsync('INSERT INTO product_suppliers(product_id,supplier_id,preferred,last_cost) VALUES(?,?,?,?)', id, supplierId, index === 0 ? 1 : 0, mayCost ? cost : (costBySupplier.get(supplierId) ?? null)); }); },
    async setActive(actorId: string, id: string, active: boolean) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); const db = await getDb(); await db.runAsync('UPDATE products SET active=?,updated_at=? WHERE id=?', active ? 1 : 0, nowIso(), id); },
    async addImage(actorId: string, productId: string, sourceUri: string, featured = false) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); const uri = await persistLocalMedia(sourceUri, 'products'), id = uid('pim'), db = await getDb(); try {
        await inTransaction(async (tx) => { if (featured)
            await tx.runAsync('UPDATE product_images SET is_featured=0 WHERE product_id=?', productId); const row = await tx.getFirstAsync<{
            m: number;
        }>('SELECT COALESCE(MAX(sort_order),-1)+1 m FROM product_images WHERE product_id=?', productId); await tx.runAsync('INSERT INTO product_images(id,product_id,uri,is_featured,sort_order,created_at) VALUES(?,?,?,?,?,?)', id, productId, uri, featured ? 1 : 0, row?.m ?? 0, nowIso()); });
        return id;
    }
    catch (e) {
        await removeLocalMedia(uri);
        throw e;
    } },
    async setFeatured(actorId: string, productId: string, imageId: string) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); await inTransaction(async (db) => { await db.runAsync('UPDATE product_images SET is_featured=0 WHERE product_id=?', productId); await db.runAsync('UPDATE product_images SET is_featured=1 WHERE id=? AND product_id=?', imageId, productId); }); },
    async removeImage(actorId: string, imageId: string) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); const db = await getDb(); const image = await db.getFirstAsync<{
        uri: string;
    }>('SELECT uri FROM product_images WHERE id=?', imageId); if (!image)
        return; await db.runAsync('DELETE FROM product_images WHERE id=?', imageId); await removeLocalMedia(image.uri); },
    async miniReport(actorId: string, productId: string) { await permissionService.require(actorId, 'REPORTS_VIEW'); const db = await getDb(); return db.getFirstAsync<{
        units: number;
        revenue: number;
        last_sale: string | null;
    }>(`SELECT COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN si.quantity ELSE 0 END),0) units,COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN si.total ELSE 0 END),0) revenue,MAX(CASE WHEN s.status='COMPLETED' THEN s.created_at END) last_sale FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.product_id=?`, productId); },
};
export type { ProductFilter };

