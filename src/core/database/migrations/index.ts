import type { Db } from '../connection';
import { migration001 } from './001_foundation';
import { migration002 } from './002_catalog_inventory';
import { migration003 } from './003_sales_customers_cash';
import { migration004 } from './004_supplier_accounts';
import { migration005 } from './005_catalog_offers';
import { migration006 } from './006_catalog_offer_images';
import { migration007 } from './007_user_avatars';
import { upgradeLegacyV1IfNeeded } from './legacy-v1';

const migrations = [
  { version: 1, name: 'foundation', sql: migration001 },
  { version: 2, name: 'catalog_inventory', sql: migration002 },
  { version: 3, name: 'sales_customers_cash', sql: migration003 },
  { version: 4, name: 'supplier_accounts', sql: migration004 },
  { version: 5, name: 'catalog_offers', sql: migration005 },
  { version: 6, name: 'catalog_offer_images', sql: migration006 },
  { version: 7, name: 'user_avatars', sql: migration007 },
];

export async function runMigrations(db: Db) {
  // Legacy MAOBITS POS builds used the same database filename. Upgrade that
  // physical schema BEFORE reading the modular migration ledger; otherwise
  // CREATE TABLE IF NOT EXISTS preserves incompatible old columns.
  await upgradeLegacyV1IfNeeded(db);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT COALESCE(MAX(version),0) version FROM schema_migrations',
  );
  const current = row?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= current) continue;

    await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
    try {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO schema_migrations(version,name,applied_at) VALUES(?,?,?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
