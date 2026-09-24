import type { Db } from '../connection';
import { migration001 } from './001_foundation';
import { migration002 } from './002_catalog_inventory';
import { migration003 } from './003_sales_customers_cash';
import { PERMISSIONS, type PermissionCode } from '@/core/permissions/catalog';

export const LEGACY_V1_PIN_SALT_MARKER = '__legacy_maobits_pos_v1__';

const LEGACY_TABLES = [
  'cash_movements',
  'inventory_movements',
  'payments',
  'sale_items',
  'sales',
  'cash_sessions',
  'customers',
  'products',
  'categories',
  'users',
  'settings',
] as const;

const LEGACY_ADMIN_ROLE_ID = 'rol_legacy_admin';
const LEGACY_CASHIER_ROLE_ID = 'rol_legacy_cashier';

const CASHIER_PERMISSIONS: PermissionCode[] = [
  'DASHBOARD_VIEW',
  'POS_SELL',
  'PRODUCTS_VIEW',
  'INVENTORY_VIEW',
  'CUSTOMERS_VIEW',
  'CUSTOMERS_EDIT',
  'CASH_OPEN_CLOSE',
  'CASH_MOVEMENTS',
  'SALES_VIEW',
  'SCANNER_USE',
];

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function tableExists(db: Db, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    table,
  );
  return Boolean(row);
}

async function tableColumns(db: Db, table: string): Promise<Set<string>> {
  if (!(await tableExists(db, table))) return new Set();
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${quoteIdentifier(table)})`,
  );
  return new Set(rows.map((row) => row.name));
}

export async function isLegacyV1Database(db: Db): Promise<boolean> {
  const users = await tableColumns(db, 'users');
  if (users.has('role') && !users.has('role_id')) return true;

  const inventory = await tableColumns(db, 'inventory_movements');
  return inventory.size > 0 && !inventory.has('supplier_id');
}

async function dropPartialModularTables(db: Db): Promise<void> {
  // A previous failed migration can leave migration 001 applied while the old
  // business tables remain. These tables did not exist in legacy v1.
  await db.execAsync(`
    DROP TABLE IF EXISTS role_permissions;
    DROP TABLE IF EXISTS permissions;
    DROP TABLE IF EXISTS roles;
    DROP TABLE IF EXISTS supplier_account_entries;
    DROP TABLE IF EXISTS customer_account_entries;
    DROP TABLE IF EXISTS purchase_items;
    DROP TABLE IF EXISTS purchases;
    DROP TABLE IF EXISTS product_images;
    DROP TABLE IF EXISTS product_suppliers;
    DROP TABLE IF EXISTS suppliers;
    DROP TABLE IF EXISTS schema_migrations;
  `);
}

async function renameLegacyTables(db: Db): Promise<void> {
  for (const table of LEGACY_TABLES) {
    if (!(await tableExists(db, table))) continue;
    const legacy = `legacy_v1_${table}`;
    if (await tableExists(db, legacy)) {
      throw new Error(`Legacy migration collision: ${legacy}`);
    }
    await db.execAsync(
      `ALTER TABLE ${quoteIdentifier(table)} RENAME TO ${quoteIdentifier(legacy)};`,
    );
  }
}

async function dropLegacyIndexes(db: Db): Promise<void> {
  // Index names are database-global. Renaming a table preserves its index
  // names; remove known v1 names so the modular schema can recreate them.
  await db.execAsync(`
    DROP INDEX IF EXISTS idx_users_active;
    DROP INDEX IF EXISTS idx_products_name;
    DROP INDEX IF EXISTS idx_products_barcode;
    DROP INDEX IF EXISTS idx_products_category;
    DROP INDEX IF EXISTS idx_customers_name;
    DROP INDEX IF EXISTS idx_cash_sessions_user_status;
    DROP INDEX IF EXISTS idx_one_open_cash_session;
    DROP INDEX IF EXISTS idx_sales_created;
    DROP INDEX IF EXISTS idx_sales_status;
    DROP INDEX IF EXISTS idx_sales_customer;
    DROP INDEX IF EXISTS idx_sale_items_sale;
    DROP INDEX IF EXISTS idx_sale_items_product;
    DROP INDEX IF EXISTS idx_payments_sale;
    DROP INDEX IF EXISTS idx_inventory_product;
    DROP INDEX IF EXISTS idx_inventory_supplier;
    DROP INDEX IF EXISTS idx_cash_movements_session;
    DROP INDEX IF EXISTS idx_customer_account;
  `);
}

async function seedRolesAndPermissions(db: Db, stamp: string): Promise<void> {
  for (const code of PERMISSIONS) {
    await db.runAsync(
      'INSERT INTO permissions(code,area,description) VALUES(?,?,?)',
      code,
      code.split('_')[0] ?? 'SYSTEM',
      code,
    );
  }

  await db.runAsync(
    `INSERT INTO roles(id,name,is_system,active,created_at,updated_at)
     VALUES(?,?,1,1,?,?)`,
    LEGACY_ADMIN_ROLE_ID,
    'Administrador',
    stamp,
    stamp,
  );
  await db.runAsync(
    `INSERT INTO roles(id,name,is_system,active,created_at,updated_at)
     VALUES(?,?,1,1,?,?)`,
    LEGACY_CASHIER_ROLE_ID,
    'Cajero',
    stamp,
    stamp,
  );

  for (const code of PERMISSIONS) {
    await db.runAsync(
      'INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)',
      LEGACY_ADMIN_ROLE_ID,
      code,
    );
  }
  for (const code of CASHIER_PERMISSIONS) {
    await db.runAsync(
      'INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)',
      LEGACY_CASHIER_ROLE_ID,
      code,
    );
  }
}

async function copyLegacyData(db: Db, stamp: string): Promise<void> {
  if (await tableExists(db, 'legacy_v1_settings')) {
    await db.runAsync(
      `INSERT INTO settings(key,value,updated_at)
       SELECT key,value,? FROM legacy_v1_settings`,
      stamp,
    );
  }

  if (await tableExists(db, 'legacy_v1_users')) {
    await db.execAsync(`
      INSERT INTO users(
        id,name,role_id,pin_salt,pin_hash,active,created_at,updated_at
      )
      SELECT
        id,
        name,
        CASE role
          WHEN 'ADMIN' THEN '${LEGACY_ADMIN_ROLE_ID}'
          ELSE '${LEGACY_CASHIER_ROLE_ID}'
        END,
        '${LEGACY_V1_PIN_SALT_MARKER}',
        pin_hash,
        active,
        created_at,
        created_at
      FROM legacy_v1_users;
    `);
  }

  if (await tableExists(db, 'legacy_v1_categories')) {
    await db.execAsync(`
      INSERT INTO categories(id,name,icon,active,created_at,updated_at)
      SELECT id,name,'cube-outline',active,created_at,created_at
      FROM legacy_v1_categories;
    `);
  }

  if (await tableExists(db, 'legacy_v1_products')) {
    await db.execAsync(`
      INSERT INTO products(
        id,sku,barcode,name,description,category_id,purchase_cost,sale_price,
        tax_rate_bp,stock,minimum_stock,unit,active,created_at,updated_at
      )
      SELECT
        id,sku,barcode,name,description,category_id,purchase_cost,sale_price,
        tax_rate_bp,stock,minimum_stock,unit,active,created_at,updated_at
      FROM legacy_v1_products;
    `);
  }

  if (await tableExists(db, 'legacy_v1_customers')) {
    await db.execAsync(`
      INSERT INTO customers(
        id,name,document,phone,email,address,notes,active,created_at,updated_at
      )
      SELECT id,name,document,phone,email,address,notes,1,created_at,created_at
      FROM legacy_v1_customers;
    `);
  }

  if (await tableExists(db, 'legacy_v1_cash_sessions')) {
    await db.execAsync(`
      INSERT INTO cash_sessions(
        id,user_id,opened_at,opening_amount,status,closed_at,
        expected_amount,counted_amount,difference,notes
      )
      SELECT id,user_id,opened_at,opening_amount,status,closed_at,
             expected_amount,counted_amount,difference,notes
      FROM legacy_v1_cash_sessions;
    `);
  }

  if (await tableExists(db, 'legacy_v1_sales')) {
    await db.execAsync(`
      INSERT INTO sales(
        id,number,user_id,customer_id,cash_session_id,subtotal,discount,tax,total,
        applied_credit,paid_total,new_debt,status,created_at,
        voided_at,voided_by,void_reason
      )
      SELECT
        s.id,s.number,s.user_id,s.customer_id,s.cash_session_id,
        s.subtotal,s.discount,s.tax,s.total,
        0,
        COALESCE((SELECT SUM(p.amount) FROM legacy_v1_payments p WHERE p.sale_id=s.id),0),
        0,
        s.status,s.created_at,s.voided_at,s.voided_by,s.void_reason
      FROM legacy_v1_sales s;
    `);
  }

  if (await tableExists(db, 'legacy_v1_sale_items')) {
    await db.execAsync(`
      INSERT INTO sale_items(
        id,sale_id,product_id,product_name,unit_price,quantity,discount,tax,total
      )
      SELECT id,sale_id,product_id,product_name,unit_price,quantity,discount,tax,total
      FROM legacy_v1_sale_items;
    `);
  }

  if (await tableExists(db, 'legacy_v1_payments')) {
    await db.execAsync(`
      INSERT INTO payments(id,sale_id,method,amount,received,change_amount,created_at)
      SELECT id,sale_id,method,amount,received,change_amount,created_at
      FROM legacy_v1_payments;
    `);
  }

  if (await tableExists(db, 'legacy_v1_inventory_movements')) {
    await db.execAsync(`
      INSERT INTO inventory_movements(
        id,product_id,type,quantity,before_stock,after_stock,supplier_id,unit_cost,
        reference_type,reference_id,note,user_id,created_at
      )
      SELECT
        id,product_id,type,quantity,before_stock,after_stock,NULL,NULL,
        reference_type,reference_id,note,
        COALESCE(user_id,(SELECT id FROM users ORDER BY created_at LIMIT 1)),
        created_at
      FROM legacy_v1_inventory_movements;
    `);
  }

  if (await tableExists(db, 'legacy_v1_cash_movements')) {
    await db.execAsync(`
      INSERT INTO cash_movements(
        id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at
      )
      SELECT id,session_id,user_id,type,amount,reference_type,reference_id,note,created_at
      FROM legacy_v1_cash_movements;
    `);
  }

  await db.runAsync(
    `INSERT INTO settings(key,value,updated_at)
     VALUES('app_version','1.0.0',?)
     ON CONFLICT(key) DO UPDATE
       SET value=excluded.value,updated_at=excluded.updated_at`,
    stamp,
  );
}

async function dropLegacyTables(db: Db): Promise<void> {
  for (const table of LEGACY_TABLES) {
    const legacy = `legacy_v1_${table}`;
    if (await tableExists(db, legacy)) {
      await db.execAsync(`DROP TABLE ${quoteIdentifier(legacy)};`);
    }
  }
}

export async function upgradeLegacyV1IfNeeded(db: Db): Promise<boolean> {
  if (!(await isLegacyV1Database(db))) return false;

  const stamp = new Date().toISOString();

  // PRAGMA foreign_keys can only be changed outside an active transaction.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    await dropPartialModularTables(db);
    await renameLegacyTables(db);
    await dropLegacyIndexes(db);

    await db.execAsync(migration001);
    await db.execAsync(migration002);
    await db.execAsync(migration003);

    await seedRolesAndPermissions(db, stamp);
    await copyLegacyData(db, stamp);

    await db.runAsync(
      `INSERT INTO schema_migrations(version,name,applied_at)
       VALUES(1,'foundation',?),(2,'catalog_inventory',?),(3,'sales_customers_cash',?)`,
      stamp,
      stamp,
      stamp,
    );

    await dropLegacyTables(db);

    const fkErrors = await db.getAllAsync<{
      table: string;
      rowid: number;
      parent: string;
      fkid: number;
    }>('PRAGMA foreign_key_check;');

    if (fkErrors.length > 0) {
      throw new Error(
        `Legacy migration failed foreign-key validation: ${JSON.stringify(fkErrors)}`,
      );
    }

    await db.execAsync('PRAGMA user_version = 3;');
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  return true;
}
