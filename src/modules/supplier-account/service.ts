import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import type { PaymentMethod } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';

async function openCash() {
  const db = await getDb();
  return db.getFirstAsync<{ id: string }>(
    "SELECT id FROM cash_sessions WHERE status='OPEN' LIMIT 1",
  );
}

export interface SupplierAccountEntry {
  id: string;
  type: 'PURCHASE' | 'PAYMENT' | 'CREDIT' | 'ADJUSTMENT' | 'PURCHASE_REVERSAL';
  impact_minor: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export const supplierAccountService = {
  async balance(actorId: string, supplierId: string) {
    await permissionService.require(actorId, 'SUPPLIERS_VIEW');
    const db = await getDb();
    const row = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(impact_minor),0) balance
       FROM supplier_account_entries
       WHERE supplier_id=?`,
      supplierId,
    );
    return row?.balance ?? 0;
  },

  async entries(actorId: string, supplierId: string) {
    await permissionService.require(actorId, 'SUPPLIERS_VIEW');
    const db = await getDb();
    return db.getAllAsync<SupplierAccountEntry>(
      `SELECT id,type,impact_minor,reference_type,reference_id,note,created_at
       FROM supplier_account_entries
       WHERE supplier_id=?
       ORDER BY created_at DESC
       LIMIT 300`,
      supplierId,
    );
  },

  async payment(
    actorId: string,
    supplierId: string,
    amount: number,
    method: PaymentMethod = 'CASH',
    note = '',
  ) {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    if (amount <= 0) throw new AppError('errors.validation');

    const entryId = uid('sae');
    const stamp = nowIso();

    await inTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO supplier_account_entries(
          id,supplier_id,type,impact_minor,reference_type,reference_id,
          note,user_id,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        entryId,
        supplierId,
        'PAYMENT',
        -Math.abs(amount),
        'SUPPLIER_PAYMENT',
        entryId,
        note.trim() || null,
        actorId,
        stamp,
      );

      if (method === 'CASH') {
        const cash = await openCash();
        if (!cash) throw new AppError('errors.cashRequired');
        await db.runAsync(
          `INSERT INTO cash_movements(
            id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at
          ) VALUES(?,?,?,?,?,?,?,?,?)`,
          uid('cmv'),
          cash.id,
          actorId,
          'EXPENSE',
          -Math.abs(amount),
          'SUPPLIER_PAYMENT',
          entryId,
          note.trim() || null,
          stamp,
        );
      }
    });

    return entryId;
  },

  async addCredit(actorId: string, supplierId: string, amount: number, note = '') {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    if (amount <= 0) throw new AppError('errors.validation');
    const db = await getDb();
    const id = uid('sae');
    await db.runAsync(
      `INSERT INTO supplier_account_entries(
        id,supplier_id,type,impact_minor,reference_type,reference_id,note,user_id,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?)`,
      id,
      supplierId,
      'CREDIT',
      -Math.abs(amount),
      'MANUAL',
      null,
      note.trim() || null,
      actorId,
      nowIso(),
    );
    return id;
  },
};
