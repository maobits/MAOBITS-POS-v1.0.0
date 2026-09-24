import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';
import { saleRepository, type SalesFilter } from './repository';
export const salesService = {
    async list(actorId: string, filter: SalesFilter = {}) { await permissionService.require(actorId, 'SALES_VIEW'); return saleRepository.list(filter); },
    async detail(actorId: string, id: string) { await permissionService.require(actorId, 'SALES_VIEW'); return saleRepository.detail(id); },
    async filterOptions(actorId: string) { await permissionService.require(actorId, 'SALES_VIEW'); const db = await getDb(); const users = await db.getAllAsync<{
        id: string;
        name: string;
    }>('SELECT id,name FROM users ORDER BY name COLLATE NOCASE'); const customers = await db.getAllAsync<{
        id: string;
        name: string;
    }>('SELECT id,name FROM customers ORDER BY name COLLATE NOCASE'); return { users, customers }; },
    async void(actorId: string, saleId: string, reason: string) {
        await permissionService.require(actorId, 'SALES_VOID');
        if (!reason.trim())
            throw new AppError('errors.validation');
        return inTransaction(async (db) => {
            const sale = await db.getFirstAsync<{
                id: string;
                status: string;
                customer_id: string | null;
                cash_session_id: string | null;
            }>('SELECT id,status,customer_id,cash_session_id FROM sales WHERE id=?', saleId);
            if (!sale || sale.status !== 'COMPLETED')
                throw new AppError('errors.notFound');
            const items = await db.getAllAsync<{
                product_id: string;
                quantity: number;
            }>('SELECT product_id,quantity FROM sale_items WHERE sale_id=?', saleId);
            for (const item of items) {
                const p = await db.getFirstAsync<{
                    stock: number;
                }>('SELECT stock FROM products WHERE id=?', item.product_id);
                if (!p)
                    continue;
                const after = p.stock + item.quantity;
                await db.runAsync('UPDATE products SET stock=?,updated_at=? WHERE id=?', after, nowIso(), item.product_id);
                await db.runAsync(`INSERT INTO inventory_movements(id,product_id,type,quantity,before_stock,after_stock,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, uid('imv'), item.product_id, 'SALE_REVERSAL', item.quantity, p.stock, after, 'SALE', saleId, reason.trim(), actorId, nowIso());
            }
            const cashPayments = await db.getFirstAsync<{
                amount: number;
            }>(`SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE sale_id=? AND method='CASH'`, saleId);
            if ((cashPayments?.amount ?? 0) > 0) {
                let session = sale.cash_session_id ? await db.getFirstAsync<{
                    id: string;
                    status: string;
                }>('SELECT id,status FROM cash_sessions WHERE id=?', sale.cash_session_id) : null;
                if (!session || session.status !== 'OPEN')
                    session = await db.getFirstAsync<{
                        id: string;
                        status: string;
                    }>('SELECT id,status FROM cash_sessions WHERE status=\'OPEN\' LIMIT 1');
                if (!session)
                    throw new AppError('errors.cashRequired');
                await db.runAsync(`INSERT INTO cash_movements(id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, uid('cmv'), session.id, actorId, 'SALE_REVERSAL', -Math.abs(cashPayments?.amount ?? 0), 'SALE', saleId, reason.trim(), nowIso());
            }
            if (sale.customer_id) {
                const entries = await db.getAllAsync<{
                    impact_minor: number;
                }>('SELECT impact_minor FROM customer_account_entries WHERE reference_type=\'SALE\' AND reference_id=?', saleId);
                for (const e of entries)
                    if (e.impact_minor !== 0)
                        await db.runAsync(`INSERT INTO customer_account_entries(id,customer_id,type,impact_minor,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)`, uid('cae'), sale.customer_id, 'SALE_REVERSAL', -e.impact_minor, 'SALE_REVERSAL', saleId, reason.trim(), actorId, nowIso());
            }
            await db.runAsync(`UPDATE sales SET status='VOID',voided_at=?,voided_by=?,void_reason=? WHERE id=?`, nowIso(), actorId, reason.trim(), saleId);
            return true;
        });
    },
};

