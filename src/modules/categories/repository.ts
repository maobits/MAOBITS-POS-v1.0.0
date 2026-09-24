import { getDb } from '@/core/database';
import type { Category, Page } from '@/core/types';
import { normalizePage, pageMeta } from '@/shared/pagination';
export const categoryRepository = {
    async page(search = '', page = 1, pageSize = 12, includeInactive = false): Promise<Page<Category>> { const db = await getDb(); const n = normalizePage(page, pageSize), q = `%${search.trim()}%`; const where = `WHERE (?='' OR name LIKE ?) ${includeInactive ? '' : 'AND active=1'}`; const count = await db.getFirstAsync<{
        n: number;
    }>(`SELECT COUNT(*) n FROM categories ${where}`, search.trim(), q); const items = await db.getAllAsync<Category>(`SELECT * FROM categories ${where} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`, search.trim(), q, n.pageSize, n.offset); return pageMeta(items, count?.n ?? 0, n.page, n.pageSize); },
    async allActive() { const db = await getDb(); return db.getAllAsync<Category>('SELECT * FROM categories WHERE active=1 ORDER BY name COLLATE NOCASE'); },
};

