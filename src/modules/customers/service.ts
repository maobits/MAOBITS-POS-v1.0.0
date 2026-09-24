import { getDb } from '@/core/database';
import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';
import { customerRepository } from './repository';
export interface CustomerInput {
    name: string;
    document?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
}
export const customerService = {
    page: customerRepository.page, get: customerRepository.get,
    async create(actorId: string, i: CustomerInput) { await permissionService.require(actorId, 'CUSTOMERS_EDIT'); if (!i.name.trim())
        throw new AppError('errors.validation'); const db = await getDb(), id = uid('cus'), s = nowIso(); await db.runAsync(`INSERT INTO customers(id,name,document,phone,email,address,notes,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)`, id, i.name.trim(), i.document?.trim() || null, i.phone?.trim() || null, i.email?.trim() || null, i.address?.trim() || null, i.notes?.trim() || null, s, s); return id; },
    async update(actorId: string, id: string, i: CustomerInput) { await permissionService.require(actorId, 'CUSTOMERS_EDIT'); const db = await getDb(); await db.runAsync(`UPDATE customers SET name=?,document=?,phone=?,email=?,address=?,notes=?,updated_at=? WHERE id=?`, i.name.trim(), i.document?.trim() || null, i.phone?.trim() || null, i.email?.trim() || null, i.address?.trim() || null, i.notes?.trim() || null, nowIso(), id); },
    async setActive(actorId: string, id: string, active: boolean) { await permissionService.require(actorId, 'CUSTOMERS_EDIT'); const db = await getDb(); await db.runAsync('UPDATE customers SET active=?,updated_at=? WHERE id=?', active ? 1 : 0, nowIso(), id); },
    async stats(actorId: string, id: string) { await permissionService.require(actorId, 'CUSTOMERS_VIEW'); const db = await getDb(); return db.getFirstAsync<{
        total_bought: number;
        purchases: number;
        last_purchase: string | null;
    }>(`SELECT COALESCE(SUM(total),0) total_bought,COUNT(*) purchases,MAX(created_at) last_purchase FROM sales WHERE customer_id=? AND status='COMPLETED'`, id); },
    async history(actorId: string, id: string) { await permissionService.require(actorId, 'CUSTOMERS_VIEW'); const db = await getDb(); return db.getAllAsync<{
        id: string;
        number: string;
        total: number;
        created_at: string;
        status: string;
    }>('SELECT id,number,total,created_at,status FROM sales WHERE customer_id=? ORDER BY created_at DESC LIMIT 100', id); },
};

