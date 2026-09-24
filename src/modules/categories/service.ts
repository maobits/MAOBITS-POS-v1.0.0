import { getDb } from '@/core/database';
import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';
import { categoryRepository } from './repository';
export const categoryService = {
    page: categoryRepository.page, allActive: categoryRepository.allActive,
    async create(actorId: string, input: {
        name: string;
        icon?: string;
    }) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); if (!input.name.trim())
        throw new AppError('errors.validation'); const db = await getDb(), id = uid('cat'), s = nowIso(); await db.runAsync('INSERT INTO categories(id,name,icon,active,created_at,updated_at) VALUES(?,?,?,1,?,?)', id, input.name.trim(), input.icon?.trim() || 'cube-outline', s, s); return id; },
    async update(actorId: string, id: string, input: {
        name: string;
        icon: string;
    }) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); const db = await getDb(); await db.runAsync('UPDATE categories SET name=?,icon=?,updated_at=? WHERE id=?', input.name.trim(), input.icon.trim() || 'cube-outline', nowIso(), id); },
    async setActive(actorId: string, id: string, active: boolean) { await permissionService.require(actorId, 'PRODUCTS_EDIT'); const db = await getDb(); await db.runAsync('UPDATE categories SET active=?,updated_at=? WHERE id=?', active ? 1 : 0, nowIso(), id); },
    async report(actorId: string, id: string) { await permissionService.require(actorId, 'REPORTS_VIEW'); const db = await getDb(); return db.getFirstAsync<{
        products: number;
        units_sold: number;
        revenue: number;
    }>(`SELECT COUNT(DISTINCT p.id) products,COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN si.quantity ELSE 0 END),0) units_sold,COALESCE(SUM(CASE WHEN s.status='COMPLETED' THEN si.total ELSE 0 END),0) revenue FROM products p LEFT JOIN sale_items si ON si.product_id=p.id LEFT JOIN sales s ON s.id=si.sale_id WHERE p.category_id=?`, id); },
};

