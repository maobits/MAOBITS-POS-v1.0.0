import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import type { CustomerAccountEntryType, PaymentMethod } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';

async function openCash(db: Awaited<ReturnType<typeof getDb>>) {
  return db.getFirstAsync<{ id: string }>(
    "SELECT id FROM cash_sessions WHERE status='OPEN' LIMIT 1",
  );
}

export const customerAccountService = {
  async balance(actorId: string, customerId: string) {
    await permissionService.require(actorId, 'CUSTOMERS_VIEW');
    const db = await getDb();
    const row = await db.getFirstAsync<{ balance: number }>(
      `SELECT COALESCE(SUM(impact_minor),0) balance
       FROM customer_account_entries
       WHERE customer_id=?`,
      customerId,
    );
    return row?.balance ?? 0;
  },

  async entries(actorId: string, customerId: string) {
    await permissionService.require(actorId, 'CUSTOMERS_VIEW');
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      type: CustomerAccountEntryType;
      impact_minor: number;
      note: string | null;
      created_at: string;
    }>(
      `SELECT id,type,impact_minor,note,created_at
       FROM customer_account_entries
       WHERE customer_id=?
       ORDER BY created_at DESC
       LIMIT 300`,
      customerId,
    );
  },

  async entry(actorId: string, entryId: string) {
    await permissionService.require(actorId, 'CUSTOMERS_VIEW');
    const db = await getDb();
    return db.getFirstAsync<{
      id: string;
      customer_id: string;
      type: CustomerAccountEntryType;
      impact_minor: number;
      note: string | null;
      created_at: string;
    }>(
      `SELECT id,customer_id,type,impact_minor,note,created_at
       FROM customer_account_entries
       WHERE id=?`,
      entryId,
    );
  },

  async payment(
    actorId: string,
    customerId: string,
    amount: number,
    method: PaymentMethod,
    note = '',
  ) {
    await permissionService.require(actorId, 'CUSTOMER_CREDIT_MANAGE');
    if (amount <= 0) throw new AppError('errors.validation');

    const id = uid('cae');
    const stamp = nowIso();

    await inTransaction(async (db) => {
      const cash = method === 'CASH' ? await openCash(db) : null;
      if (method === 'CASH' && !cash) {
        throw new AppError('errors.cashRequired');
      }

      await db.runAsync(
        `INSERT INTO customer_account_entries(
          id,customer_id,type,impact_minor,reference_type,reference_id,
          note,user_id,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        id,
        customerId,
        'PAYMENT',
        -Math.abs(amount),
        'CUSTOMER_PAYMENT',
        id,
        note.trim() || null,
        actorId,
        stamp,
      );

      if (cash) {
        await db.runAsync(
          `INSERT INTO cash_movements(
            id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at
          ) VALUES(?,?,?,?,?,?,?,?,?)`,
          uid('cmv'),
          cash.id,
          actorId,
          'CUSTOMER_PAYMENT',
          Math.abs(amount),
          'CUSTOMER_PAYMENT',
          id,
          note.trim() || null,
          stamp,
        );
      }
    });

    return id;
  },

  async addCredit(
    actorId: string,
    customerId: string,
    amount: number,
    note = '',
  ) {
    await permissionService.require(actorId, 'CUSTOMER_CREDIT_MANAGE');
    if (amount <= 0) throw new AppError('errors.validation');

    const db = await getDb();
    const id = uid('cae');
    await db.runAsync(
      `INSERT INTO customer_account_entries(
        id,customer_id,type,impact_minor,reference_type,reference_id,
        note,user_id,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?)`,
      id,
      customerId,
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
