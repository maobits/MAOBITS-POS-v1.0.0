import { getDb } from '@/core/database';
import type { Page, Supplier } from '@/core/types';
import { normalizePage, pageMeta } from '@/shared/pagination';

export const supplierRepository = {
  async page(
    search = '',
    page = 1,
    pageSize = 12,
    includeInactive = false,
  ): Promise<Page<Supplier>> {
    const db = await getDb();
    const n = normalizePage(page, pageSize);
    const q = `%${search.trim()}%`;
    const where = `WHERE (?='' OR name LIKE ? OR COALESCE(document,'') LIKE ? OR COALESCE(phone,'') LIKE ? OR COALESCE(email,'') LIKE ?) ${includeInactive ? '' : 'AND active=1'}`;
    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) n FROM suppliers ${where}`,
      search.trim(),
      q,
      q,
      q,
      q,
    );
    const items = await db.getAllAsync<Supplier>(
      `SELECT * FROM suppliers ${where}
       ORDER BY name COLLATE NOCASE
       LIMIT ? OFFSET ?`,
      search.trim(),
      q,
      q,
      q,
      q,
      n.pageSize,
      n.offset,
    );
    return pageMeta(items, count?.n ?? 0, n.page, n.pageSize);
  },

  async allActive() {
    const db = await getDb();
    return db.getAllAsync<Supplier>(
      'SELECT * FROM suppliers WHERE active=1 ORDER BY name COLLATE NOCASE',
    );
  },

  async get(id: string) {
    const db = await getDb();
    return db.getFirstAsync<Supplier>(
      'SELECT * FROM suppliers WHERE id=?',
      id,
    );
  },

  async history(id: string) {
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      number: string;
      total: number;
      created_at: string;
    }>(
      `SELECT id,number,total,created_at
       FROM purchases
       WHERE supplier_id=?
       ORDER BY created_at DESC
       LIMIT 100`,
      id,
    );
  },
};
