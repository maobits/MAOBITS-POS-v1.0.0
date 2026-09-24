import { getDb } from '@/core/database';
import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { roleRepository } from '@/modules/roles/repository';
import { normalizePage, pageMeta } from '@/shared/pagination';
import { uid, nowIso } from '@/shared/id';

export type ManualCashType = 'INCOME' | 'WITHDRAWAL' | 'EXPENSE';

export interface CashSessionSummary {
  id: string;
  user_id: string;
  user_name: string;
  opened_at: string;
  opening_amount: number;
  status: string;
  closed_at: string | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference: number | null;
  notes: string | null;
  movements: {
    id: string;
    type: string;
    amount: number;
    note: string | null;
    created_at: string;
  }[];
}

async function isAdministrator(actorId: string) {
  return roleRepository.hasUserPermission(actorId, 'USERS_MANAGE');
}

export const cashService = {
  async current(actorId: string) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    return db.getFirstAsync<{
      id: string;
      user_id: string;
      opened_at: string;
      opening_amount: number;
      status: string;
    }>(
      `SELECT id,user_id,opened_at,opening_amount,status
       FROM cash_sessions
       WHERE status='OPEN' ${admin ? '' : 'AND user_id=?'}
       LIMIT 1`,
      ...(admin ? [] : [actorId]),
    );
  },

  async open(actorId: string, openingAmount: number) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    if (openingAmount < 0) throw new AppError('errors.validation');
    const db = await getDb();
    const id = uid('csh');
    try {
      await db.runAsync(
        `INSERT INTO cash_sessions(
          id,user_id,opened_at,opening_amount,status
        ) VALUES(?,?,?,?,'OPEN')`,
        id,
        actorId,
        nowIso(),
        Math.round(openingAmount),
      );
      return id;
    } catch {
      throw new AppError('errors.openCashExists');
    }
  },

  async expected(actorId: string, sessionId: string) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const row = await db.getFirstAsync<{ expected: number }>(
      `SELECT cs.opening_amount+COALESCE(SUM(cm.amount),0) expected
       FROM cash_sessions cs
       LEFT JOIN cash_movements cm ON cm.session_id=cs.id
       WHERE cs.id=? ${admin ? '' : 'AND cs.user_id=?'}
       GROUP BY cs.id`,
      sessionId,
      ...(admin ? [] : [actorId]),
    );
    if (!row) throw new AppError('errors.notFound');
    return row.expected ?? 0;
  },

  async addMovement(
    actorId: string,
    sessionId: string,
    type: ManualCashType,
    amount: number,
    note: string,
  ) {
    await permissionService.require(actorId, 'CASH_MOVEMENTS');
    if (amount <= 0) throw new AppError('errors.validation');

    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const session = await db.getFirstAsync<{ user_id: string }>(
      `SELECT user_id FROM cash_sessions WHERE id=?`,
      sessionId,
    );
    if (!session || (!admin && session.user_id !== actorId)) {
      throw new AppError('errors.permission');
    }

    const signed =
      type === 'INCOME' ? Math.abs(amount) : -Math.abs(amount);

    await db.runAsync(
      `INSERT INTO cash_movements(
        id,session_id,user_id,type,amount,
        reference_type,reference_id,note,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?)`,
      uid('cmv'),
      sessionId,
      actorId,
      type,
      signed,
      'MANUAL',
      null,
      note.trim() || null,
      nowIso(),
    );
  },

  async close(
    actorId: string,
    sessionId: string,
    counted: number,
    notes = '',
  ) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const session = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM cash_sessions WHERE id=? AND status=\'OPEN\'',
      sessionId,
    );
    if (!session || (!admin && session.user_id !== actorId)) {
      throw new AppError('errors.permission');
    }

    const expected = await this.expected(actorId, sessionId);
    const difference = Math.round(counted) - expected;

    const result = await db.runAsync(
      `UPDATE cash_sessions
       SET status='CLOSED',closed_at=?,expected_amount=?,
           counted_amount=?,difference=?,notes=?
       WHERE id=? AND status='OPEN'`,
      nowIso(),
      expected,
      Math.round(counted),
      difference,
      notes.trim() || null,
      sessionId,
    );

    if (!result.changes) throw new AppError('errors.notFound');
    return {
      expected,
      counted: Math.round(counted),
      difference,
    };
  },

  async movements(actorId: string, sessionId: string) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const session = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM cash_sessions WHERE id=?',
      sessionId,
    );
    if (!session || (!admin && session.user_id !== actorId)) {
      throw new AppError('errors.permission');
    }

    return db.getAllAsync<{
      id: string;
      type: string;
      amount: number;
      note: string | null;
      created_at: string;
    }>(
      `SELECT id,type,amount,note,created_at
       FROM cash_movements
       WHERE session_id=?
       ORDER BY created_at DESC`,
      sessionId,
    );
  },

  async summary(
    actorId: string,
    sessionId: string,
  ): Promise<CashSessionSummary> {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);

    const session = await db.getFirstAsync<
      Omit<CashSessionSummary, 'movements'>
    >(
      `SELECT cs.id,cs.user_id,u.name user_name,cs.opened_at,
              cs.opening_amount,cs.status,cs.closed_at,
              cs.expected_amount,cs.counted_amount,cs.difference,cs.notes
       FROM cash_sessions cs
       JOIN users u ON u.id=cs.user_id
       WHERE cs.id=? ${admin ? '' : 'AND cs.user_id=?'}`,
      sessionId,
      ...(admin ? [] : [actorId]),
    );

    if (!session) throw new AppError('errors.notFound');

    const movements =
      await db.getAllAsync<CashSessionSummary['movements'][number]>(
        `SELECT id,type,amount,note,created_at
         FROM cash_movements
         WHERE session_id=?
         ORDER BY created_at`,
        sessionId,
      );

    return { ...session, movements };
  },

  async sessionPage(
    actorId: string,
    page = 1,
    pageSize = 10,
    from?: string,
    to?: string,
  ) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const n = normalizePage(page, pageSize);
    const where = `
      WHERE (? IS NULL OR cs.opened_at>=?)
        AND (? IS NULL OR cs.opened_at<=?)
        ${admin ? '' : 'AND cs.user_id=?'}`;
    const args: Array<string | null> = [
      from ?? null,
      from ?? null,
      to ?? null,
      to ?? null,
      ...(admin ? [] : [actorId]),
    ];

    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) n
       FROM cash_sessions cs
       ${where}`,
      ...args,
    );

    const items = await db.getAllAsync<{
      id: string;
      user_id: string;
      user_name: string;
      opened_at: string;
      closed_at: string | null;
      status: string;
      opening_amount: number;
      expected_amount: number | null;
      counted_amount: number | null;
      difference: number | null;
      income: number;
      withdrawals: number;
      expenses: number;
    }>(
      `SELECT cs.id,cs.user_id,u.name user_name,cs.opened_at,cs.closed_at,
              cs.status,cs.opening_amount,cs.expected_amount,
              cs.counted_amount,cs.difference,
              COALESCE(SUM(CASE WHEN cm.type IN ('SALE','CUSTOMER_PAYMENT','INCOME') AND cm.amount>0 THEN cm.amount ELSE 0 END),0) income,
              COALESCE(-SUM(CASE WHEN cm.type='WITHDRAWAL' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) withdrawals,
              COALESCE(-SUM(CASE WHEN cm.type='EXPENSE' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) expenses
       FROM cash_sessions cs
       JOIN users u ON u.id=cs.user_id
       LEFT JOIN cash_movements cm ON cm.session_id=cs.id
       ${where}
       GROUP BY cs.id
       ORDER BY cs.opened_at DESC
       LIMIT ? OFFSET ?`,
      ...args,
      n.pageSize,
      n.offset,
    );

    return pageMeta(
      items,
      count?.n ?? 0,
      n.page,
      n.pageSize,
    );
  },

  async analytics(
    actorId: string,
    from?: string,
    to?: string,
  ) {
    await permissionService.require(actorId, 'CASH_OPEN_CLOSE');
    const db = await getDb();
    const admin = await isAdministrator(actorId);
    const userWhere = admin ? '' : 'AND cs.user_id=?';
    const baseArgs: Array<string | null> = [
      from ?? null,
      from ?? null,
      to ?? null,
      to ?? null,
      ...(admin ? [] : [actorId]),
    ];

    const sessionTotals = await db.getFirstAsync<{
      sessions: number;
      expected: number;
      counted: number;
      difference: number;
    }>(
      `SELECT COUNT(*) sessions,
              COALESCE(SUM(expected_amount),0) expected,
              COALESCE(SUM(counted_amount),0) counted,
              COALESCE(SUM(difference),0) difference
       FROM cash_sessions cs
       WHERE (? IS NULL OR cs.opened_at>=?)
         AND (? IS NULL OR cs.opened_at<=?)
         ${userWhere}`,
      ...baseArgs,
    );

    const movementTotals = await db.getFirstAsync<{
      expenses: number;
      withdrawals: number;
      income: number;
    }>(
      `SELECT
         COALESCE(-SUM(CASE WHEN cm.type='EXPENSE' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) expenses,
         COALESCE(-SUM(CASE WHEN cm.type='WITHDRAWAL' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) withdrawals,
         COALESCE(SUM(CASE WHEN cm.amount>0 THEN cm.amount ELSE 0 END),0) income
       FROM cash_movements cm
       JOIN cash_sessions cs ON cs.id=cm.session_id
       WHERE (? IS NULL OR cs.opened_at>=?)
         AND (? IS NULL OR cs.opened_at<=?)
         ${userWhere}`,
      ...baseArgs,
    );

    const sessionByCashier = await db.getAllAsync<{
      user_id: string;
      user_name: string;
      sessions: number;
      difference: number;
    }>(
      `SELECT cs.user_id,u.name user_name,
              COUNT(*) sessions,
              COALESCE(SUM(cs.difference),0) difference
       FROM cash_sessions cs
       JOIN users u ON u.id=cs.user_id
       WHERE (? IS NULL OR cs.opened_at>=?)
         AND (? IS NULL OR cs.opened_at<=?)
         ${userWhere}
       GROUP BY cs.user_id,u.name`,
      ...baseArgs,
    );

    const movementByCashier = await db.getAllAsync<{
      user_id: string;
      expenses: number;
      withdrawals: number;
      income: number;
    }>(
      `SELECT cs.user_id,
              COALESCE(-SUM(CASE WHEN cm.type='EXPENSE' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) expenses,
              COALESCE(-SUM(CASE WHEN cm.type='WITHDRAWAL' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) withdrawals,
              COALESCE(SUM(CASE WHEN cm.amount>0 THEN cm.amount ELSE 0 END),0) income
       FROM cash_sessions cs
       LEFT JOIN cash_movements cm ON cm.session_id=cs.id
       WHERE (? IS NULL OR cs.opened_at>=?)
         AND (? IS NULL OR cs.opened_at<=?)
         ${userWhere}
       GROUP BY cs.user_id`,
      ...baseArgs,
    );

    const movementMap = new Map(
      movementByCashier.map((row) => [row.user_id, row]),
    );
    const cashiers = sessionByCashier
      .map((row) => ({
        ...row,
        expenses: movementMap.get(row.user_id)?.expenses ?? 0,
        withdrawals: movementMap.get(row.user_id)?.withdrawals ?? 0,
        income: movementMap.get(row.user_id)?.income ?? 0,
      }))
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    return {
      sessions: sessionTotals?.sessions ?? 0,
      expected: sessionTotals?.expected ?? 0,
      counted: sessionTotals?.counted ?? 0,
      difference: sessionTotals?.difference ?? 0,
      expenses: movementTotals?.expenses ?? 0,
      withdrawals: movementTotals?.withdrawals ?? 0,
      income: movementTotals?.income ?? 0,
      cashiers,
      isAdmin: admin,
    };
  },
};
