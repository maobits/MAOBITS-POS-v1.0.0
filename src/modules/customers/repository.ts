import { getDb } from '@/core/database';
import type { Customer, Page } from '@/core/types';
import { normalizePage, pageMeta } from '@/shared/pagination';
export const customerRepository = {
    async page(search = '', page = 1, pageSize = 12, includeInactive = false): Promise<Page<Customer>> { const db = await getDb(), n = normalizePage(page, pageSize), q = `%${search.trim()}%`; const where = `WHERE (?='' OR name LIKE ? OR COALESCE(document,'') LIKE ? OR COALESCE(phone,'') LIKE ?) ${includeInactive ? '' : 'AND active=1'}`; const count = await db.getFirstAsync<{
        n: number;
    }>(`SELECT COUNT(*) n FROM customers ${where}`, search.trim(), q, q, q); const items = await db.getAllAsync<Customer>(`SELECT * FROM customers ${where} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`, search.trim(), q, q, q, n.pageSize, n.offset); return pageMeta(items, count?.n ?? 0, n.page, n.pageSize); },
    async get(id: string) { const db = await getDb(); return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id=?', id); },
};

