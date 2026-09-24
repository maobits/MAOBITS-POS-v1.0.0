import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import type { InventoryMovementType, PaymentMethod } from '@/core/types';
import { roleRepository } from '@/modules/roles/repository';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';

export interface PurchaseLine {
  productId: string;
  quantity: number;
  unitCost?: number;
}

export const inventoryService = {
  async alertCount(actorId: string) {
    await permissionService.require(actorId, 'INVENTORY_VIEW');
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) count
       FROM products
       WHERE active=1 AND stock<=minimum_stock`,
    );
    return row?.count ?? 0;
  },

  async summary(actorId: string) {
    await permissionService.require(actorId, 'INVENTORY_VIEW');
    const db = await getDb();

    const row = await db.getFirstAsync<{
      active_products: number;
      units_in_stock: number;
      low_stock: number;
      out_of_stock: number;
      inventory_cost: number;
    }>(
      `SELECT
         COUNT(*) active_products,
         COALESCE(SUM(stock),0) units_in_stock,
         COALESCE(SUM(
           CASE
             WHEN stock>0 AND stock<=minimum_stock THEN 1
             ELSE 0
           END
         ),0) low_stock,
         COALESCE(SUM(
           CASE WHEN stock=0 THEN 1 ELSE 0 END
         ),0) out_of_stock,
         COALESCE(SUM(stock*purchase_cost),0) inventory_cost
       FROM products
       WHERE active=1`,
    );

    return {
      activeProducts: row?.active_products ?? 0,
      unitsInStock: row?.units_in_stock ?? 0,
      lowStock: row?.low_stock ?? 0,
      outOfStock: row?.out_of_stock ?? 0,
      inventoryCost: row?.inventory_cost ?? 0,
    };
  },

  async overview(
    actorId: string,
    search = '',
    page = 1,
    pageSize = 12,
  ) {
    await permissionService.require(actorId, 'INVENTORY_VIEW');
    const db = await getDb();

    const normalizedSearch = search.trim();
    const q = `%${normalizedSearch}%`;
    const safePageSize = Math.max(1, Math.min(100, Math.round(pageSize)));
    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) count
       FROM products p
       WHERE p.active=1
         AND (?='' OR p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`,
      normalizedSearch,
      q,
      q,
      q,
    );

    const total = countRow?.count ?? 0;
    const pages = Math.max(1, Math.ceil(total / safePageSize));
    const safePage = Math.max(1, Math.min(Math.round(page), pages));
    const offset = (safePage - 1) * safePageSize;

    const items = await db.getAllAsync<{
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      category_name: string | null;
      stock: number;
      minimum_stock: number;
      purchase_cost: number;
      sale_price: number;
      status: string;
    }>(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.barcode,
         c.name category_name,
         p.stock,
         p.minimum_stock,
         p.purchase_cost,
         p.sale_price,
         CASE
           WHEN p.stock=0 THEN 'OUT'
           WHEN p.stock<=p.minimum_stock THEN 'LOW'
           ELSE 'OK'
         END status
       FROM products p
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.active=1
         AND (?='' OR p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
       ORDER BY c.name COLLATE NOCASE, p.name COLLATE NOCASE
       LIMIT ? OFFSET ?`,
      normalizedSearch,
      q,
      q,
      q,
      safePageSize,
      offset,
    );

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      pages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  },

  async movements(actorId: string, productId?: string) {
    await permissionService.require(actorId, 'INVENTORY_VIEW');
    const db = await getDb();
    return db.getAllAsync<{
      id: string;
      product_id: string;
      product_name: string;
      type: InventoryMovementType;
      quantity: number;
      before_stock: number;
      after_stock: number;
      created_at: string;
      note: string | null;
    }>(
      `SELECT m.id,m.product_id,p.name product_name,m.type,m.quantity,
              m.before_stock,m.after_stock,m.created_at,m.note
       FROM inventory_movements m
       JOIN products p ON p.id=m.product_id
       WHERE (? IS NULL OR m.product_id=?)
       ORDER BY m.created_at DESC
       LIMIT 300`,
      productId ?? null,
      productId ?? null,
    );
  },

  async adjust(
    actorId: string,
    productId: string,
    delta: number,
    note: string,
  ) {
    await permissionService.require(actorId, 'INVENTORY_ADJUST');
    if (!delta) throw new AppError('errors.validation');

    await inTransaction(async (db) => {
      const product = await db.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM products WHERE id=?',
        productId,
      );
      if (!product) throw new AppError('errors.notFound');

      const after = product.stock + delta;
      if (after < 0) throw new AppError('errors.stock');

      const type: InventoryMovementType =
        delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

      await db.runAsync(
        'UPDATE products SET stock=?,updated_at=? WHERE id=?',
        after,
        nowIso(),
        productId,
      );

      await db.runAsync(
        `INSERT INTO inventory_movements(
          id,product_id,type,quantity,before_stock,after_stock,
          reference_type,reference_id,note,user_id,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        uid('imv'),
        productId,
        type,
        delta,
        product.stock,
        after,
        'MANUAL',
        null,
        note.trim() || null,
        actorId,
        nowIso(),
      );
    });
  },

  async purchase(
    actorId: string,
    supplierId: string,
    lines: PurchaseLine[],
    notes = '',
    payment = 0,
    paymentMethod: PaymentMethod = 'CASH',
  ) {
    await permissionService.require(actorId, 'INVENTORY_PURCHASE');
    if (!lines.length || payment < 0) throw new AppError('errors.validation');

    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    const purchaseId = uid('pur');
    const stamp = nowIso();
    const number = `P-${stamp.slice(0, 10).replace(/-/g, '')}-${purchaseId
      .slice(-6)
      .toUpperCase()}`;
    let total = 0;

    await inTransaction(async (db) => {
      const prepared: {
        productId: string;
        quantity: number;
        unitCost: number;
        stock: number;
      }[] = [];

      for (const line of lines) {
        const product = await db.getFirstAsync<{
          stock: number;
          purchase_cost: number;
        }>(
          'SELECT stock,purchase_cost FROM products WHERE id=? AND active=1',
          line.productId,
        );

        if (!product || line.quantity <= 0) {
          throw new AppError('errors.validation');
        }

        const unitCost = mayCost
          ? Math.max(0, line.unitCost ?? product.purchase_cost)
          : product.purchase_cost;

        prepared.push({
          productId: line.productId,
          quantity: Math.round(line.quantity),
          unitCost,
          stock: product.stock,
        });
        total += unitCost * Math.round(line.quantity);
      }

      if (payment > total) {
        // Overpayments are allowed: the extra becomes supplier credit.
      }

      await db.runAsync(
        `INSERT INTO purchases(
          id,supplier_id,user_id,number,total,notes,created_at
        ) VALUES(?,?,?,?,?,?,?)`,
        purchaseId,
        supplierId,
        actorId,
        number,
        total,
        notes.trim() || null,
        stamp,
      );

      for (const line of prepared) {
        const itemId = uid('pit');
        const after = line.stock + line.quantity;

        await db.runAsync(
          `INSERT INTO purchase_items(
            id,purchase_id,product_id,quantity,unit_cost,total
          ) VALUES(?,?,?,?,?,?)`,
          itemId,
          purchaseId,
          line.productId,
          line.quantity,
          line.unitCost,
          line.unitCost * line.quantity,
        );

        await db.runAsync(
          'UPDATE products SET stock=?,purchase_cost=?,updated_at=? WHERE id=?',
          after,
          line.unitCost,
          stamp,
          line.productId,
        );

        await db.runAsync(
          `INSERT OR IGNORE INTO product_suppliers(
            product_id,supplier_id,preferred,last_cost
          ) VALUES(?,?,0,?)`,
          line.productId,
          supplierId,
          mayCost ? line.unitCost : null,
        );

        if (mayCost) {
          await db.runAsync(
            `UPDATE product_suppliers
             SET last_cost=?
             WHERE product_id=? AND supplier_id=?`,
            line.unitCost,
            line.productId,
            supplierId,
          );
        }

        await db.runAsync(
          `INSERT INTO inventory_movements(
            id,product_id,type,quantity,before_stock,after_stock,
            supplier_id,unit_cost,reference_type,reference_id,note,user_id,created_at
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          uid('imv'),
          line.productId,
          'PURCHASE',
          line.quantity,
          line.stock,
          after,
          supplierId,
          line.unitCost,
          'PURCHASE',
          purchaseId,
          notes.trim() || null,
          actorId,
          stamp,
        );
      }

      await db.runAsync(
        `INSERT INTO supplier_account_entries(
          id,supplier_id,type,impact_minor,reference_type,reference_id,
          note,user_id,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        uid('sae'),
        supplierId,
        'PURCHASE',
        total,
        'PURCHASE',
        purchaseId,
        notes.trim() || null,
        actorId,
        stamp,
      );

      const paid = Math.max(0, Math.round(payment));
      if (paid > 0) {
        const paymentEntryId = uid('sae');
        await db.runAsync(
          `INSERT INTO supplier_account_entries(
            id,supplier_id,type,impact_minor,reference_type,reference_id,
            note,user_id,created_at
          ) VALUES(?,?,?,?,?,?,?,?,?)`,
          paymentEntryId,
          supplierId,
          'PAYMENT',
          -paid,
          'PURCHASE_PAYMENT',
          purchaseId,
          `${paymentMethod}${notes.trim() ? ` · ${notes.trim()}` : ''}`,
          actorId,
          stamp,
        );

        if (paymentMethod === 'CASH') {
          const cash = await db.getFirstAsync<{ id: string }>(
            "SELECT id FROM cash_sessions WHERE status='OPEN' LIMIT 1",
          );
          if (!cash) throw new AppError('errors.cashRequired');
          await db.runAsync(
            `INSERT INTO cash_movements(
              id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?)`,
            uid('cmv'),
            cash.id,
            actorId,
            'EXPENSE',
            -paid,
            'PURCHASE_PAYMENT',
            purchaseId,
            notes.trim() || null,
            stamp,
          );
        }
      }
    });

    return {
      purchaseId,
      number,
      total,
      payment: Math.max(0, Math.round(payment)),
    };
  },
};
