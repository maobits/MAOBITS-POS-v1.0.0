import { getDb, type Db } from '@/core/database';
import type { Page, Product, ProductImage } from '@/core/types';
import { normalizePage, pageMeta } from '@/shared/pagination';
export interface ProductFilter {
    search?: string;
    categoryId?: string | null;
    includeInactive?: boolean;
}
const select = `SELECT p.*,c.name category_name,(SELECT uri FROM product_images pi WHERE pi.product_id=p.id AND pi.is_featured=1 LIMIT 1) featured_image_uri FROM products p LEFT JOIN categories c ON c.id=p.category_id`;
export const productRepository = {
    async page(filter: ProductFilter = {}, page = 1, pageSize = 12): Promise<Page<Product>> { const db = await getDb(), n = normalizePage(page, pageSize), search = filter.search?.trim() ?? '', q = `%${search}%`; const args: Array<string | null> = [
        search,
        q,
        q,
        q,
        filter.categoryId ?? null,
        filter.categoryId ?? null,
    ]; const where = `WHERE (?='' OR p.name LIKE ? OR p.sku LIKE ? OR COALESCE(p.barcode,'') LIKE ?) AND (? IS NULL OR p.category_id=?) ${filter.includeInactive ? '' : 'AND p.active=1'}`; const count = await db.getFirstAsync<{
        n: number;
    }>(`SELECT COUNT(*) n FROM products p ${where}`, ...args); const items = await db.getAllAsync<Product>(`${select} ${where} ORDER BY p.name COLLATE NOCASE LIMIT ? OFFSET ?`, ...args, n.pageSize, n.offset); return pageMeta(items, count?.n ?? 0, n.page, n.pageSize); },
    async get(id: string, db?: Db) { const d = db ?? await getDb(); return d.getFirstAsync<Product>(`${select} WHERE p.id=?`, id); },
    async byBarcode(barcode: string) { const db = await getDb(); return db.getFirstAsync<Product>(`${select} WHERE p.barcode=? AND p.active=1`, barcode.trim()); },
    async suppliers(id: string) { const db = await getDb(); return db.getAllAsync<{
        supplier_id: string;
        name: string;
        preferred: number;
        last_cost: number | null;
    }>(`SELECT ps.supplier_id,s.name,ps.preferred,ps.last_cost FROM product_suppliers ps JOIN suppliers s ON s.id=ps.supplier_id WHERE ps.product_id=? ORDER BY ps.preferred DESC,s.name`, id); },
    async images(id: string) { const db = await getDb(); return db.getAllAsync<ProductImage>('SELECT * FROM product_images WHERE product_id=? ORDER BY is_featured DESC,sort_order,id', id); },
};

