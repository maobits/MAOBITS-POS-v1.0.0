import { getDb } from '@/core/database';
import type { SaleDetail, SaleSummary } from '@/core/types';
export interface SalesFilter {
    from?: string;
    to?: string;
    status?: 'COMPLETED' | 'VOID' | null;
    userId?: string | null;
    customerId?: string | null;
    method?: string | null;
    search?: string;
}
export const saleRepository = {
    async list(filter: SalesFilter = {}) { const db = await getDb(), search = filter.search?.trim() ?? '', q = `%${search}%`; return db.getAllAsync<SaleSummary>(`SELECT s.id,s.number,s.total,s.status,s.created_at,u.name user_name,c.name customer_name,(SELECT method FROM payments WHERE sale_id=s.id LIMIT 1) payment_method FROM sales s JOIN users u ON u.id=s.user_id LEFT JOIN customers c ON c.id=s.customer_id WHERE (? IS NULL OR s.created_at>=?) AND (? IS NULL OR s.created_at<=?) AND (? IS NULL OR s.status=?) AND (? IS NULL OR s.user_id=?) AND (? IS NULL OR s.customer_id=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM payments p WHERE p.sale_id=s.id AND p.method=?)) AND (?='' OR s.number LIKE ? OR COALESCE(c.name,'') LIKE ?) ORDER BY s.created_at DESC LIMIT 500`, filter.from ?? null, filter.from ?? null, filter.to ?? null, filter.to ?? null, filter.status ?? null, filter.status ?? null, filter.userId ?? null, filter.userId ?? null, filter.customerId ?? null, filter.customerId ?? null, filter.method ?? null, filter.method ?? null, search, q, q); },
    async detail(id: string): Promise<SaleDetail | null> { const db = await getDb(); const sale = await db.getFirstAsync<Omit<SaleDetail, 'items' | 'payments'>>(`SELECT s.*,u.name user_name,c.name customer_name,(SELECT method FROM payments WHERE sale_id=s.id LIMIT 1) payment_method FROM sales s JOIN users u ON u.id=s.user_id LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=?`, id); if (!sale)
        return null; const items = await db.getAllAsync<SaleDetail['items'][number]>('SELECT * FROM sale_items WHERE sale_id=? ORDER BY rowid', id); const payments = await db.getAllAsync<SaleDetail['payments'][number]>('SELECT * FROM payments WHERE sale_id=? ORDER BY created_at', id); return { ...sale, items, payments }; },
};

