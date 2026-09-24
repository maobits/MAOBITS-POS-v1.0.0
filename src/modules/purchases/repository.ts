import { getDb } from '@/core/database';
import type { Page } from '@/core/types';
import { normalizePage, pageMeta } from '@/shared/pagination';

export interface PurchaseSummary {
  id: string;
  number: string;
  total: number;
  created_at: string;
  supplier_id: string;
  supplier_name: string;
  user_name: string;
  payment_total: number;
}

export interface PurchaseItemRow {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface PurchaseDetail extends PurchaseSummary {
  notes: string | null;
  items: PurchaseItemRow[];
  supplier_balance: number;
}

export const purchaseRepository = {
  async page(
    search = '',
    page = 1,
    pageSize = 12,
    supplierId?: string | null,
    from?: string,
    to?: string,
  ): Promise<Page<PurchaseSummary>> {
    const db = await getDb();
    const n = normalizePage(page, pageSize);
    const q = `%${search.trim()}%`;
    const where = `
      WHERE (?='' OR p.number LIKE ? OR s.name LIKE ?)
        AND (? IS NULL OR p.supplier_id=?)
        AND (? IS NULL OR p.created_at>=?)
        AND (? IS NULL OR p.created_at<=?)`;
    const args: Array<string | null> = [
      search.trim(), q, q,
      supplierId ?? null, supplierId ?? null,
      from ?? null, from ?? null,
      to ?? null, to ?? null,
    ];
    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) n
       FROM purchases p
       JOIN suppliers s ON s.id=p.supplier_id
       ${where}`,
      ...args,
    );
    const items = await db.getAllAsync<PurchaseSummary>(
      `SELECT p.id,p.number,p.total,p.created_at,p.supplier_id,
              s.name supplier_name,u.name user_name,
              COALESCE((
                SELECT -SUM(e.impact_minor)
                FROM supplier_account_entries e
                WHERE e.reference_type='PURCHASE_PAYMENT'
                  AND e.reference_id=p.id
              ),0) payment_total
       FROM purchases p
       JOIN suppliers s ON s.id=p.supplier_id
       JOIN users u ON u.id=p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      ...args,
      n.pageSize,
      n.offset,
    );
    return pageMeta(items, count?.n ?? 0, n.page, n.pageSize);
  },

  async detail(id: string) {
    const db = await getDb();
    const row = await db.getFirstAsync<Omit<PurchaseDetail, 'items' | 'supplier_balance'>>(
      `SELECT p.id,p.number,p.total,p.created_at,p.supplier_id,p.notes,
              s.name supplier_name,u.name user_name,
              COALESCE((
                SELECT -SUM(e.impact_minor)
                FROM supplier_account_entries e
                WHERE e.reference_type='PURCHASE_PAYMENT'
                  AND e.reference_id=p.id
              ),0) payment_total
       FROM purchases p
       JOIN suppliers s ON s.id=p.supplier_id
       JOIN users u ON u.id=p.user_id
       WHERE p.id=?`,
      id,
    );
    if (!row) return null;

    const items = await db.getAllAsync<PurchaseItemRow>(
      `SELECT pi.id,pi.product_id,p.name product_name,
              pi.quantity,pi.unit_cost,pi.total
       FROM purchase_items pi
       JOIN products p ON p.id=pi.product_id
       WHERE pi.purchase_id=?
       ORDER BY p.name`,
      id,
    );

    const balance = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(impact_minor),0) balance
       FROM supplier_account_entries
       WHERE supplier_id=?`,
      row.supplier_id,
    );

    return {
      ...row,
      items,
      supplier_balance: balance?.balance ?? 0,
    };
  },
};
