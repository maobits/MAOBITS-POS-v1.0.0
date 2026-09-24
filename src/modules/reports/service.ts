import { getDb } from '@/core/database';
import { roleRepository } from '@/modules/roles/repository';
import { permissionService } from '@/modules/roles/service';

export interface ReportFilter {
  from?: string;
  to?: string;
}

function range(
  alias: string,
  filter: ReportFilter,
  column = 'created_at',
) {
  const parts: string[] = [];
  const args: string[] = [];
  const field = `${alias}.${column}`;

  if (filter.from) {
    parts.push(`julianday(${field})>=julianday(?)`);
    args.push(filter.from);
  }
  if (filter.to) {
    parts.push(`julianday(${field})<=julianday(?)`);
    args.push(filter.to);
  }

  return {
    sql: parts.length ? ` AND ${parts.join(' AND ')}` : '',
    args,
  };
}

export const reportService = {
  async dashboard(actorId: string) {
    await permissionService.require(actorId, 'DASHBOARD_VIEW');
    const db = await getDb();
    const sales = await db.getFirstAsync<{
      revenue: number;
      count: number;
      avg: number;
    }>(
      `SELECT COALESCE(SUM(total),0) revenue,
              COUNT(*) count,
              COALESCE(AVG(total),0) avg
       FROM sales
       WHERE status='COMPLETED'
         AND date(created_at,'localtime')=date('now','localtime')`,
    );
    const stock = await db.getFirstAsync<{ low: number; out: number }>(
      `SELECT
         SUM(CASE WHEN stock>0 AND stock<=minimum_stock THEN 1 ELSE 0 END) low,
         SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) out
       FROM products
       WHERE active=1`,
    );
    const acc = await db.getFirstAsync<{
      receivable: number;
      credits: number;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN balance>0 THEN balance ELSE 0 END),0) receivable,
         COALESCE(SUM(CASE WHEN balance<0 THEN -balance ELSE 0 END),0) credits
       FROM (
         SELECT customer_id,SUM(impact_minor) balance
         FROM customer_account_entries
         GROUP BY customer_id
       )`,
    );
    const cash = await db.getFirstAsync<{
      id: string;
      opening_amount: number;
    } | null>(
      `SELECT id,opening_amount
       FROM cash_sessions
       WHERE status='OPEN'
       LIMIT 1`,
    );
    return {
      revenue: sales?.revenue ?? 0,
      count: sales?.count ?? 0,
      average: Math.round(sales?.avg ?? 0),
      low: stock?.low ?? 0,
      out: stock?.out ?? 0,
      receivable: acc?.receivable ?? 0,
      credits: acc?.credits ?? 0,
      cashOpen: Boolean(cash),
    };
  },

  async recentSales(actorId: string, limit = 5) {
    await permissionService.require(actorId, 'DASHBOARD_VIEW');
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      number: string;
      total: number;
      created_at: string;
      customer_name: string | null;
      method: string | null;
    }>(
      `SELECT s.id,s.number,s.total,s.created_at,c.name customer_name,
              (
                SELECT p.method
                FROM payments p
                WHERE p.sale_id=s.id
                ORDER BY p.created_at
                LIMIT 1
              ) method
       FROM sales s
       LEFT JOIN customers c ON c.id=s.customer_id
       WHERE s.status='COMPLETED'
       ORDER BY s.created_at DESC
       LIMIT ?`,
      Math.max(1, Math.min(20, limit)),
    );
  },

  async topProducts(actorId: string, limit = 3) {
    await permissionService.require(actorId, 'DASHBOARD_VIEW');
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      name: string;
      units: number;
      revenue: number;
    }>(
      `SELECT p.id,p.name,
              COALESCE(SUM(si.quantity),0) units,
              COALESCE(SUM(si.total),0) revenue
       FROM products p
       LEFT JOIN sale_items si ON si.product_id=p.id
       LEFT JOIN sales s
         ON s.id=si.sale_id AND s.status='COMPLETED'
       GROUP BY p.id,p.name
       ORDER BY units DESC,revenue DESC
       LIMIT ?`,
      Math.max(1, Math.min(20, limit)),
    );
  },

  async salesTrend(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const db = await getDb();
    const r = range('s', filter);
    return db.getAllAsync<{
      day: string;
      total: number;
      count: number;
    }>(
      `SELECT date(s.created_at,'localtime') day,
              SUM(s.total) total,
              COUNT(*) count
       FROM sales s
       WHERE s.status='COMPLETED'${r.sql}
       GROUP BY day
       ORDER BY day`,
      ...r.args,
    );
  },

  async byCategory(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const db = await getDb();
    const r = range('s', filter);
    return db.getAllAsync<{
      name: string;
      total: number;
      units: number;
    }>(
      `SELECT COALESCE(c.name,'Sin categoría') name,
              COALESCE(SUM(si.total),0) total,
              COALESCE(SUM(si.quantity),0) units
       FROM sale_items si
       JOIN sales s ON s.id=si.sale_id
       JOIN products p ON p.id=si.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE s.status='COMPLETED'${r.sql}
       GROUP BY c.id,c.name
       ORDER BY total DESC`,
      ...r.args,
    );
  },

  async paymentMethods(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const db = await getDb();
    const r = range('s', filter);
    return db.getAllAsync<{ method: string; total: number }>(
      `SELECT p.method,SUM(p.amount) total
       FROM payments p
       JOIN sales s ON s.id=p.sale_id
       WHERE s.status='COMPLETED'${r.sql}
       GROUP BY p.method
       ORDER BY total DESC`,
      ...r.args,
    );
  },

  async purchasesBySupplier(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    if (!mayCost) return [];
    const db = await getDb();
    const r = range('p', filter);
    return db.getAllAsync<{
      name: string;
      total: number;
      count: number;
    }>(
      `SELECT s.name,
              COALESCE(SUM(p.total),0) total,
              COUNT(p.id) count
       FROM suppliers s
       LEFT JOIN purchases p
         ON p.supplier_id=s.id${r.sql}
       GROUP BY s.id,s.name
       ORDER BY total DESC`,
      ...r.args,
    );
  },

  async customerAccounts(actorId: string) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      name: string;
      balance: number;
    }>(
      `SELECT c.id,c.name,
              COALESCE(SUM(e.impact_minor),0) balance
       FROM customers c
       LEFT JOIN customer_account_entries e
         ON e.customer_id=c.id
       GROUP BY c.id,c.name
       HAVING balance!=0
       ORDER BY balance DESC`,
    );
  },

  async supplierAccounts(actorId: string) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    if (!mayCost) return [];
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      name: string;
      balance: number;
    }>(
      `SELECT s.id,s.name,
              COALESCE(SUM(e.impact_minor),0) balance
       FROM suppliers s
       LEFT JOIN supplier_account_entries e
         ON e.supplier_id=s.id
       GROUP BY s.id,s.name
       HAVING balance!=0
       ORDER BY balance DESC`,
    );
  },

  async cashSummary(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const db = await getDb();
    const r = range('cs', filter, 'opened_at');

    const sessions = await db.getFirstAsync<{
      sessions: number;
      expected: number;
      counted: number;
      difference: number;
    }>(
      `SELECT COUNT(*) sessions,
              COALESCE(SUM(cs.expected_amount),0) expected,
              COALESCE(SUM(cs.counted_amount),0) counted,
              COALESCE(SUM(cs.difference),0) difference
       FROM cash_sessions cs
       WHERE 1=1${r.sql}`,
      ...r.args,
    );

    const movements = await db.getFirstAsync<{
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
       WHERE 1=1${r.sql}`,
      ...r.args,
    );

    const cashiers = await db.getAllAsync<{
      name: string;
      sessions: number;
      difference: number;
    }>(
      `SELECT u.name,
              COUNT(*) sessions,
              COALESCE(SUM(cs.difference),0) difference
       FROM cash_sessions cs
       JOIN users u ON u.id=cs.user_id
       WHERE 1=1${r.sql}
       GROUP BY cs.user_id,u.name
       ORDER BY ABS(difference) DESC`,
      ...r.args,
    );

    return {
      sessions: sessions?.sessions ?? 0,
      expected: sessions?.expected ?? 0,
      counted: sessions?.counted ?? 0,
      difference: sessions?.difference ?? 0,
      expenses: movements?.expenses ?? 0,
      withdrawals: movements?.withdrawals ?? 0,
      income: movements?.income ?? 0,
      cashiers,
    };
  },
  async purchaseSummary(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    if (!mayCost) return { count: 0, total: 0, suppliers: [] };
    const db = await getDb();
    const r = range('p', filter);
    const totals = await db.getFirstAsync<{
      count: number;
      total: number;
    }>(
      `SELECT COUNT(*) count,
              COALESCE(SUM(p.total),0) total
       FROM purchases p
       WHERE 1=1${r.sql}`,
      ...r.args,
    );

    const suppliers = await this.purchasesBySupplier(actorId, filter);
    return {
      count: totals?.count ?? 0,
      total: totals?.total ?? 0,
      suppliers,
    };
  },

  async offersSummary(
    actorId: string,
    filter: ReportFilter = {},
  ) {
    await permissionService.require(
      actorId,
      'REPORTS_VIEW',
    );

    const db = await getDb();
    const r = range('s', filter);

    const rows = await db.getAllAsync<{
      name: string;
      sales: number;
      discount: number;
      total: number;
    }>(
      `SELECT COALESCE(s.offer_name,'Oferta') name,
              COUNT(*) sales,
              COALESCE(SUM(s.offer_discount),0) discount,
              COALESCE(SUM(s.total),0) total
       FROM sales s
       WHERE s.status='COMPLETED'
         AND s.offer_discount>0${r.sql}
       GROUP BY s.offer_id,s.offer_name
       ORDER BY discount DESC`,
      ...r.args,
    );

    return {
      rows,
      sales: rows.reduce(
        (sum, row) => sum + row.sales,
        0,
      ),
      discount: rows.reduce(
        (sum, row) => sum + row.discount,
        0,
      ),
      total: rows.reduce(
        (sum, row) => sum + row.total,
        0,
      ),
    };
  },

  async generalBalances(actorId: string, filter: ReportFilter = {}) {
    await permissionService.require(actorId, 'REPORTS_VIEW');
    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    const db = await getDb();

    const saleRange = range('s', filter);
    const purchaseRange = range('p', filter);
    const cashRange = range('cs', filter, 'opened_at');

    const products = await db.getFirstAsync<{
      count: number;
      units: number;
      cost_value: number;
      sale_value: number;
    }>(
      `SELECT COUNT(*) count,
              COALESCE(SUM(stock),0) units,
              COALESCE(SUM(stock*purchase_cost),0) cost_value,
              COALESCE(SUM(stock*sale_price),0) sale_value
       FROM products
       WHERE active=1`,
    );

    const categories = await db.getFirstAsync<{
      count: number;
      active_products: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM categories WHERE active=1) count,
         (SELECT COUNT(*) FROM products WHERE active=1) active_products`,
    );

    const suppliers = await db.getFirstAsync<{
      count: number;
      payable: number;
      credit: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM suppliers WHERE active=1) count,
         COALESCE(SUM(CASE WHEN balance>0 THEN balance ELSE 0 END),0) payable,
         COALESCE(SUM(CASE WHEN balance<0 THEN -balance ELSE 0 END),0) credit
       FROM (
         SELECT supplier_id,SUM(impact_minor) balance
         FROM supplier_account_entries
         GROUP BY supplier_id
       )`,
    );

    const sales = await db.getFirstAsync<{
      count: number;
      total: number;
      tax: number;
    }>(
      `SELECT COUNT(*) count,
              COALESCE(SUM(s.total),0) total,
              COALESCE(SUM(s.tax),0) tax
       FROM sales s
       WHERE s.status='COMPLETED'${saleRange.sql}`,
      ...saleRange.args,
    );

    const cashSessions = await db.getFirstAsync<{
      sessions: number;
      difference: number;
    }>(
      `SELECT COUNT(*) sessions,
              COALESCE(SUM(cs.difference),0) difference
       FROM cash_sessions cs
       WHERE 1=1${cashRange.sql}`,
      ...cashRange.args,
    );

    const cashMovements = await db.getFirstAsync<{
      expenses: number;
      withdrawals: number;
    }>(
      `SELECT
         COALESCE(-SUM(CASE WHEN cm.type='EXPENSE' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) expenses,
         COALESCE(-SUM(CASE WHEN cm.type='WITHDRAWAL' AND cm.amount<0 THEN cm.amount ELSE 0 END),0) withdrawals
       FROM cash_movements cm
       JOIN cash_sessions cs ON cs.id=cm.session_id
       WHERE 1=1${cashRange.sql}`,
      ...cashRange.args,
    );

    const cashiers = await db.getFirstAsync<{
      count: number;
      differences: number;
    }>(
      `SELECT COUNT(DISTINCT cs.user_id) count,
              COALESCE(SUM(cs.difference),0) differences
       FROM cash_sessions cs
       WHERE 1=1${cashRange.sql}`,
      ...cashRange.args,
    );

    const purchases = await db.getFirstAsync<{
      count: number;
      total: number;
    }>(
      `SELECT COUNT(*) count,
              COALESCE(SUM(p.total),0) total
       FROM purchases p
       WHERE 1=1${purchaseRange.sql}`,
      ...purchaseRange.args,
    );

    const inventory = await db.getFirstAsync<{
      units: number;
      low: number;
      out: number;
    }>(
      `SELECT COALESCE(SUM(stock),0) units,
              COALESCE(SUM(CASE WHEN stock>0 AND stock<=minimum_stock THEN 1 ELSE 0 END),0) low,
              COALESCE(SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END),0) out
       FROM products
       WHERE active=1`,
    );

    const safeProducts = products ?? {
      count: 0,
      units: 0,
      cost_value: 0,
      sale_value: 0,
    };
    const safeSuppliers = suppliers ?? {
      count: 0,
      payable: 0,
      credit: 0,
    };
    const safePurchases = purchases ?? {
      count: 0,
      total: 0,
    };

    return {
      products: {
        ...safeProducts,
        cost_value: mayCost ? safeProducts.cost_value : 0,
      },
      categories: categories ?? {
        count: 0,
        active_products: 0,
      },
      suppliers: {
        ...safeSuppliers,
        payable: mayCost ? safeSuppliers.payable : 0,
        credit: mayCost ? safeSuppliers.credit : 0,
      },
      sales: sales ?? {
        count: 0,
        total: 0,
        tax: 0,
      },
      cash: {
        sessions: cashSessions?.sessions ?? 0,
        difference: cashSessions?.difference ?? 0,
        expenses: cashMovements?.expenses ?? 0,
        withdrawals: cashMovements?.withdrawals ?? 0,
      },
      cashiers: cashiers ?? {
        count: 0,
        differences: 0,
      },
      taxes: {
        total: sales?.tax ?? 0,
      },
      inventory: inventory ?? {
        units: 0,
        low: 0,
        out: 0,
      },
      purchases: {
        ...safePurchases,
        total: mayCost ? safePurchases.total : 0,
      },
    };
  },
};
